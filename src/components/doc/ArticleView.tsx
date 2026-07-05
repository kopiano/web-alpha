import { useState } from "react";
import { BookOpen, Eye, FileText, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { renderMarkdown } from "@/components/doc/DocRenderer";
import { CommentsSection } from "@/components/doc/Comments";
import { saveMd } from "@/components/doc/docsData";
import { saveDoc } from "@/api/doc";
import type { Comment } from "@/components/doc/docsData";
import type { Article } from "@/components/doc/docsData";

/* ─── Article Detail View ─── */
interface ArticleViewProps {
  sel: (typeof import("@/components/doc/docsData").ARTICLES)[number] | null;
  selectedIdx: number | null;
  setSelectedIdx: (idx: number | null) => void;
  onSaved?: () => void;
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
  loggedInUser: { username: string; email: string; avatarUrl: string | null } | null;
  TAG_COLORS: Record<string, string>;
  TAG_ICONS: Record<string, React.ElementType>;
}

export const ArticleView = ({
  sel, selectedIdx, setSelectedIdx, viewMode, setViewMode, isEditing, setIsEditing, editContent, setEditContent,
  articleMd, setArticleMd, renderedContent, comments, setComments, form, setForm, refreshComments, replyTo, setReplyTo, replyText, setReplyText,
  liked, setLiked, showEmoji, setShowEmoji, showReplyEmoji, setShowReplyEmoji, commentEndRef, loggedInUser,
  TAG_COLORS, TAG_ICONS,
  onSaved,
}: ArticleViewProps) => {
  const [saving, setSaving] = useState(false);
  if (!sel) return null;

  const handleSave = async () => {
    const p = sel.path;
    if (!p) return;
    setSaving(true);
    try {
      await saveDoc({ path: p, tag: sel.tag.toLowerCase(), title: sel.title, content: editContent });
      saveMd(p, editContent);
      setArticleMd(editContent);
      setIsEditing(false);
      setViewMode("preview");
      toast.success("Document updated");
      onSaved?.();
    } catch {
      saveMd(p, editContent);
      setArticleMd(editContent);
      setIsEditing(false);
      setViewMode("preview");
      toast.error("Failed to sync to server, saved locally");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Top bar: tag + controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full border ${TAG_COLORS[sel.tag] || ""}`}>
            {(() => { const Icon = TAG_ICONS[sel.tag] || BookOpen; return <Icon size={12} />; })()}{sel.tag}
          </span>
          <span className="text-[11px] text-white/40">{sel.author} · {sel.date} · {sel.readTime}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview / Raw toggle */}
          <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: "rgba(255,255,255,0.04)",border: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => { setArticleMd(editContent || articleMd || sel.content); setViewMode("preview"); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 flex items-center gap-1.5 ${viewMode === "preview"
                  ? "text-white shadow-[0_0_15px_rgba(76,201,240,0.2)] border border-blue-400/20"
                  : "text-white/40 hover:text-white/70"
                }`}
              style={viewMode === "preview" ? { background: "linear-gradient(135deg, rgba(76,201,240,0.2), rgba(123,47,247,0.12))" } : {}}>
              <Eye size={12} /> Preview
            </button>
            <button
              onClick={() => { setEditContent(articleMd || sel.content); setViewMode("raw"); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 flex items-center gap-1.5 ${viewMode === "raw"
                  ? "text-white shadow-[0_0_15px_rgba(76,201,240,0.2)] border border-blue-400/20"
                  : "text-white/40 hover:text-white/70"
                }`}
              style={viewMode === "raw" ? { background: "linear-gradient(135deg, rgba(76,201,240,0.2), rgba(123,47,247,0.12))" } : {}}>
              <FileText size={12} /> Raw
            </button>
          </div>

          {/* Save (visible in raw mode — directly editable) */}
          {viewMode === "raw" && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.25), rgba(123,47,247,0.2))",border: "1px solid rgba(76,201,240,0.2)" }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Render area */}
      <div className="transition-all duration-300">
        {viewMode === "preview" ? (
          renderedContent
        ) : (
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.06)",background: "rgba(0,0,0,0.25)" }}>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full min-h-[400px] p-5 text-[13px] leading-[1.7] outline-none resize-none scrollbar-none"
              style={{ background: "transparent",color: "rgba(255,255,255,0.8)",fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
            />
          </div>
        )}
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
    </div>
  );
};
