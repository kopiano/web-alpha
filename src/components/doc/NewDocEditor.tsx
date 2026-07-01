import { useState, useMemo, useRef, useEffect } from "react";
import { Eye, Save, ChevronDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { renderMarkdown } from "@/components/doc/DocRenderer";
import { saveDoc } from "@/api/doc";
import { useNotifications } from "@/components/dashboard/NotificationProvider";

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
  onSaved?: () => void;
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
          backdropFilter: "blur(40px)",
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
export const NewDocEditor = ({ onClose, onSaved }: NewDocEditorProps) => {
  const { push: pushNotification } = useNotifications();
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [title, setTitle] = useState("");

  const rendered = useMemo(() => {
    if (!content) return null;
    return renderMarkdown(content);
  }, [content]);

  const selectedColor = TAGS.find(([t]) => t === selectedTag)?.[1];

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
      await saveDoc({ tag: selectedTag!.toLowerCase(), title: finalTitle, content });
      pushNotification(`New doc: ${finalTitle}`);
      toast.success("Document saved");
      setContent("");
      setPreview(false);
      onSaved?.();
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
            <h2 className="text-base font-semibold text-white/80">New Document</h2>
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
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    {TAGS.map(([label, color]) => (
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
                    ))}
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
