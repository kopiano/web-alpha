import { useState, useMemo, useRef, useEffect } from "react";
import { Eye, Save, ChevronDown, Loader2, X, Eye as PublicEye, Lock } from "lucide-react";
import { toast } from "sonner";
import { renderMarkdown } from "@/components/doc/DocRenderer";
import { createDoc } from "@/api/doc";
import type { Article } from "@/components/doc/docsData";
import { DOC_CATEGORIES } from "@/config/docs";
import { resolveImageAvatar } from "@/lib/avatar";

const TAGS = [
  ["Frontend", "#a78bfa"],
  ["Backend", "#22d3ee"],
  ["Database", "#60a5fa"],
  ["DevOps", "#f59e0b"],
  ["API", "#f472b6"],
  ["Resources", "#34d399"],
] as const;

interface NewDocEditorProps {
  onClose: () => void;
  onSaved?: (article?: Article) => void | Promise<void>;
  currentUserId: number | null;
  initialVisibility: number;
  allowPrivate: boolean;
  initialEditPermission: number;
  allowOwnerOnly: boolean;
}

/* ─── Custom title dialog ─── */
interface TitleDialogProps {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const TitleDialog = ({ open, value, onChange, onSubmit, onCancel }: TitleDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div
        className="relative w-[380px] p-7 rounded-2xl animate-dropdown-in"
        style={{
          background: "linear-gradient(135deg, rgba(20,14,30,0.95), rgba(30,18,48,0.92))",
          backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 20px 60px -10px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.1)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white/90">Document title</h3>
          <button onClick={onCancel} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={14} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onSubmit(); }}
          placeholder="Untitled"
          className="w-full h-10 px-4 rounded-xl text-sm text-white/90 outline-none transition-all duration-200 placeholder:text-white/20"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(56,189,248,0.4)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 transition-all"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg text-[11px] font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.25), rgba(123,47,247,0.2))", border: "1px solid rgba(76,201,240,0.2)" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── NewDocEditor ─── */
export const NewDocEditor = ({ onClose, onSaved, currentUserId, initialVisibility, allowPrivate, initialEditPermission, allowOwnerOnly }: NewDocEditorProps) => {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState(initialVisibility);
  const [editPermission, setEditPermission] = useState(initialEditPermission);

  useEffect(() => {
    setVisibility(initialVisibility);
  }, [initialVisibility]);

  useEffect(() => {
    if (!allowPrivate) setVisibility(1);
  }, [allowPrivate]);

  useEffect(() => {
    setEditPermission(initialEditPermission);
  }, [initialEditPermission]);

  useEffect(() => {
    if (!allowOwnerOnly) setEditPermission(1);
  }, [allowOwnerOnly]);

  const rendered = useMemo(() => {
    if (!content) return null;
    return renderMarkdown(content);
  }, [content]);

  const selectedColor = TAGS.find(([t]) => t === selectedTag)?.[1];
  const visibilityOptions = [
    { value: 0, label: "Private", Icon: Lock },
    { value: 1, label: "Public", Icon: PublicEye },
  ];
  const editPermissionOptions = [
    { value: 0, label: "Owner", Icon: Lock },
    { value: 1, label: "Public", Icon: PublicEye },
  ];

  const handleSaveClick = () => {
    if (!content.trim()) { toast.error("Content is empty"); return; }
    if (!selectedTag) { toast.error("Please select a tag"); return; }
    setTitle("");
    setShowTitle(true);
  };

  const handleConfirmTitle = async () => {
    const finalTitle = title.trim() || "Untitled";
    setShowTitle(false);
    setSaving(true);
    try {
      const now = new Date();
      const pad = (part: number) => String(part).padStart(2, "0");
      const nowText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const submittedVisibility = allowPrivate ? visibility : 1;
      const submittedEditPermission = allowOwnerOnly ? editPermission : 1;
      const saved = await createDoc({
        category: selectedTag!.toLowerCase(),
        title: finalTitle,
        content,
        visibility: submittedVisibility,
        edit_permission: submittedEditPermission,
        editor_user_id: currentUserId ?? undefined,
      });
      const created = saved.data?.data || {};
      toast.success("Document saved");
      setContent("");
      setPreview(false);
      await onSaved?.({
        id: created.id,
        userId: Number(created.user_id ?? created.userId ?? 0) || undefined,
        visibility: Number(created.visibility ?? submittedVisibility),
        title: created.title || finalTitle,
        desc: created.excerpt || content.split("\n").slice(1, 3).join(" ").replace(/[#*`]/g, "").trim().slice(0, 100) || "Documentation file.",
        tag: (created.category || selectedTag!) as string,
        readTime: `${Math.max(1, Math.floor((content.length || 0) / 3000 * 5) || 5)} min`,
        date: String(created.created_at || nowText).slice(0, 10),
        createdAt: created.created_at || nowText,
        updatedAt: created.updated_at || nowText,
        time: created.updated_at || nowText,
        path: String(created.id || ""),
        updatedDaysAgo: 0,
        md: created.content || content,
        featured: false,
        author: created.author || "Guest",
        avatar: created.avatar || "",
        avatarUrl: resolveImageAvatar(created.avatar_url || created.avatarUrl || created.avatar || created.author_avatar) || "",
        editorAvatar: created.editor_avatar || created.editorAvatar || created.avatar || "",
        editorAvatarUrl: resolveImageAvatar(created.editor_avatar_url || created.editorAvatarUrl || created.avatar_url || created.avatarUrl || created.avatar || created.author_avatar) || "",
        contributors: Array.isArray(created.contributors) ? created.contributors : [Number(created.user_id ?? currentUserId ?? 0) || 0],
        comments: 0,
        content: created.content || content,
        excerpt: created.excerpt || "",
      });
      onClose();
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TitleDialog
        open={showTitle}
        value={title}
        onChange={setTitle}
        onSubmit={handleConfirmTitle}
        onCancel={() => setShowTitle(false)}
      />
      <div className="max-w-3xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {visibilityOptions.map(({ value, label, Icon }) => {
                const active = visibility === value;
                const disabled = !allowPrivate && value === 0;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setVisibility(value)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      active ? "text-white bg-white/10" : "text-white/40 hover:text-white/70"
                    } ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {editPermissionOptions.map(({ value, label, Icon }) => {
                const active = editPermission === value;
                const disabled = !allowOwnerOnly && value === 0;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setEditPermission(value)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      active ? "text-white bg-white/10" : "text-white/40 hover:text-white/70"
                    } ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Tag selector */}
            <div className="relative">
              <button
                onClick={() => setTagOpen(!tagOpen)}
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all duration-200"
                style={{
                  borderColor: selectedColor ? `${selectedColor}50` : "rgba(255,255,255,0.1)",
                  background: selectedColor ? `${selectedColor}18` : "rgba(255,255,255,0.04)",
                  color: selectedColor || "rgba(255,255,255,0.5)",
                }}
              >
                {selectedTag || "Tag"}
                <ChevronDown size={10} className={`transition-transform duration-200 ${tagOpen ? "rotate-180" : ""}`} />
              </button>
              {tagOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTagOpen(false)} />
                  <div
                    className="absolute top-full mt-1.5 left-0 z-20 p-1 rounded-xl min-w-[130px]"
                    style={{
                      background: "rgba(16,10,28,0.95)",
                      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    {DOC_CATEGORIES.map((label, index) => {
                      const color = TAGS[index][1];
                      return (
                      <button
                        key={label}
                        onClick={() => { setSelectedTag(label); setTagOpen(false); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 flex items-center gap-2"
                        style={{ color }}
                        onMouseEnter={(e) => e.currentTarget.style.background = `${color}15`}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        {label}
                      </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                preview
                  ? "text-white shadow-[0_0_15px_rgba(76,201,240,0.2)] border border-blue-400/20"
                  : "text-white/40 hover:text-white/70 border border-white/[0.06]"
              }`}
              style={preview ? { background: "linear-gradient(135deg, rgba(76,201,240,0.2), rgba(123,47,247,0.12))" } : { background: "rgba(255,255,255,0.03)" }}
            >
              <Eye size={12} /> Preview
            </button>
            <button
              onClick={handleSaveClick}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.25), rgba(123,47,247,0.2))", border: "1px solid rgba(76,201,240,0.2)" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Editor / Preview area */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
          {preview ? (
            <div className="p-6 min-h-[400px]">{rendered}</div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your markdown here..."
              className="w-full min-h-[400px] p-5 text-[13px] leading-[1.7] outline-none resize-none scrollbar-none"
              style={{ background: "transparent", color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
            />
          )}
        </div>
      </div>
    </>
  );
};
