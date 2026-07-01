import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, MessageCircle, HelpCircle, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { fetchFaqs, addFaq } from "@/api/faq";

/* ─── Types ─── */
interface FaqItem {
  id: number;
  title: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  created_at?: string;
}

/* ─── Category colors (matching doc page palette) ─── */
const CAT_COLORS: Record<string, string> = {
  Backend: "#22d3ee",
  Frontend: "#a78bfa",
  Database: "#60a5fa",
  DevOps: "#f59e0b",
  API: "#f472b6",
  Resources: "#34d399",
};

function getCatColor(cat: string): string {
  return CAT_COLORS[cat] || "#94a3b8";
}

/* ─── Fallback data ─── */
const FALLBACK_FAQS: FaqItem[] = [
  {
    id: 1, title: "What is Go and why was it created?",
    answer: "Go (Golang) is a statically typed, compiled programming language designed at Google by Robert Griesemer, Rob Pike, and Ken Thompson.\n\nIt was created to address the challenges of large-scale software development at Google:\n- Slow compilation speeds\n- Cumbersome dependency management\n- The complexity of C++ and Java\n\nGo combines the performance of a compiled language with the simplicity of a scripting language, featuring goroutines for lightweight concurrency, a rich standard library, and built-in tooling for formatting, testing, and dependency management.",
    difficulty: "easy", category: "Backend",
  },
  {
    id: 2, title: "How does goroutine scheduling work?",
    answer: "Goroutines are lightweight threads managed by the Go runtime (not the OS). The runtime uses an M:N scheduler, multiplexing M goroutines onto N OS threads.\n\nIt employs a work-stealing algorithm where idle processors steal work from busy ones, and supports cooperative preemption.\n\nGo's scheduler uses three key abstractions:\n- G (goroutine)\n- M (machine / OS thread)\n- P (processor / logical CPU)\n\nThe number of P's is set by GOMAXPROCS (defaults to the number of CPU cores). Goroutines are extremely cheap — you can spawn hundreds of thousands with minimal overhead compared to OS threads.",
    difficulty: "medium", category: "Backend",
  },
  {
    id: 3, title: "What is the difference between a pointer receiver and a value receiver?",
    answer: "A value receiver receives a copy of the struct, so modifications to the receiver won't affect the original value. A pointer receiver receives a pointer to the original struct, so modifications are reflected in the caller.\n\nUse pointer receivers when:\n1. The method needs to modify the receiver\n2. The struct is large and copying would be expensive\n3. For consistency if other methods on the same type use pointer receivers\n\nUse value receivers for small, immutable types where copying is inexpensive and you want to guarantee no mutation.",
    difficulty: "medium", category: "Backend",
  },
  {
    id: 4, title: "When should I use channels vs mutexes?",
    answer: "Use channels when you need to communicate between goroutines — passing data ownership, signaling completion, or coordinating work.\n\nUse mutexes (sync.Mutex, sync.RWMutex) when you need to protect shared state accessed by multiple goroutines without passing ownership.\n\nThe Go proverb \"Do not communicate by sharing memory; instead, share memory by communicating\" suggests channels as the default, but mutexes are often simpler and more performant for caches, counters, and simple shared state.\n\nIn practice:\n- Channels excel at orchestrating pipelines and work distribution\n- Mutexes excel at guarding data structures",
    difficulty: "hard", category: "Backend",
  },
  {
    id: 5, title: "How does Go handle error management?",
    answer: "Go uses explicit error handling rather than exceptions. Functions return errors as a second return value, and callers check them immediately.\n\nCommon patterns:\n1. if err != nil { return err } — the most basic propagation\n2. Wrapping errors with fmt.Errorf(\"...: %w\", err) to add context while preserving the original error for errors.Is / errors.As\n3. Defining custom error types\n4. Using defer with named return values for cleanup\n5. Handling errors at the highest appropriate level rather than logging at every layer\n\nGo 1.13+ introduced errors.Is() and errors.As() for error chain inspection.\nGo 1.20+ added errors.Join() for combining multiple errors.",
    difficulty: "easy", category: "Backend",
  },
  {
    id: 6, title: "What is the sync.Pool and when should I use it?",
    answer: "sync.Pool is a concurrent-safe object pool that caches temporary objects for reuse, reducing GC pressure.\n\nIt's ideal for short-lived allocations that are created frequently — byte buffers, temporary structs, or worker objects.\n\nKey behaviors:\n- Objects in the pool can be garbage collected between GC cycles (so never rely on pool content)\n- Get() returns nil if the pool is empty\n- Always call Put() to return objects after use\n\nUse sync.Pool when:\n1. You allocate the same type frequently in hot paths\n2. Each object is independent (no cross-object state)\n3. You're okay with objects being occasionally recreated\n\nAvoid for long-lived objects or when pooling adds more complexity than the GC savings.",
    difficulty: "hard", category: "Backend",
  },
];

/* ─── Modal ─── */
interface FaqDialogProps {
  open: boolean;
  title: string;
  answer: string;
  difficulty: FaqItem["difficulty"];
  category: string;
  loading: boolean;
  onTitleChange: (v: string) => void;
  onAnswerChange: (v: string) => void;
  onDifficultyChange: (v: FaqItem["difficulty"]) => void;
  onCategoryChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const DIFFICULTY_OPTIONS: { value: FaqItem["difficulty"]; label: string; color: string; activeBg: string }[] = [
  { value: "easy", label: "Easy", color: "#4ade80", activeBg: "rgba(74,222,128,0.12)" },
  { value: "medium", label: "Medium", color: "#fb923c", activeBg: "rgba(251,146,60,0.12)" },
  { value: "hard", label: "Hard", color: "#f87171", activeBg: "rgba(248,113,113,0.12)" },
];

const FaqDialog = ({
  open, title, answer, difficulty, category, loading,
  onTitleChange, onAnswerChange, onDifficultyChange, onCategoryChange,
  onSubmit, onCancel,
}: FaqDialogProps) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const [selectedDiff, setSelectedDiff] = useState<FaqItem["difficulty"]>(difficulty);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
      setSelectedDiff(difficulty);
    }
  }, [open, difficulty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  const handleDifficultySelect = (value: FaqItem["difficulty"]) => {
    setSelectedDiff(value);
    onDifficultyChange(value);
  };

  const handleConfirmClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    setTimeout(() => onSubmit(), 100);
  };

  if (!open) return null;

  const isValid = title.trim().length > 0 && answer.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        onClick={onCancel}
      />

      <div
        className="relative w-[540px] max-h-[85vh] rounded-[20px] flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(22,16,34,0.96) 0%, rgba(18,12,28,0.94) 50%, rgba(24,14,42,0.96) 100%)",
          backdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: [
            "0 0 0 1px rgba(255,255,255,0.02) inset",
            "0 24px 80px -16px rgba(0,0,0,0.7)",
            "0 0 60px rgba(123,47,247,0.08)",
            "0 0 120px rgba(76,201,240,0.05)",
          ].join(", "),
          animation: "dialog-in 250ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-7 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl grid place-items-center"
              style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.18), rgba(123,47,247,0.14))", border: "1px solid rgba(76,201,240,0.15)" }}
            >
              <HelpCircle size={17} style={{ color: "rgba(76,201,240,0.8)" }} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-white/90 leading-none mb-0.5">New FAQ Question</h3>
              <p className="text-[10px] text-white/30 leading-none">Add a question to the knowledge base</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg grid place-items-center transition-all duration-200 hover:bg-white/[0.06] active:scale-90" style={{ color: "rgba(255,255,255,0.35)" }}>
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5 scrollbar-none">
          {/* Question */}
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.25em] mb-3 block">Question</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && isValid && !loading) handleConfirmClick(e as unknown as React.MouseEvent<HTMLButtonElement>); }}
              placeholder="e.g. What is a goroutine?"
              className="w-full h-11 px-4 rounded-[14px] text-[13px] text-white/85 outline-none transition-all duration-200 placeholder:text-white/12"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter', system-ui, sans-serif" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(76,201,240,0.4)"; e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.boxShadow = "0 0 0 3px rgba(76,201,240,0.05)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.background = "rgba(255,255,255,0.025)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Category + Difficulty */}
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.25em] mb-3 block">Category & Difficulty</label>
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <Tag size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.2)" }} />
                <input
                  type="text" value={category} onChange={(e) => onCategoryChange(e.target.value)}
                  placeholder="e.g. Backend, Frontend..."
                  className="w-full h-11 pl-9 pr-4 rounded-[14px] text-[13px] text-white/85 outline-none transition-all duration-200 placeholder:text-white/12"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter', system-ui, sans-serif" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(168,85,247,0.4)"; e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.05)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.background = "rgba(255,255,255,0.025)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <div className="flex rounded-[14px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {DIFFICULTY_OPTIONS.map((opt, idx) => {
                  const isActive = selectedDiff === opt.value;
                  return (
                    <button
                      key={opt.value} type="button" onClick={() => handleDifficultySelect(opt.value)}
                      className="h-11 px-3.5 text-[11px] font-medium transition-all duration-200 active:scale-95"
                      style={{
                        background: isActive ? opt.activeBg : "rgba(255,255,255,0.02)",
                        color: isActive ? opt.color : "rgba(255,255,255,0.3)",
                        borderRight: idx < DIFFICULTY_OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-[5px] h-[5px] rounded-full transition-colors duration-200" style={{ background: isActive ? opt.color : "rgba(255,255,255,0.15)" }} />
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Answer */}
          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.25em] mb-3 block">Answer</label>
            <textarea
              value={answer} onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Write a clear, concise answer...\n\nUse blank lines to separate paragraphs."
              rows={5}
              className="w-full px-4 py-3.5 rounded-[14px] text-[13px] text-white/85 outline-none transition-all duration-200 placeholder:text-white/12 resize-none"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter', system-ui, sans-serif", lineHeight: "1.75" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(76,201,240,0.4)"; e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.boxShadow = "0 0 0 3px rgba(76,201,240,0.05)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.background = "rgba(255,255,255,0.025)"; e.target.style.boxShadow = "none"; }}
            />
            <p className="text-[10px] text-white/15 mt-2 text-right tabular-nums">{answer.length} characters</p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-7 py-4 flex items-center justify-end gap-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-[12px] text-[12px] font-medium transition-all duration-200 hover:text-white/70 active:scale-95"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={!isValid || loading}
            className="relative h-9 px-5 rounded-[12px] text-[12px] font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-2 overflow-hidden active:scale-[0.97]"
            style={{
              background: isValid ? "linear-gradient(135deg, rgba(76,201,240,0.3), rgba(123,47,247,0.25))" : "rgba(255,255,255,0.05)",
              border: isValid ? "1px solid rgba(76,201,240,0.3)" : "1px solid rgba(255,255,255,0.05)",
              color: "#fff",
              boxShadow: isValid ? "0 0 20px rgba(76,201,240,0.1)" : "none",
            }}
          >
            {ripple && (
              <span key={ripple.id} className="absolute rounded-full bg-white/20 animate-ripple"
                style={{ left: ripple.x - 4, top: ripple.y - 4, width: 8, height: 8 }} />
            )}
            {loading ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
            {loading ? "Adding..." : "Add Question"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialog-in { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ripple-anim { from { transform:scale(1); opacity:1; } to { transform:scale(40); opacity:0; } }
        .animate-ripple { animation:ripple-anim 0.6s ease-out forwards; pointer-events:none; }
      `}</style>
    </div>
  );
};

/* ─── Difficulty config ─── */
const difficultyLabel: Record<FaqItem["difficulty"], string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const difficultyColor: Record<FaqItem["difficulty"], string> = { easy: "text-emerald-400/70", medium: "text-amber-400/70", hard: "text-rose-400/70" };
const difficultyDot: Record<FaqItem["difficulty"], string> = { easy: "bg-emerald-400/60", medium: "bg-amber-400/60", hard: "bg-rose-400/60" };

/* ─── FaqTab ─── */
interface FaqTabProps {
  showAddDialog?: boolean;
  onAddDialogClosed?: () => void;
  activeCat: string;
  onCategoriesChange: (cats: string[]) => void;
}

export default function FaqTab({ showAddDialog, onAddDialogClosed, activeCat, onCategoriesChange }: FaqTabProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<FaqItem["difficulty"]>("easy");
  const [newCategory, setNewCategory] = useState("");
  const fetchedRef = useRef(false);

  // Load FAQs
  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchFaqs();
      const payload = res.data?.data ?? res.data ?? [];
      if (Array.isArray(payload) && payload.length > 0) {
        setFaqs(payload);
      } else {
        setFaqs(FALLBACK_FAQS);
      }
    } catch {
      setFaqs(FALLBACK_FAQS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) { fetchedRef.current = true; loadFaqs(); }
  }, [loadFaqs]);

  // Report categories to parent
  const categories = useMemo(() => {
    const cats = new Set(faqs.map((f) => f.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [faqs]);

  useEffect(() => {
    onCategoriesChange(categories);
  }, [categories, onCategoriesChange]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    if (activeCat === "All") return faqs;
    return faqs.filter((f) => f.category === activeCat);
  }, [faqs, activeCat]);

  // Dialog
  useEffect(() => {
    if (showAddDialog) {
      setNewTitle("");
      setNewAnswer("");
      setNewDifficulty("easy");
      setNewCategory("");
      setDialogOpen(true);
    }
  }, [showAddDialog]);

  const handleDialogClose = () => { setDialogOpen(false); onAddDialogClosed?.(); };
  const toggleExpand = (id: number) => { setExpandedId((prev) => (prev === id ? null : id)); };

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newAnswer.trim()) return;
    setSubmitLoading(true);
    try {
      const res = await addFaq({
        title: newTitle.trim(),
        answer: newAnswer.trim(),
        difficulty: newDifficulty,
        category: newCategory.trim(),
      });
      const created = res.data?.data ?? res.data;
      setFaqs((prev) => [...prev, {
        id: created?.id ?? Date.now(),
        title: newTitle.trim(),
        answer: newAnswer.trim(),
        difficulty: newDifficulty,
        category: newCategory.trim() || "Uncategorized",
        created_at: created?.created_at,
      }]);
      setDialogOpen(false);
      onAddDialogClosed?.();
      toast.success("FAQ question added");
    } catch {
      toast.error("Failed to add FAQ — backend may be offline");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-[820px] mx-auto pt-8 pb-20">
      {/* Header */}
      <div className="flex flex-col items-center mb-16">
        <div className="w-16 h-[2px] rounded-full mb-8" style={{ background: "linear-gradient(90deg, transparent, rgba(76,201,240,0.5), rgba(123,47,247,0.5), transparent)" }} />
        <p className="text-[10px] font-semibold text-blue-400/40 uppercase tracking-[0.35em] mb-4">Frequently Asked Questions</p>
        <h2 className="font-serif text-[36px] font-bold leading-none tracking-tight" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.65) 50%, rgba(76,201,240,0.45) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Golang FAQ
        </h2>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-white/20" /></div>
      )}

      {/* FAQ List */}
      {!loading && filteredFaqs.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {filteredFaqs.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const num = String(idx + 1).padStart(2, "0");

            return (
              <div key={item.id} className="group/row relative" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "border-color 350ms ease" }}>
                {/* Left accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-all"
                  style={{
                    background: isExpanded ? "linear-gradient(180deg, rgba(76,201,240,0.5), rgba(123,47,247,0.4))" : "transparent",
                    opacity: isExpanded ? 1 : 0, transform: "translateX(-12px)", transitionDuration: "400ms",
                  }}
                />
                {/* Row */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center justify-between py-[22px] text-left transition-all duration-300 active:scale-[0.995]"
                  style={{ paddingLeft: "0px", paddingRight: "0px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.paddingLeft = "8px"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.paddingLeft = "0px"; }}
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <span className="text-[20px] font-[450] tabular-nums leading-none select-none shrink-0"
                      style={{ color: isExpanded ? "rgba(76,201,240,0.4)" : "rgba(255,255,255,0.18)", transition: "color 350ms ease", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", width: "2ch", textAlign: "right" }}>
                      {num}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-[20px] font-medium leading-snug transition-colors duration-300"
                        style={{ color: isExpanded ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)" }}>
                        {item.title}
                      </span>
                      {/* Category tag */}
                      {item.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: `${getCatColor(item.category)}15`, border: `1px solid ${getCatColor(item.category)}25`, color: getCatColor(item.category) }}>
                          {item.category}
                        </span>
                      )}
                      {/* Difficulty */}
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className={`inline-block w-[5px] h-[5px] rounded-full ${difficultyDot[item.difficulty]}`} />
                        <span className={`text-[11px] font-medium tracking-wider ${difficultyColor[item.difficulty]}`}>
                          {difficultyLabel[item.difficulty]}
                        </span>
                      </span>
                    </div>
                  </div>
                  {/* Toggle */}
                  <div className="shrink-0 ml-5 w-[30px] h-[30px] rounded-full grid place-items-center transition-all"
                    style={{ border: isExpanded ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.1)", background: isExpanded ? "rgba(255,255,255,0.05)" : "transparent", boxShadow: isExpanded ? "0 0 10px rgba(76,201,240,0.08)" : "none", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transitionDuration: "350ms" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: isExpanded ? 0.7 : 0.4, transitionDuration: "350ms" }}>
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" style={{ color: "rgba(255,255,255,0.7)" }} />
                    </svg>
                  </div>
                </button>
                {/* Expanded */}
                <div className="overflow-hidden" style={{ maxHeight: isExpanded ? "800px" : "0px", opacity: isExpanded ? 1 : 0, transition: "max-height 450ms cubic-bezier(0.4,0,0.2,1), opacity 350ms ease-in-out" }}>
                  <div className="pb-10 pl-0 pr-2">
                    <div className="text-[15px] leading-[1.85] max-w-[660px]" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Inter', system-ui, sans-serif", paddingLeft: "calc(2ch + 20px)", whiteSpace: "pre-line" }}>
                      {item.answer}
                    </div>
                    {item.created_at && (
                      <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.18)", paddingLeft: "calc(2ch + 20px)" }}>Added {item.created_at}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!loading && filteredFaqs.length === 0 && (
        <div className="text-center py-24" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-white/20 text-sm">No FAQ items in this category.</p>
          <p className="text-white/15 text-xs mt-1">Try selecting a different filter or add a new question.</p>
        </div>
      )}

      {/* Bottom */}
      {!loading && filteredFaqs.length > 0 && (
        <div className="flex justify-center mt-16">
          <div className="w-8 h-[1px] rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />
        </div>
      )}

      {/* Dialog */}
      <FaqDialog
        open={dialogOpen} title={newTitle} answer={newAnswer} difficulty={newDifficulty}
        category={newCategory} loading={submitLoading}
        onTitleChange={setNewTitle} onAnswerChange={setNewAnswer}
        onDifficultyChange={setNewDifficulty} onCategoryChange={setNewCategory}
        onSubmit={handleSubmit} onCancel={handleDialogClose}
      />
    </div>
  );
}
