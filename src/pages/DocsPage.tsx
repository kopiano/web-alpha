import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { toast } from "sonner";

import { useArticles, CATEGORIES, TAG_COLORS, TAG_ICONS, CAT_COLORS } from "@/hooks/useArticles";
import type { Article } from "@/hooks/useArticles";
import type { Comment } from "@/components/doc/docsData";
import { fetchComments } from "@/api/comment";
import { renderMarkdown } from "@/components/doc/DocRenderer";
import { DocsSidebar } from "@/components/doc/DocsSidebar";
import { DocGrid } from "@/components/doc/DocGrid";
import { ArticleView } from "@/components/doc/ArticleView";
import { TimelineTab } from "@/components/doc/TimelineTab";
import { ProfileTab } from "@/components/doc/ProfileTab";
import FaqTab from "@/components/doc/FaqTab";
import { NewDocEditor } from "@/components/doc/NewDocEditor";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { resolveAvatar } from "@/lib/avatar";

/* ─── Main ─── */
export default function DocsPage() {
  const { articles, loading, refresh } = useArticles();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
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

  const loggedInCommentUser = user ? {
    username: user.username,
    email: user.email,
    avatarUrl: resolveAvatar(user.avatar),
  } : null;

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
      avatarUrl: resolveAvatar(item.avatar) || (loggedInCommentUser?.username === username ? loggedInCommentUser.avatarUrl : null),
      time: createdAt ? formatDisplayTime(createdAt) : "Just now",
      content: item.content ?? "",
      likes: Number(item.like_count ?? item.likes ?? 0),
      liked: Boolean(item.liked ?? item.is_liked ?? item.isLiked ?? false),
      parentId: item.parent_id ?? item.parentId ?? null,
      replies: (item.replies ?? []).map(normalizeComment),
    };
  }, [formatDisplayTime, getAvatarGradient, loggedInCommentUser]);

  // Recursively collect IDs of comments the current user has liked
  const collectLikedIds = (cmts: any[]): number[] =>
    cmts.flatMap((c: any) => {
      const id = Number(c.id ?? c._id ?? 0);
      const ids: number[] = (c.liked || c.is_liked || c.isLiked) ? [id] : [];
      if (c.replies?.length) ids.push(...collectLikedIds(c.replies));
      return ids;
    });

  const loadComments = async () => {
    try {
      const res = await fetchComments();
      const payload = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(payload) ? payload : payload.list ?? payload.comments ?? [];
      setRawComments(list);
      setComments(list.map(normalizeComment));
      // Only sync liked Set when fresh data arrives from server
      setLiked(new Set(collectLikedIds(list)));
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
    if (i === 0) return articles.length;
    const tag = categories[i].label;
    return articles.filter(a => a.tag === tag).length;
  }), [articles, categories]);

  const activeCatLabel = categories[activeCat]?.label ?? "All Documents";
  const filteredArticles = useMemo(() => {
    if (activeCat === 0) return articles;
    return articles.filter(a => a.tag === activeCatLabel);
  }, [articles, activeCat, activeCatLabel]);

  const sel = selectedIdx !== null ? articles[selectedIdx] : null;

  const clearSelectedArticle = useCallback(() => {
    setSelectedIdx(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("doc");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const openArticle = useCallback((article: Article) => {
    const idx = articles.indexOf(article);
    if (idx < 0) return;
    setSelectedIdx(idx);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("doc", article.path || String(idx));
      return next;
    }, { replace: true });
  }, [articles, setSearchParams]);

  useEffect(() => {
    if (!articles.length || selectedIdx !== null) return;
    const docPath = searchParams.get("doc");
    if (!docPath) return;
    const idx = articles.findIndex(article => article.path === docPath);
    if (idx >= 0) {
      setSelectedIdx(idx);
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("doc");
        return next;
      }, { replace: true });
    }
  }, [articles, searchParams, selectedIdx, setSearchParams]);

  // Memoize rendered markdown
  const renderedContent = useMemo(() => {
    const md = articleMd || sel?.content || "";
    if (!md) return null;
    return renderMarkdown(md);
  }, [articleMd, sel?.content]);

  // Init edit/article state when switching articles
  if (sel && selectedIdx !== prevSelRef.current) {
    prevSelRef.current = selectedIdx;
    setEditContent(sel.content || "");
    setArticleMd(sel.content || "");
    setViewMode("preview");
    setIsEditing(false);
  }

  let bodyContent: React.ReactNode;
  if (sel) {
    bodyContent = (
      <ArticleView
        sel={sel}
        selectedIdx={selectedIdx}
        setSelectedIdx={setSelectedIdx}
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
        TAG_COLORS={TAG_COLORS}
        TAG_ICONS={TAG_ICONS}
      />
    );
  } else if (activeTab === 1) {
    bodyContent = (
      <TimelineTab
        filteredArticles={filteredArticles}
        articles={articles}
        setSelectedIdx={setSelectedIdx}
        openArticle={openArticle}
        TAG_COLORS={TAG_COLORS}
        TAG_ICONS={TAG_ICONS}
      />
    );
  } else if (activeTab === 2) {
    bodyContent = (
      <ProfileTab activeTab={activeTab} />
    );
  } else if (activeTab === 3) {
    bodyContent = <FaqTab showAddDialog={showFaqDialog} onAddDialogClosed={() => setShowFaqDialog(false)} />;
  } else {
    bodyContent = (
      <DocGrid
        activeCat={activeCat}
        ARTICLES={articles}
        filteredArticles={filteredArticles}
        featured={articles.find(a => a.featured)}
        setSelectedIdx={setSelectedIdx}
        openArticle={openArticle}
        rc={rc}
        TAG_COLORS={TAG_COLORS}
        TAG_ICONS={TAG_ICONS}
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
      <div className="relative z-10 w-full max-w-[1600px] h-[calc(100vh-72px)] flex ml-24">
        {/* ═══ Left Nav ═══ */}
        <div className={`w-[220px] shrink-0 flex flex-col h-full rounded-l-[28px] overflow-hidden ${pc}`} style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
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
            onNavigate={() => setShowNewEditor(false)}
          />
        </div>

        {/* ═══ Center ═══ */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", borderRight: "1px solid rgba(255,255,255,0.04)", boxShadow: "0 10px 40px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
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
              <p className="text-[9px] font-semibold text-blue-400/50 uppercase tracking-[0.25em]">Knowledge Base</p>
              <h1 className="text-[24px] font-bold tracking-tight mt-1" style={{ background: "linear-gradient(to right, #fff 20%, #4CC9F0 70%, #7B2FF7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {sel ? sel.title : "Docs Hub"}
              </h1>
            </div>
          </div>
          {!sel && (
            <div className="px-6 pt-4 pb-2 flex items-center border-b border-white/[0.02] transition-all duration-300">
              <div className="flex items-center gap-6 flex-1">
                {["Docs", "Timeline", "Profile", "FAQ"].map((t, i) => (
                <button key={t} onClick={() => { setActiveTab(i); setShowNewEditor(false); }}
                  className={`text-[12px] font-medium pb-2.5 border-b-2 transition-all duration-300 ${activeTab === i ? "text-white border-blue-400" : "text-white/30 border-transparent hover:text-white/60"}`}>{t}</button>
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
                <button
                  onClick={() => setShowFaqDialog(true)}
                  className="relative w-8 h-8 rounded-full grid place-items-center transition-all duration-300 hover:scale-110 active:scale-95 group/faqbtn"
                  style={{
                    background: "linear-gradient(135deg, rgba(76,201,240,0.22), rgba(123,47,247,0.18))",
                    border: "1px solid rgba(76,201,240,0.3)",
                    boxShadow: "0 0 14px rgba(76,201,240,0.1), 0 0 28px rgba(123,47,247,0.06)",
                  }}
                >
                  {/* glow ring on hover */}
                  <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover/faqbtn:opacity-100 transition-opacity duration-300"
                    style={{
                      background: "transparent",
                      boxShadow: "0 0 18px rgba(76,201,240,0.25), 0 0 36px rgba(123,47,247,0.12)",
                    }}
                  />
                  <Plus size={14} style={{ color: "rgba(255,255,255,0.85)", position: "relative", zIndex: 1 }} />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-5 space-y-5">
            {showNewEditor ? (
              <NewDocEditor onClose={() => setShowNewEditor(false)} onSaved={refresh} />
            ) : (
              bodyContent
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
