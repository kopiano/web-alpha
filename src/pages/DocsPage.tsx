import { useState, useRef, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { toast } from "sonner";

import { useArticles, CATEGORIES, TAG_COLORS, TAG_ICONS, CAT_COLORS } from "@/hooks/useArticles";
import type { Article } from "@/hooks/useArticles";
import { useTimeline } from "@/hooks/useTimeline";
import type { Comment } from "@/components/doc/docsData";
import { fetchComments } from "@/api/comment";
import { renderMarkdown } from "@/components/doc/DocRenderer";
import { DocsSidebar } from "@/components/doc/DocsSidebar";
import { DocGrid } from "@/components/doc/DocGrid";
import { ArticleView } from "@/components/doc/ArticleView";
import { TimelineTab } from "@/components/doc/TimelineTab";
import { ProfileTab } from "@/components/doc/ProfileTab";
import FaqTab from "@/components/doc/FaqTab";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { resolveAvatar, resolveImageAvatar } from "@/lib/avatar";
import { fetchDocDetail } from "@/api/doc";
import { getUsers } from "@/api/user";

const NewDocEditor = lazy(() => import("@/components/doc/NewDocEditor").then((mod) => ({ default: mod.NewDocEditor })));

const normalizeDocPath = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/docs/")) return raw;
  if (raw.startsWith("docs/")) return `/${raw}`;
  if (raw.startsWith("/src/")) return raw.replace(/^\/src\//, "/");
  if (raw.startsWith("src/")) return `/${raw}`;
  return raw;
};

const getVisibilityFilterKey = (userId: number | null) => `docs_visibility_filter:${userId ?? "guest"}`;
const getActiveCatKey = (userId: number | null) => `docs_active_cat:${userId ?? "guest"}`;
const getActiveTabKey = (userId: number | null) => `docs_active_tab:${userId ?? "guest"}`;

/* ─── Main ─── */
export default function DocsPage() {
  const { articles, loading, refresh, upsertArticle, removeArticle } = useArticles();
  const { timelineGroups, availableYears, loading: timelineLoading, refresh: refreshTimeline } = useTimeline({ articles, loading, refresh });
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(getActiveCatKey(null));
      const value = Number(stored);
      if (Number.isInteger(value) && value >= 0) return value;
    } catch {
      // ignore storage failures
    }
    return 0;
  });
  const [activeTab, setActiveTab] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(getActiveTabKey(null));
      const value = Number(stored);
      if (Number.isInteger(value) && value >= 0 && value <= 3) return value;
    } catch {
      // ignore storage failures
    }
    return 0;
  });
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [rawComments, setRawComments] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", website: "", content: "" });
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState({ username: "", content: "" });
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [showReplyEmoji, setShowReplyEmoji] = useState<number | null>(null);
  const commentEndRef = useRef<HTMLDivElement>(null);

  // Preview/Raw/Edit states
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [articleMd, setArticleMd] = useState<string>("");
  const prevSelRef = useRef<number | null>(null);

  // New doc editor
  const [showNewEditor, setShowNewEditor] = useState(false);
  const [showFaqDialog, setShowFaqDialog] = useState(false);
  const [faqActiveCat, setFaqActiveCat] = useState("All");
  const [faqCategories, setFaqCategories] = useState<string[]>([]);
  const [faqCatOpen, setFaqCatOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<"private" | "public">(() => {
    try {
      const stored = localStorage.getItem(getVisibilityFilterKey(null));
      if (stored === "private" || stored === "public") return stored;
    } catch {
      // ignore storage failures
    }
    return "public";
  });

  const FAQ_CAT_COLORS: Record<string, string> = {
    Backend: "#22d3ee", Frontend: "#a78bfa", Database: "#60a5fa",
    DevOps: "#f59e0b", API: "#f472b6", Resources: "#34d399",
  };
  const faqAccent = FAQ_CAT_COLORS[faqActiveCat] || "#94a3b8";

  const loggedInCommentUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: resolveImageAvatar(user.avatar),
    };
  }, [user?.username, user?.email, user?.avatar, user]);
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    let mounted = true;
    getUsers()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        if (mounted) setUsers(list);
      })
      .catch(() => {
        if (mounted) setUsers([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setUsers((prev) => {
      const next = [...prev];
      const idx = next.findIndex((item) => Number(item.id ?? item.user_id ?? item.ID ?? 0) === user.id);
      const current = {
        id: user.id,
        user_id: user.id,
        username: user.username,
        name: user.username,
        email: user.email,
        avatar: user.avatar,
        avatar_url: user.avatar,
        avatarUrl: resolveImageAvatar(user.avatar),
      };
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...current };
        return next;
      }
      return [current, ...next];
    });
  }, [user?.id, user?.username, user?.email, user?.avatar]);

  useEffect(() => {
    const key = getVisibilityFilterKey(user?.id ?? null);
    try {
      const stored = localStorage.getItem(key);
      if (stored === "private" || stored === "public") {
        setVisibilityFilter(stored);
        return;
      }
    } catch {
      // ignore storage failures
    }
    setVisibilityFilter(user ? "private" : "public");
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(getVisibilityFilterKey(user?.id ?? null), visibilityFilter);
    } catch {
      // ignore storage failures
    }
  }, [visibilityFilter, user?.id]);

  useEffect(() => {
    const key = getActiveCatKey(user?.id ?? null);
    try {
      const stored = localStorage.getItem(key);
      const value = Number(stored);
      if (Number.isInteger(value) && value >= 0) {
        setActiveCat(value);
        return;
      }
    } catch {
      // ignore storage failures
    }
    setActiveCat(0);
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(getActiveCatKey(user?.id ?? null), String(activeCat));
    } catch {
      // ignore storage failures
    }
  }, [activeCat, user?.id]);

  useEffect(() => {
    const key = getActiveTabKey(user?.id ?? null);
    try {
      const stored = localStorage.getItem(key);
      const value = Number(stored);
      if (Number.isInteger(value) && value >= 0 && value <= 3) {
        setActiveTab(value);
        return;
      }
    } catch {
      // ignore storage failures
    }
    setActiveTab(0);
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(getActiveTabKey(user?.id ?? null), String(activeTab));
    } catch {
      // ignore storage failures
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (user === undefined) return;
    setSelectedDocId(null);
    setComments([]);
    setRawComments([]);
    setArticleMd("");
    setEditContent("");
    setViewMode("preview");
    setIsEditing(false);
    prevSelRef.current = null;
    void refresh();
    void refreshTimeline();
  }, [user, user?.id, refresh, refreshTimeline]);

  const usersById = useMemo(() => {
    const map = new Map<number, any>();
    users.forEach((item) => {
      const id = Number(item.id ?? item.user_id ?? item.ID ?? 0);
      if (id > 0) {
        const rawAvatar = item.avatar_url ?? item.avatarUrl ?? item.avatar ?? "";
        map.set(id, {
          ...item,
          id,
          user_id: id,
          username: item.username ?? item.name ?? "",
          avatar: rawAvatar,
          avatar_url: rawAvatar,
          avatarUrl: resolveImageAvatar(rawAvatar) || "",
        });
      }
    });
    return map;
  }, [users]);

  const docVisibility = user ? 0 : 1;

  useEffect(() => {
    if (!user) return;
    setForm(prev => ({
      ...prev,
      name: prev.name || user.username,
      email: prev.email || user.email || "",
    }));
    setReplyText(prev => ({
      ...prev,
      username: prev.username || user.username,
    }));
  }, [user]);

  const avatarGradients = useMemo(() => [
    "from-violet-400 to-cyan-400",
    "from-pink-400 to-violet-400",
    "from-emerald-400 to-cyan-400",
    "from-amber-400 to-rose-400",
    "from-blue-400 to-indigo-400",
  ], []);

  const getAvatarGradient = useCallback((id: number, username: string) => {
    const seed = id || username.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return avatarGradients[Math.abs(seed) % avatarGradients.length];
  }, [avatarGradients]);

  const formatDisplayTime = useCallback((value: unknown) => {
    const date = value ? new Date(String(value)) : new Date();
    if (Number.isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000);
    const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));

    if (dayDiff === 0 || dayDiff === 1) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      if (hours <= 0 && mins <= 0) return "Just now";
      if (hours <= 0) return `${mins}m ago`;
      if (mins <= 0) return `${hours}h ago`;
      return `${hours}h ${mins}m ago`;
    }

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }, []);

  const normalizeComment = useCallback((item: any): Comment => {
    const username = item.username ?? item.name ?? "Anonymous";
    const createdAt = item.comment_time ?? item.createdAt ?? item.created_at ?? item.time;
    const id = Number(item.id ?? item._id ?? Date.now());

    return {
      id,
      name: username,
      email: item.email ?? "",
      website: item.website ?? "",
      avatar: item.avatar ?? username.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
      avatarClassName: getAvatarGradient(id, username),
      avatarUrl: resolveImageAvatar(item.avatar) || (loggedInCommentUser?.username === username ? loggedInCommentUser.avatarUrl : null),
      time: createdAt ? formatDisplayTime(createdAt) : "Just now",
      content: item.content ?? "",
      likes: Number(item.like_count ?? item.likes ?? 0),
      liked: Boolean(item.liked ?? item.is_liked ?? item.isLiked ?? false),
      parentId: item.parent_id ?? item.parentId ?? null,
      replies: (item.replies ?? []).map(normalizeComment),
    };
  }, [formatDisplayTime, getAvatarGradient, loggedInCommentUser?.username, loggedInCommentUser?.email, loggedInCommentUser?.avatarUrl]);

  // Recursively collect IDs of comments the current user has liked
  const collectLikedIds = (cmts: any[]): number[] =>
    cmts.flatMap((c: any) => {
      const id = Number(c.id ?? c._id ?? 0);
      const ids: number[] = (c.liked || c.is_liked || c.isLiked) ? [id] : [];
      if (c.replies?.length) ids.push(...collectLikedIds(c.replies));
      return ids;
    });

  const readPersistedLikedIds = () => {
    try {
      const raw = localStorage.getItem("docs_liked_comment_ids");
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0) : []);
    } catch {
      return new Set<number>();
    }
  };

  const loadComments = async () => {
    try {
      const res = await fetchComments();
      const payload = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(payload) ? payload : payload.list ?? payload.comments ?? [];
      setRawComments(list);
      setComments(list.map(normalizeComment));
      // Only sync liked Set when fresh data arrives from server
      const serverLiked = new Set(collectLikedIds(list));
      const persistedLiked = readPersistedLikedIds();
      const merged = new Set<number>([...serverLiked, ...persistedLiked]);
      setLiked(merged);
    } catch (error) {
      toast.error("Failed to load comments");
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  // Re-normalize when formatting / user context changes (without touching liked Set)
  useEffect(() => {
    if (rawComments.length === 0) return;
    setComments(rawComments.map(normalizeComment));
  }, [rawComments, normalizeComment]);

  const pc = "border-white/[0.06] shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06),0_0_30px_rgba(76,201,240,0.06)] bg-white/[0.035] backdrop-blur-[24px]";
  const rc = "transition-all duration-300 hover:translate-y-[-3px] cursor-pointer rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6),0_0_30px_rgba(76,201,240,0.08)] bg-white/[0.035] backdrop-blur-[24px]";

  const categories = CATEGORIES;
  const catCounts = useMemo(() => categories.map((_, i) => {
    const visibleArticles = articles.filter((a) => Number(a.visibility ?? 1) === (visibilityFilter === "private" ? 0 : 1));
    if (i === 0) return visibleArticles.length;
    const tag = categories[i].label;
    return visibleArticles.filter(a => a.tag === tag).length;
  }), [articles, categories, visibilityFilter]);

  const activeCatLabel = categories[activeCat]?.label ?? "All Documents";
  const filteredArticles = useMemo(() => {
    const byVisibility = articles.filter((a) => Number(a.visibility ?? 1) === (visibilityFilter === "private" ? 0 : 1));
    if (activeCat === 0) return byVisibility;
    return byVisibility.filter(a => a.tag === activeCatLabel);
  }, [articles, activeCat, activeCatLabel, visibilityFilter]);

  const sel = selectedDocId !== null ? articles.find((item) => item.id === selectedDocId) || null : null;

  const clearSelectedArticle = useCallback(() => {
    setSelectedDocId(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("doc");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadDocDetail = useCallback(async (id: number, fallbackArticle?: Article) => {
    try {
      const res = await fetchDocDetail(id);
      const detail = res.data?.data || res.data;
      const body = detail.content || detail.md || "";
      if (!body) return null;
      const nextArticle = {
        ...(fallbackArticle || articles.find((item) => item.id === id) || {}),
        ...detail,
        id,
        content: body,
        md: body,
        desc: detail.excerpt || fallbackArticle?.desc || "Documentation file.",
      } as Article;
      upsertArticle(nextArticle);
      setArticleMd(body);
      setEditContent(body);
      return nextArticle;
    } catch {
      return null;
    }
  }, [articles, upsertArticle]);

  const openArticle = useCallback(async (article: Article) => {
    if (!article.id) return;
    setSelectedDocId(article.id);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("doc", String(article.id));
      return next;
    }, { replace: true });
    await loadDocDetail(article.id, article);
  }, [loadDocDetail, setSearchParams]);

  const handleDocsSaved = useCallback(async (article?: Article) => {
    if (article) upsertArticle(article);
    await refresh();
    await refreshTimeline();
  }, [refresh, refreshTimeline, upsertArticle]);

  const handleDocDeleted = useCallback((idOrPath: string) => {
    removeArticle(idOrPath);
    const deletedId = Number(idOrPath);
    setSelectedDocId((current) => (current && current === deletedId ? null : current));
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("doc");
      return next;
    }, { replace: true });
  }, [removeArticle, setSearchParams]);

  useEffect(() => {
    if (!articles.length || selectedDocId !== null) return;
    const docPath = searchParams.get("doc");
    if (!docPath) return;
    const id = Number(docPath);
    if (Number.isFinite(id) && id > 0) {
      const article = articles.find((item) => item.id === id);
      if (article) {
        setSelectedDocId(id);
      }
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("doc");
        return next;
      }, { replace: true });
    }
  }, [articles, searchParams, selectedDocId, setSearchParams]);

  useEffect(() => {
    if (!sel?.id) return;
    if (sel.content) {
      setArticleMd(sel.content);
      setEditContent(sel.content);
      return;
    }
    void loadDocDetail(sel.id, sel);
  }, [sel?.id, sel?.content, loadDocDetail]);

  // Memoize rendered markdown
  const renderedContent = useMemo(() => {
    const md = articleMd || sel?.content || sel?.md || "";
    if (!md) return null;
    return renderMarkdown(md);
  }, [articleMd, sel?.content, sel?.md]);

  // Init edit/article state when switching articles
    if (sel && selectedDocId !== prevSelRef.current) {
    prevSelRef.current = selectedDocId;
    setEditContent(sel.content || sel.md || "");
    setArticleMd(sel.content || sel.md || "");
    setViewMode("preview");
    setIsEditing(false);
  }

  let bodyContent: React.ReactNode;
  if (sel) {
    bodyContent = (
      <ArticleView
        sel={sel}
        selectedIdx={selectedDocId}
        setSelectedIdx={setSelectedDocId}
        onCloseArticle={clearSelectedArticle}
        onSaved={handleDocsSaved}
        onDeleted={handleDocDeleted}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editContent={editContent}
        setEditContent={setEditContent}
        articleMd={articleMd}
        setArticleMd={setArticleMd}
        renderedContent={renderedContent}
        comments={comments}
        setComments={setComments}
        form={form}
        setForm={setForm}
        refreshComments={loadComments}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        replyText={replyText}
        setReplyText={setReplyText}
        liked={liked}
        setLiked={setLiked}
        showEmoji={showEmoji}
        setShowEmoji={setShowEmoji}
        showReplyEmoji={showReplyEmoji}
        setShowReplyEmoji={setShowReplyEmoji}
        commentEndRef={commentEndRef}
        loggedInUser={loggedInCommentUser}
        currentUserId={currentUserId}
        TAG_COLORS={TAG_COLORS}
        TAG_ICONS={TAG_ICONS}
      />
    );
  } else if (activeTab === 1) {
    bodyContent = (
      <TimelineTab
        filteredArticles={filteredArticles}
        articles={articles}
        setSelectedIdx={setSelectedDocId}
        openArticle={openArticle}
        currentUserId={currentUserId}
        TAG_COLORS={TAG_COLORS}
        TAG_ICONS={TAG_ICONS}
        timelineGroups={timelineGroups}
        availableYears={availableYears}
        loading={timelineLoading}
      />
    );
  } else if (activeTab === 2) {
    bodyContent = (
      <ProfileTab activeTab={activeTab} />
    );
  } else if (activeTab === 3) {
    bodyContent = <FaqTab key={`faq-${activeTab}`} showAddDialog={showFaqDialog} onAddDialogClosed={() => setShowFaqDialog(false)} activeCat={faqActiveCat} onCategoriesChange={setFaqCategories} />;
  } else {
    bodyContent = (
      <DocGrid
        activeCat={activeCat}
        ARTICLES={articles}
        filteredArticles={filteredArticles}
        featured={articles.find(a => a.featured)}
        setSelectedIdx={setSelectedDocId}
        openArticle={openArticle}
        rc={rc}
        TAG_COLORS={TAG_COLORS}
        TAG_ICONS={TAG_ICONS}
        usersById={usersById}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(circle at 20% 20%, rgba(123,47,247,0.18), transparent 30%), radial-gradient(circle at 70% 60%, rgba(76,201,240,0.12), transparent 35%), linear-gradient(135deg, #050816 0%, #090B14 35%, #0A1020 100%)", padding: "36px" }}>
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
      <div className="pointer-events-none fixed top-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-30 z-0" style={{ background: "radial-gradient(circle, rgba(76,201,240,0.15), transparent 60%)" }} />
      <div className="pointer-events-none fixed bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full blur-[100px] opacity-25 z-0" style={{ background: "radial-gradient(circle, rgba(123,47,247,0.12), transparent 60%)" }} />
      <Sidebar />
      <div className="relative z-10 w-full max-w-[1600px] h-[calc(100vh-72px)] lg:ml-24 md:ml-4 flex flex-col md:flex-row gap-0 pb-16 lg:pb-0 px-3 sm:px-4 md:px-0 pt-3 sm:pt-0">
        {/* ═══ Left Nav — hidden on small screens ═══ */}
        <div className={`hidden md:flex w-[220px] shrink-0 flex-col h-full rounded-l-[28px] overflow-hidden ${pc}`} style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="p-5 border-b border-white/[0.04]">
            <p className="text-[9px] font-semibold text-blue-400/60 uppercase tracking-[0.3em]">Browse</p>
            <h3 className="text-sm font-bold tracking-tight mt-1.5 text-white/90">Docs Hub</h3>
          </div>
          <DocsSidebar
            categories={categories}
            activeCat={activeCat}
            setActiveCat={setActiveCat}
            setSelectedIdx={clearSelectedArticle}
            catCounts={catCounts}
            CAT_COLORS={CAT_COLORS}
            visibilityFilter={visibilityFilter}
            setVisibilityFilter={setVisibilityFilter}
            onNavigate={() => setShowNewEditor(false)}
          />
        </div>

        {/* ═══ Center ═══ */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden rounded-[28px] md:rounded-none md:rounded-r-[28px]"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          <div className="px-6 pt-4">
            <TopNav />
          </div>
          {/* Header — no search bar */}
          <div className="px-6 py-4 border-b border-white/[0.03] flex items-center gap-4 shrink-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)" }}>
            {sel && (
              <button onClick={clearSelectedArticle}
                className="group relative w-9 h-9 rounded-full grid place-items-center overflow-hidden transition-all duration-300 hover:-translate-x-0.5 active:scale-95 before:absolute before:inset-0 before:rounded-full before:bg-white/[0.025] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
                style={{
                  background: "rgba(255,255,255,0.018)",
                  border: "1px solid rgba(255,255,255,0.018)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: "none",
                }}>
                <span
                  className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: "rgba(0,0,0,0.22)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.045), inset 0 1px 0 rgba(255,255,255,0.055)",
                  }}
                />
                <ArrowLeft size={15} className="relative z-10 text-white/42 transition-all duration-300 group-hover:text-white/72 group-hover:-translate-x-0.5" />
              </button>
            )}
            <div className="flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: activeTab === 3 ? "rgba(34,211,238,0.5)" : activeTab === 1 ? "rgba(167,139,250,0.5)" : activeTab === 2 ? "rgba(96,165,250,0.5)" : "rgba(76,201,240,0.5)" }}>
                {sel ? "Knowledge Base" : activeTab === 3 ? "Q & A" : activeTab === 1 ? "History" : activeTab === 2 ? "Profile" : "Knowledge Base"}
              </p>
                <h1 className="text-[24px] font-bold tracking-tight mt-1"
                  style={{
                  backgroundImage: sel
                    ? "linear-gradient(to right, #fff 20%, #4CC9F0 70%, #7B2FF7)"
                    : activeTab === 3
                    ? "linear-gradient(135deg, #fff 0%, #22d3ee 45%, #a78bfa 100%)"
                    : activeTab === 1
                    ? "linear-gradient(135deg, #fff 0%, #a78bfa 45%, #c084fc 100%)"
                    : activeTab === 2
                    ? "linear-gradient(135deg, #fff 0%, #60a5fa 45%, #818cf8 100%)"
                    : "linear-gradient(135deg, #fff 0%, #4CC9F0 45%, #7B2FF7 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}>
                {sel ? sel.title : activeTab === 3 ? "Frequently Asked Questions" : activeTab === 1 ? "Timeline" : activeTab === 2 ? "Profile" : "Docs Hub"}
              </h1>
            </div>
          </div>
          {!sel && (
            <div className="px-3 md:px-6 pt-3 md:pt-4 pb-2 flex items-center border-b border-white/[0.02] transition-all duration-300">
              <div className="flex items-center gap-3 md:gap-6 flex-1 overflow-x-auto scrollbar-none -mb-[1px]">
                {["Docs", "Timeline", "Profile", "FAQ"].map((t, i) => (
                <button key={t} onClick={() => { setActiveTab(i); setShowNewEditor(false); }}
                  className={`shrink-0 text-[11px] md:text-[12px] font-medium pb-2.5 border-b-2 transition-all duration-300 ${activeTab === i ? "text-white border-blue-400" : "text-white/30 border-transparent hover:text-white/60"}`}>{t}</button>
              ))}
              </div>
              {activeTab === 0 && (
                <button
                  onClick={() => setShowNewEditor(true)}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, rgba(76,201,240,0.15), rgba(123,47,247,0.12))",
                    border: "1px solid rgba(76,201,240,0.2)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <Plus size={13} />
                  New Doc
                </button>
              )}
              {activeTab === 3 && (
                <div className="flex items-center gap-2">
                  {/* Category filter dropdown */}
                  {faqCategories.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setFaqCatOpen(!faqCatOpen)}
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-200"
                        style={{
                          background: faqActiveCat !== "All" ? `${faqAccent}18` : "rgba(255,255,255,0.05)",
                          border: `1px solid ${faqActiveCat !== "All" ? faqAccent + "30" : "rgba(255,255,255,0.10)"}`,
                          color: faqActiveCat !== "All" ? faqAccent : "rgba(255,255,255,0.55)",
                        }}
                      >
                        <span className="w-[4px] h-[4px] rounded-full"
                          style={{ background: faqActiveCat !== "All" ? faqAccent : "rgba(255,255,255,0.4)" }} />
                        {faqActiveCat}
                        <svg width="8" height="5" viewBox="0 0 8 5" style={{ opacity: 0.5 }}>
                          <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {faqCatOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setFaqCatOpen(false)} />
                          <div className="absolute right-0 top-full mt-1.5 z-50 w-32 py-1 rounded-xl"
                            style={{ background: "rgba(18,16,30,0.96)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                            {faqCategories.map((cat) => {
                              const c = FAQ_CAT_COLORS[cat] || "#94a3b8";
                              const active = cat === faqActiveCat;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => { setFaqActiveCat(cat); setFaqCatOpen(false); }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium transition-all duration-150 flex items-center gap-2"
                                  style={{
                                    color: cat !== "All" ? c : "rgba(255,255,255,0.45)",
                                    background: active ? "rgba(255,255,255,0.04)" : "transparent",
                                  }}
                                >
                                  <span className="w-[4px] h-[4px] rounded-full shrink-0"
                                    style={{ background: cat !== "All" ? c : "rgba(255,255,255,0.25)" }} />
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Add button */}
                  <button
                    onClick={() => setShowFaqDialog(true)}
                    className="relative w-8 h-8 rounded-full grid place-items-center transition-all duration-300 hover:scale-110 active:scale-95 group/faqbtn"
                    style={{
                      background: "linear-gradient(135deg, rgba(76,201,240,0.22), rgba(123,47,247,0.18))",
                      border: "1px solid rgba(76,201,240,0.3)",
                      boxShadow: "0 0 14px rgba(76,201,240,0.1), 0 0 28px rgba(123,47,247,0.06)",
                    }}
                  >
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover/faqbtn:opacity-100 transition-opacity duration-300"
                      style={{ background: "transparent", boxShadow: "0 0 18px rgba(76,201,240,0.25), 0 0 36px rgba(123,47,247,0.12)" }} />
                    <Plus size={14} style={{ color: "rgba(255,255,255,0.85)", position: "relative", zIndex: 1 }} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-5 space-y-5">
            {showNewEditor ? (
              <Suspense fallback={null}>
                <NewDocEditor
                  onClose={() => setShowNewEditor(false)}
                  onSaved={handleDocsSaved}
                  currentUserId={currentUserId}
                  initialVisibility={docVisibility}
                  allowPrivate={!!user}
                  initialEditPermission={user ? 0 : 1}
                  allowOwnerOnly={!!user}
                />
              </Suspense>
            ) : (
              bodyContent
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
