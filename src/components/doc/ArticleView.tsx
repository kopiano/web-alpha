import { useEffect, useMemo, useState } from "react";
import { BookOpen, Eye, FileText, Save, Loader2, Trash2, X, Eye as PublicEye, Lock, ChevronDown, ListTree } from "lucide-react";
import { toast } from "sonner";
import { renderMarkdown } from "@/components/doc/DocRenderer";
import { CommentsSection } from "@/components/doc/Comments";
import { saveMd } from "@/components/doc/docsData";
import { updateDoc, deleteDoc } from "@/api/doc";
import { DOC_CATEGORIES } from "@/config/docs";
import { resolveImageAvatar } from "@/lib/avatar";
import type { Comment } from "@/components/doc/docsData";
import type { Article } from "@/components/doc/docsData";

/* ─── Article Detail View ─── */
interface ArticleViewProps {
  sel: (typeof import("@/components/doc/docsData").ARTICLES)[number] | null;
  selectedIdx: number | null;
  setSelectedIdx: (idx: number | null) => void;
  onCloseArticle?: () => void;
  onSaved?: () => void | Promise<void>;
  onDeleted?: (path: string) => void | Promise<void>;
  onLoaded?: (article: Article) => void | Promise<void>;
  viewMode: "preview" | "raw";
  setViewMode: (mode: "preview" | "raw") => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  editContent: string;
  setEditContent: (content: string) => void;
  articleMd: string;
  setArticleMd: (md: string) => void;
  renderedContent: React.ReactNode;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  form: { name: string; email: string; website: string; content: string; };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; website: string; content: string; }>>;
  refreshComments: () => Promise<void>;
  replyTo: number | null;
  setReplyTo: React.Dispatch<React.SetStateAction<number | null>>;
  replyText: { username: string; content: string; };
  setReplyText: React.Dispatch<React.SetStateAction<{ username: string; content: string; }>>;
  liked: Set<number>;
  setLiked: React.Dispatch<React.SetStateAction<Set<number>>>;
  showEmoji: boolean;
  setShowEmoji: React.Dispatch<React.SetStateAction<boolean>>;
  showReplyEmoji: number | null;
  setShowReplyEmoji: React.Dispatch<React.SetStateAction<number | null>>;
  commentEndRef: React.RefObject<HTMLDivElement | null>;
  loggedInUser: { id: number; username: string; email: string; avatarUrl: string | null } | null;
  currentUserId: number | null;
  TAG_COLORS: Record<string, string>;
  TAG_ICONS: Record<string, React.ElementType>;
}

export const ArticleView = ({
  sel, selectedIdx, setSelectedIdx, viewMode, setViewMode, isEditing, setIsEditing, editContent, setEditContent,
  articleMd, setArticleMd, renderedContent, comments, setComments, form, setForm, refreshComments, replyTo, setReplyTo, replyText, setReplyText,
  liked, setLiked, showEmoji, setShowEmoji, showReplyEmoji, setShowReplyEmoji, commentEndRef, loggedInUser,
  currentUserId,
  TAG_COLORS, TAG_ICONS,
  onCloseArticle,
  onSaved,
  onDeleted,
  onLoaded,
}: ArticleViewProps) => {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editTag, setEditTag] = useState(sel?.tag || "Resources");
  const [editVisibility, setEditVisibility] = useState(sel?.visibility ?? 1);
  const [editPermission, setEditPermission] = useState(sel?.editPermission ?? 0);
  const isOwner = Boolean(loggedInUser?.id && sel?.userId && loggedInUser.id === sel.userId);
  const canChangeEditPermission = isOwner;
  const canEditContent = isOwner || sel.editPermission === 1;

  useEffect(() => {
    setEditTag(sel.tag || "Resources");
    setEditVisibility(sel.visibility ?? 1);
    setEditPermission(sel.editPermission ?? 0);
  }, [sel?.id, sel?.tag, sel?.visibility, sel?.editPermission]);

  if (!sel) return null;

  const formatDisplayTime = (value?: string) => {
    if (!value) return "—";
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const activeVisibility = viewMode === "raw" ? editVisibility : (sel.visibility ?? 1);
  const activeTag = viewMode === "raw" ? editTag : sel.tag;
  const visibilityLabel = activeVisibility === 0 ? "Private" : "Public";
  const VisibilityIcon = activeVisibility === 0 ? Lock : PublicEye;
  const previewMd = editContent || articleMd || sel.content || sel.md || "";
  const canDelete = isOwner;
  const canOpenRaw = Boolean(loggedInUser?.id) && (isOwner || sel.editPermission === 1);
  const rawDisabledTitle = loggedInUser?.id
    ? "You do not have permission to edit this document"
    : "请登录再使用此功能";

  const tocTree = useMemo(() => {
    if (viewMode !== "preview") return [];
    const lines = previewMd.split("\n");
    const counts = new Map<string, number>();
    const slugify = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[`~!@#$%^&*()+=<>?/\\|'"":;{}\[\],.]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    const items: { id: string; title: string; level: number; children: any[] }[] = [];
    let inCode = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;
      const match = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (!match) continue;
      const level = match[1].length;
      const title = match[2].trim();
      const base = slugify(title) || "heading";
      const count = counts.get(base) || 0;
      counts.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      items.push({ id, title, level, children: [] });
    }
    const tree: { id: string; title: string; level: number; children: any[] }[] = [];
    const stack: { id: string; title: string; level: number; children: any[] }[] = [];
    items.forEach((item) => {
      const node = item;
      while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
      if (!stack.length) tree.push(node);
      else stack[stack.length - 1].children.push(node);
      stack.push(node);
    });
    return tree;
  }, [previewMd, viewMode]);

  const handleSave = async () => {
    if (!sel.id) return;
    if (!canEditContent) {
      toast.error("You do not have permission to edit this document");
      return;
    }
    setSaving(true);
    try {
      const res = await updateDoc(sel.id, {
        category: editTag.toLowerCase(),
        title: sel.title,
        content: editContent,
        visibility: editVisibility,
        edit_permission: editPermission,
        editor_user_id: currentUserId ?? undefined,
      });
      const updated = res.data?.data || {};
      saveMd(String(sel.id), editContent);
      setArticleMd(editContent);
      setIsEditing(false);
      setViewMode("preview");
      toast.success("Document updated");
      await onLoaded?.({
        ...sel,
        ...updated,
        tag: updated.category || editTag,
        visibility: Number(updated.visibility ?? editVisibility),
        editPermission: Number(updated.edit_permission ?? editPermission),
        editorAvatar: !isOwner && loggedInUser?.username ? loggedInUser.username.slice(0, 2).toUpperCase() : "",
        editorAvatarUrl: !isOwner ? (resolveImageAvatar(loggedInUser?.avatarUrl || undefined) || "") : "",
        content: updated.content || editContent,
        md: updated.content || editContent,
        desc: updated.excerpt || sel.desc,
        contributors: Array.isArray(updated.contributors) ? updated.contributors : sel.contributors,
      });
      await onSaved?.();
    } catch {
      saveMd(String(sel.id), editContent);
      setArticleMd(editContent);
      setIsEditing(false);
      setViewMode("preview");
      toast.error("Failed to sync to server, saved locally");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sel.id) return;
    setDeleting(true);
    try {
      await deleteDoc(sel.id);
      await onDeleted?.(String(sel.id));
      await onSaved?.();
      toast.success("Document deleted");
      onCloseArticle?.();
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div className="flex items-start gap-6 xl:gap-8">
      <div className="min-w-0 flex-1 max-w-3xl">
      {/* Top bar: tag + controls */}
      <div className={`flex items-center mb-6 ${viewMode === "raw" ? "justify-start gap-0" : "justify-between"}`}>
        <div className="flex items-center gap-3">
          {viewMode !== "raw" && (
            <>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full border ${TAG_COLORS[activeTag] || ""}`}>
                {(() => { const Icon = TAG_ICONS[activeTag] || BookOpen; return <Icon size={12} />; })()}{activeTag}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full border border-white/10 text-white/45 bg-white/[0.03]">
                <VisibilityIcon size={12} />
                {visibilityLabel}
              </span>
            </>
          )}
          {viewMode !== "raw" && (
            <span className="text-[11px] text-white/40">
              {sel.author}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "raw" && isOwner && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value)}
                  className="appearance-none h-8 pl-3 pr-8 rounded-lg text-[10px] font-medium text-white/75 border border-white/10 bg-white/[0.04] outline-none"
                >
                  {DOC_CATEGORIES.map((category) => (
                    <option key={category} value={category} className="bg-[#0d1117] text-white/85">
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/35" />
              </div>
              <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                <div className="relative flex">
                  <div
                    className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-white/10 transition-transform duration-300 ease-out"
                    style={{ transform: editVisibility === 0 ? "translateX(0%)" : "translateX(100%)" }}
                  />
                  <button
                    type="button"
                    disabled={!canChangeEditPermission}
                    onClick={() => canChangeEditPermission && setEditVisibility(0)}
                    className={`relative z-10 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors duration-200 ${editVisibility === 0 ? "text-white" : "text-white/40 hover:text-white/70"} ${!canChangeEditPermission ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <Lock size={10} className="inline-block mr-1" />
                    Private
                  </button>
                  <button
                    type="button"
                    disabled={!canChangeEditPermission}
                    onClick={() => canChangeEditPermission && setEditVisibility(1)}
                    className={`relative z-10 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors duration-200 ${editVisibility === 1 ? "text-white" : "text-white/40 hover:text-white/70"} ${!canChangeEditPermission ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <PublicEye size={10} className="inline-block mr-1" />
                    Public
                  </button>
                </div>
              </div>
              <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                <div className="relative flex">
                  <div
                    className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-white/10 transition-transform duration-300 ease-out"
                    style={{ transform: editPermission === 0 ? "translateX(0%)" : "translateX(100%)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setEditPermission(0)}
                    className={`relative z-10 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors duration-200 ${editPermission === 0 ? "text-white" : "text-white/40 hover:text-white/70"}`}
                  >
                    <Lock size={10} className="inline-block mr-1" />
                    Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermission(1)}
                    className={`relative z-10 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors duration-200 ${editPermission === 1 ? "text-white" : "text-white/40 hover:text-white/70"}`}
                  >
                    <PublicEye size={10} className="inline-block mr-1" />
                    Public
                  </button>
                </div>
              </div>
            </div>
          )}
          {viewMode === "raw" && canOpenRaw && (
            <button
              onClick={handleSave}
              disabled={saving || !canEditContent}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.25), rgba(123,47,247,0.2))", border: "1px solid rgba(76,201,240,0.2)" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving..." : "Save"}
            </button>
          )}

          {/* Preview / Raw toggle */}
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 gap-0.5">
            <button
              onClick={() => { setArticleMd(editContent || articleMd || sel.content); setViewMode("preview"); }}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 flex items-center gap-1.5 ${viewMode === "preview"
                  ? "text-white shadow-[0_0_15px_rgba(76,201,240,0.2)] border border-blue-400/20"
                  : "text-white/40 hover:text-white/70"
                }`}
              style={viewMode === "preview" ? { background: "linear-gradient(135deg, rgba(76,201,240,0.2), rgba(123,47,247,0.12))" } : {}}>
              <Eye size={12} /> Preview
            </button>
            <button
              onClick={() => {
                if (!canOpenRaw) return;
                setEditContent(articleMd || sel.content);
                setViewMode("raw");
              }}
              disabled={!canOpenRaw}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 flex items-center gap-1.5 ${viewMode === "raw"
                  ? "text-white shadow-[0_0_15px_rgba(76,201,240,0.2)] border border-blue-400/20"
                  : "text-white/40 hover:text-white/70"
                } ${!canOpenRaw ? "opacity-35 cursor-not-allowed hover:text-white/40" : ""}`}
              style={viewMode === "raw" ? { background: "linear-gradient(135deg, rgba(76,201,240,0.2), rgba(123,47,247,0.12))" } : {}}
              title={!canOpenRaw ? rawDisabledTitle : undefined}>
              <FileText size={12} /> Raw
            </button>
          </div>
          {isOwner && (
            <button
              onClick={() => canDelete && setConfirmDeleteOpen(true)}
              disabled={!canDelete}
              className="w-8 h-8 rounded-lg grid place-items-center transition-all duration-200 border border-white/10 text-white/35 hover:text-rose-200 hover:border-rose-400/30 hover:bg-rose-400/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
              title="Delete document"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Render area */}
      <div className="mt-1 mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-white/35">
        <span>Created At: <span className="text-white/70">{formatDisplayTime(sel.createdAt || sel.date)}</span></span>
        <span>Updated At: <span className="text-white/70">{formatDisplayTime(sel.updatedAt || sel.createdAt || sel.date)}</span></span>
      </div>
      <div className="relative min-h-[400px]">
        <div
          className={`absolute inset-0 transition-all duration-200 ease-out ${viewMode === "preview" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"}`}
          style={{ willChange: "opacity, transform" }}
        >
          <div className="p-0">
            {renderedContent || (previewMd ? renderMarkdown(previewMd) : null)}
          </div>
        </div>
        <div
          className={`absolute inset-0 transition-all duration-200 ease-out ${viewMode === "raw" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}`}
          style={{ willChange: "opacity, transform" }}
        >
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            readOnly={!canEditContent}
            className="w-full h-full min-h-[400px] p-5 text-[13px] leading-[1.7] outline-none resize-none scrollbar-none"
            style={{ background: "transparent", color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          />
        </div>
      </div>

      {/* Comments */}
      <CommentsSection
        comments={comments}
        setComments={setComments}
        form={form}
        setForm={setForm}
        refreshComments={refreshComments}
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
        loggedInUser={loggedInUser}
      />

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => !deleting && setConfirmDeleteOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            style={{ background: "linear-gradient(180deg, rgba(20,12,22,0.98), rgba(12,10,18,0.96))" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full grid place-items-center bg-rose-400/10 border border-rose-400/20 text-rose-200 shrink-0">
                <Trash2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white/92">Delete this document?</h3>
                <p className="mt-1 text-[11px] leading-5 text-white/45">
                  This will permanently remove <span className="text-white/75 font-medium">{sel.title}</span> from docs and timeline.
                </p>
                {!canDelete && (
                  <p className="mt-2 text-[11px] leading-5 text-amber-200/80">
                    Only the document author can delete it.
                  </p>
                )}
              </div>
              <button
                onClick={() => !deleting && setConfirmDeleteOpen(false)}
                className="w-8 h-8 rounded-full grid place-items-center text-white/30 hover:text-white/80 hover:bg-white/[0.04]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-[11px] font-medium text-white/55 hover:text-white/80 transition-colors disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !canDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(244,63,94,0.82))", boxShadow: "0 12px 30px -12px rgba(239,68,68,0.55)" }}
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {viewMode === "preview" && tocTree.length > 0 && (
        // md index
        <aside className="hidden xl:block fixed right-5 top-1/2 -translate-y-1/2 w-60 z-20">
          <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_18px_60px_-24px_rgba(0,0,0,0.55)] max-h-[calc(100vh-300px)] overflow-hidden">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              <ListTree size={12} className="text-cyan-300/70" />
              Index
            </div>
            <div className="mt-4 pr-0.5 max-h-[calc(100vh-360px)] overflow-y-auto overflow-x-hidden scrollbar-thin">
              <TreeNodeList nodes={tocTree as any} />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

const TreeNodeList = ({ nodes, depth = 0 }: { nodes: { id: string; title: string; level: number; children: any[] }[]; depth?: number }) => {
  return (
    <ul className={`${depth > 0 ? "mt-1.5 ml-4 pl-3 border-l border-white/[0.08]" : "space-y-1.5"}`}>
      {nodes.map((node) => (
        <li key={node.id} className="mb-1.5 last:mb-0">
          <button
            type="button"
            onClick={() => document.getElementById(node.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`group w-full flex items-center gap-2 rounded-2xl px-3 py-1.5 text-left transition-all duration-200 hover:bg-white/[0.05] hover:translate-x-[2px]`}
          >
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              node.level === 1 ? "text-cyan-300/90" : node.level === 2 ? "text-white/45" : "text-white/30"
            }`}>
              {node.level === 1 ? "H1" : node.level === 2 ? "H2" : "H3"}
            </span>
            <span className={`min-w-0 flex-1 text-[11px] leading-4 truncate ${
              node.level === 1 ? "font-semibold text-white/82" :
              node.level === 2 ? "font-medium text-white/62" :
              "text-white/46"
            }`}>
              {node.title}
            </span>
          </button>
          {node.children?.length > 0 && <TreeNodeList nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
};
