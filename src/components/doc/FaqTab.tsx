import { useState, useRef, useEffect } from "react";
import { X, MessageCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */
interface FaqItem {
  id: number;
  title: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
}

/* ─── Initial Data ─── */
const INITIAL_FAQS: FaqItem[] = [
  {
    id: 1,
    title: "What is Go and why was it created?",
    answer:
      "Go (Golang) is a statically typed, compiled programming language designed at Google by Robert Griesemer, Rob Pike, and Ken Thompson. It was created to address the challenges of large-scale software development at Google — slow compilation speeds, cumbersome dependency management, and the complexity of C++ and Java. Go combines the performance of a compiled language with the simplicity of a scripting language, featuring goroutines for lightweight concurrency, a rich standard library, and built-in tooling for formatting, testing, and dependency management.",
    difficulty: "easy",
  },
  {
    id: 2,
    title: "How does goroutine scheduling work?",
    answer:
      "Goroutines are lightweight threads managed by the Go runtime (not the OS). The runtime uses an M:N scheduler, multiplexing M goroutines onto N OS threads. It employs a work-stealing algorithm where idle processors steal work from busy ones, and supports cooperative preemption. Go's scheduler uses three key abstractions: G (goroutine), M (machine/OS thread), and P (processor/logical CPU). The number of P's is set by GOMAXPROCS (defaults to the number of CPU cores). Goroutines are extremely cheap — you can spawn hundreds of thousands with minimal overhead compared to OS threads.",
    difficulty: "medium",
  },
  {
    id: 3,
    title: "What is the difference between a pointer receiver and a value receiver?",
    answer:
      "A value receiver receives a copy of the struct, so modifications to the receiver won't affect the original value. A pointer receiver receives a pointer to the original struct, so modifications are reflected in the caller. Use pointer receivers when: (1) the method needs to modify the receiver, (2) the struct is large and copying would be expensive, or (3) for consistency if other methods on the same type use pointer receivers. Use value receivers for small, immutable types where copying is inexpensive and you want to guarantee no mutation.",
    difficulty: "medium",
  },
  {
    id: 4,
    title: "When should I use channels vs mutexes?",
    answer:
      "Use channels when you need to communicate between goroutines — passing data ownership, signaling completion, or coordinating work. Use mutexes (sync.Mutex, sync.RWMutex) when you need to protect shared state accessed by multiple goroutines without passing ownership. The Go proverb 'Do not communicate by sharing memory; instead, share memory by communicating' suggests channels as the default, but mutexes are often simpler and more performant for caches, counters, and simple shared state. In practice, channels excel at orchestrating pipelines and work distribution; mutexes excel at guarding data structures.",
    difficulty: "hard",
  },
  {
    id: 5,
    title: "How does Go handle error management?",
    answer:
      "Go uses explicit error handling rather than exceptions. Functions return errors as a second return value, and callers check them immediately. Common patterns: (1) if err != nil { return err } — the most basic propagation, (2) wrapping errors with fmt.Errorf('...: %w', err) to add context while preserving the original error for errors.Is/errors.As, (3) defining custom error types, (4) using defer with named return values for cleanup, and (5) handling errors at the highest appropriate level rather than logging at every layer. Go 1.13+ introduced errors.Is() and errors.As() for error chain inspection, and Go 1.20+ added errors.Join() for combining multiple errors.",
    difficulty: "easy",
  },
  {
    id: 6,
    title: "What is the sync.Pool and when should I use it?",
    answer:
      "sync.Pool is a concurrent-safe object pool that caches temporary objects for reuse, reducing GC pressure. It's ideal for short-lived allocations that are created frequently — byte buffers, temporary structs, or worker objects. Key behaviors: objects in the pool can be garbage collected between GC cycles (so never rely on pool content), Get() returns nil if the pool is empty, and you should always call Put() to return objects after use. Use sync.Pool when: (1) you allocate the same type frequently in hot paths, (2) each object is independent (no cross-object state), and (3) you're okay with objects being occasionally recreated. Avoid for long-lived objects or when pooling adds more complexity than the GC savings.",
    difficulty: "hard",
  },
];

/* ─── Modal ─── */
interface FaqDialogProps {
  open: boolean;
  title: string;
  answer: string;
  difficulty: FaqItem["difficulty"];
  onTitleChange: (v: string) => void;
  onAnswerChange: (v: string) => void;
  onDifficultyChange: (v: FaqItem["difficulty"]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const DIFFICULTY_OPTIONS: { value: FaqItem["difficulty"]; label: string; color: string; activeBg: string }[] = [
  { value: "easy", label: "Easy", color: "#4ade80", activeBg: "rgba(74,222,128,0.12)" },
  { value: "medium", label: "Medium", color: "#fb923c", activeBg: "rgba(251,146,60,0.12)" },
  { value: "hard", label: "Hard", color: "#f87171", activeBg: "rgba(248,113,113,0.12)" },
];

const FaqDialog = ({ open, title, answer, difficulty, onTitleChange, onAnswerChange, onDifficultyChange, onSubmit, onCancel }: FaqDialogProps) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const [selectedDiff, setSelectedDiff] = useState<FaqItem["difficulty"]>(difficulty);

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

  if (!open) return null;

  const isValid = title.trim().length > 0 && answer.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        onClick={onCancel}
      />

      {/* Card */}
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
        {/* ─── Header ─── */}
        <div
          className="shrink-0 px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl grid place-items-center"
              style={{
                background: "linear-gradient(135deg, rgba(76,201,240,0.18), rgba(123,47,247,0.14))",
                border: "1px solid rgba(76,201,240,0.15)",
              }}
            >
              <HelpCircle size={17} style={{ color: "rgba(76,201,240,0.8)" }} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-white/90 leading-none mb-0.5">New FAQ Question</h3>
              <p className="text-[10px] text-white/30 leading-none">Add a question to the knowledge base</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg grid place-items-center transition-all duration-200 hover:bg-white/[0.06]"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-none">
          {/* Question */}
          <div>
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.25em] mb-2.5 block">
              Question
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) onSubmit();
              }}
              placeholder="e.g. What is a goroutine?"
              className="w-full h-11 px-4 rounded-[14px] text-[13px] text-white/85 outline-none transition-all duration-200 placeholder:text-white/15"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(76,201,240,0.35)";
                e.target.style.background = "rgba(255,255,255,0.05)";
                e.target.style.boxShadow = "0 0 0 3px rgba(76,201,240,0.06)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.07)";
                e.target.style.background = "rgba(255,255,255,0.03)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.25em] mb-2.5 block">
              Difficulty
            </label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isActive = selectedDiff === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDifficultySelect(opt.value)}
                    className="h-9 px-4 rounded-[12px] text-[12px] font-medium transition-all duration-200"
                    style={{
                      background: isActive ? opt.activeBg : "rgba(255,255,255,0.03)",
                      border: isActive
                        ? `1px solid ${opt.color}40`
                        : "1px solid rgba(255,255,255,0.06)",
                      color: isActive ? opt.color : "rgba(255,255,255,0.35)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ background: isActive ? opt.color : "rgba(255,255,255,0.2)" }}
                      />
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Answer */}
          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.25em] mb-2.5 block">
              Answer
            </label>
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Write a clear, concise answer..."
              rows={5}
              className="w-full px-4 py-3.5 rounded-[14px] text-[13px] text-white/85 outline-none transition-all duration-200 placeholder:text-white/15 resize-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: "1.7",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(76,201,240,0.35)";
                e.target.style.background = "rgba(255,255,255,0.05)";
                e.target.style.boxShadow = "0 0 0 3px rgba(76,201,240,0.06)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.07)";
                e.target.style.background = "rgba(255,255,255,0.03)";
                e.target.style.boxShadow = "none";
              }}
            />
            <p className="text-[10px] text-white/20 mt-1.5 text-right tabular-nums">
              {answer.length} characters
            </p>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div
          className="shrink-0 px-6 py-4 flex items-center justify-end gap-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-[12px] text-[12px] font-medium transition-all duration-200 hover:text-white/70"
            style={{
              color: "rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!isValid}
            className="h-9 px-5 rounded-[12px] text-[12px] font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-2"
            style={{
              background: isValid
                ? "linear-gradient(135deg, rgba(76,201,240,0.3), rgba(123,47,247,0.25))"
                : "rgba(255,255,255,0.05)",
              border: isValid
                ? "1px solid rgba(76,201,240,0.3)"
                : "1px solid rgba(255,255,255,0.05)",
              color: "#fff",
              boxShadow: isValid ? "0 0 20px rgba(76,201,240,0.1)" : "none",
            }}
          >
            <MessageCircle size={12} />
            Add Question
          </button>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes dialog-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

/* ─── Difficulty config ─── */
const difficultyLabel: Record<FaqItem["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const difficultyColor: Record<FaqItem["difficulty"], string> = {
  easy: "text-emerald-400/70",
  medium: "text-amber-400/70",
  hard: "text-rose-400/70",
};

const difficultyDot: Record<FaqItem["difficulty"], string> = {
  easy: "bg-emerald-400/60",
  medium: "bg-amber-400/60",
  hard: "bg-rose-400/60",
};

/* ─── FaqTab ─── */
interface FaqTabProps {
  showAddDialog?: boolean;
  onAddDialogClosed?: () => void;
}

export default function FaqTab({ showAddDialog, onAddDialogClosed }: FaqTabProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>(INITIAL_FAQS);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<FaqItem["difficulty"]>("easy");
  const nextId = useRef(INITIAL_FAQS.length + 1);

  useEffect(() => {
    if (showAddDialog) {
      setNewTitle("");
      setNewAnswer("");
      setNewDifficulty("easy");
      setDialogOpen(true);
    }
  }, [showAddDialog]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    onAddDialogClosed?.();
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = () => {
    if (!newTitle.trim() || !newAnswer.trim()) return;
    const newItem: FaqItem = {
      id: nextId.current++,
      title: newTitle.trim(),
      answer: newAnswer.trim(),
      difficulty: newDifficulty,
    };
    setFaqs((prev) => [...prev, newItem]);
    setDialogOpen(false);
    onAddDialogClosed?.();
    toast.success("FAQ question added");
  };

  return (
    <div className="max-w-[820px] mx-auto pt-8 pb-20">
      {/* ─── Header ─── */}
      <div className="flex flex-col items-center mb-20">
        {/* Decorative line */}
        <div
          className="w-16 h-[2px] rounded-full mb-8"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(76,201,240,0.5), rgba(123,47,247,0.5), transparent)",
          }}
        />
        <p className="text-[10px] font-semibold text-blue-400/40 uppercase tracking-[0.35em] mb-4">
          Frequently Asked Questions
        </p>
        <h2
          className="font-serif text-[36px] font-bold leading-none tracking-tight"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.65) 50%, rgba(76,201,240,0.45) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Golang FAQ
        </h2>
      </div>

      {/* ─── FAQ List ─── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {faqs.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const num = String(idx + 1).padStart(2, "0");

          return (
            <div
              key={item.id}
              className="group/row relative"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                transition: "border-color 350ms ease",
              }}
            >
              {/* Left accent on expand */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-all duration-400"
                style={{
                  background: isExpanded
                    ? "linear-gradient(180deg, rgba(76,201,240,0.5), rgba(123,47,247,0.4))"
                    : "transparent",
                  opacity: isExpanded ? 1 : 0,
                  transform: `translateX(-12px)`,
                }}
              />

              {/* Row */}
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full flex items-center justify-between py-[22px] text-left transition-all duration-300"
                style={{
                  paddingLeft: "0px",
                  paddingRight: "0px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.paddingLeft = "8px";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.paddingLeft = "0px";
                }}
              >
                {/* Left */}
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <span
                    className="text-[20px] font-[450] tabular-nums leading-none select-none shrink-0"
                    style={{
                      color: isExpanded ? "rgba(76,201,240,0.4)" : "rgba(255,255,255,0.18)",
                      transition: "color 350ms ease",
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontVariantNumeric: "tabular-nums",
                      width: "2ch",
                      textAlign: "right",
                    }}
                  >
                    {num}
                  </span>
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span
                      className="text-[20px] font-medium leading-snug transition-colors duration-300"
                      style={{
                        color: isExpanded ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
                      }}
                    >
                      {item.title}
                    </span>
                    {/* Difficulty — dot + label */}
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className={`inline-block w-[5px] h-[5px] rounded-full ${difficultyDot[item.difficulty]}`}
                      />
                      <span className={`text-[11px] font-medium tracking-wider ${difficultyColor[item.difficulty]}`}>
                        {difficultyLabel[item.difficulty]}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Right — toggle icon */}
                <div
                  className="shrink-0 ml-5 w-[30px] h-[30px] rounded-full grid place-items-center transition-all duration-350"
                  style={{
                    border: isExpanded
                      ? "1px solid rgba(255,255,255,0.2)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: isExpanded ? "rgba(255,255,255,0.05)" : "transparent",
                    boxShadow: isExpanded ? "0 0 10px rgba(76,201,240,0.08)" : "none",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    className="transition-all duration-350"
                    style={{
                      opacity: isExpanded ? 0.7 : 0.4,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <path
                      d="M6 1v10M1 6h10"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    />
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              <div
                className="overflow-hidden"
                style={{
                  maxHeight: isExpanded ? "400px" : "0px",
                  opacity: isExpanded ? 1 : 0,
                  transition: "max-height 450ms cubic-bezier(0.4,0,0.2,1), opacity 350ms ease-in-out",
                }}
              >
                <div className="pb-10 pl-0 pr-2">
                  <div
                    className="text-[15px] leading-[1.85] max-w-[660px]"
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontFamily: "'Inter', system-ui, sans-serif",
                      paddingLeft: "calc(2ch + 20px)",
                    }}
                  >
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {faqs.length === 0 && (
        <div
          className="text-center py-24"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-white/20 text-sm">No FAQ items yet.</p>
          <p className="text-white/15 text-xs mt-1">Click the + button above to create one.</p>
        </div>
      )}

      {/* ─── Bottom decorative closing ─── */}
      {faqs.length > 0 && (
        <div className="flex justify-center mt-16">
          <div
            className="w-8 h-[1px] rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
          />
        </div>
      )}

      {/* ─── Add FAQ Dialog ─── */}
      <FaqDialog
        open={dialogOpen}
        title={newTitle}
        answer={newAnswer}
        difficulty={newDifficulty}
        onTitleChange={setNewTitle}
        onAnswerChange={setNewAnswer}
        onDifficultyChange={setNewDifficulty}
        onSubmit={handleSubmit}
        onCancel={handleDialogClose}
      />
    </div>
  );
}
