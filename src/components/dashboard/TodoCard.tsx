import { useState, useEffect, useMemo } from "react";
import { useDeferredEffect } from "@/hooks/useDeferredEffect";
import { Plus, Check, Trash2, Circle, Loader2, Globe } from "lucide-react";
import { createTodo, getTodos, updateTodo, deleteTodo } from "@/api/task";
import { useAuth } from "@/components/dashboard/AuthProvider";

interface Todo {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  active: boolean;
}

const priorityColors: Record<string, string> = {
  high: "bg-neon-pink/60 shadow-[0_0_6px_hsl(var(--neon-pink)/0.5)]",
  medium: "bg-neon-cyan/60 shadow-[0_0_6px_hsl(var(--neon-cyan)/0.5)]",
  low: "bg-white/20",
};

const priorityBadge: Record<string, string> = {
  high: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  medium: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
  low: "text-white/30 bg-white/5 border-white/10",
};

export const TodoCard = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<Todo["priority"]>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const scopeKey = useMemo(() => user?.id ?? "guest", [user?.id]);

  useDeferredEffect(() => {
    getTodos()
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        setTodos(Array.isArray(raw) ? raw : [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [scopeKey])

  const add = async () => {
    const text = input.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const res = await createTodo({ title: text, priority: selectedPriority, active: true });
      const created = res.data?.data ?? res.data;
      const item = {
        id: created?.id ?? 0,
        title: created?.title ?? text,
        priority: created?.priority ?? selectedPriority,
        active: created?.active ?? true,
      }
      if (item.id) {
        setTodos((prev) => [...prev, item]);
      } else {
        const maxId = todos.reduce((m, t) => Math.max(m, t.id), 0);
        setTodos((prev) => [...prev, { id: maxId + 1, title: text, priority: selectedPriority, active: true }]);
      }
      setInput("");
    } catch {
      // keep locally
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = todos.filter((t) => t.active).length;
  const total = todos.length;

  return (
    <div className="glass glass-hover noise rounded-[28px] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[16px] bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center shadow-[0_10px_24px_rgba(236,72,153,0.22)]">
            <Circle size={12} fill="currentColor" className="text-white/80" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 font-medium tracking-[0.18em] uppercase">
              Tasks
            </p>
            <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-white/90">To Do</h4>
          </div>
        </div>
        <span className="text-[10px] text-white/30 tabular-nums">
          {total - remaining}/{total} Done
        </span>
      </div>

      {/* Add input + priority selector */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={user ? "Add a task for your account..." : "Add a guest task..."}
          className="flex-1 h-11 bg-white/[0.045] rounded-2xl px-4 text-[13px] tracking-[0.01em] text-white/88 outline-none placeholder:text-white/18 border border-white/[0.06] focus:bg-white/[0.065] focus:border-white/12 focus:ring-1 focus:ring-neon-purple/15 transition-all"
        />
        <button
          onClick={() => {
            const order: Todo["priority"][] = ["medium", "high", "low"];
            const idx = order.indexOf(selectedPriority);
            setSelectedPriority(order[(idx + 1) % order.length]);
          }}
          className={`w-[72px] h-11 px-3 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.12em] border transition-all ${
            selectedPriority === "high"
              ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
              : selectedPriority === "medium"
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
              : "bg-white/10 text-white/50 border-white/20"
          }`}
        >
          {selectedPriority === "high" ? "high" : selectedPriority === "medium" ? "medium" : "low"}
        </button>
        <button
          onClick={add}
          disabled={submitting}
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan grid place-items-center hover:scale-[1.03] active:scale-95 transition-transform shadow-[0_12px_30px_rgba(139,92,246,0.28)] disabled:opacity-50"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        </button>
      </div>

      {/* Todo list */}
      <div className="space-y-1">
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 rounded-md bg-white/5" />
                <div className="flex-1 h-4 rounded-lg bg-white/5" />
                <div className="w-8 h-3 rounded-md bg-white/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-6 text-white/30">
            <Globe size={24} />
            <p className="text-xs">加载失败</p>
          </div>
        ) : todos.length === 0 ? (
          <p className="text-center text-xs text-white/20 py-6">还没有任务</p>
        ) : (
          todos.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-3 rounded-2xl
transition-all duration-200 group ${
                !t.active ? "opacity-40" : "hover:bg-white/5"
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => {
                  updateTodo(t.id, { active: !t.active })
                  setTodos((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x))
                  )
                }}
                className={`w-5 h-5 rounded-md grid place-items-center shrink-0 transition-all duration-200 border ${
                  !t.active
                    ? "bg-neon-cyan/30 border-neon-cyan/50"
                    : "border-white/15 hover:border-white/30"
                }`}
              >
                {!t.active && <Check size={10} className="text-neon-cyan" />}
              </button>

              {/* Title */}
              <span
                className={`text-[13px] leading-snug flex-1 transition-all ${
                  !t.active
                    ? "line-through text-white/25"
                    : "text-white/80"
                }`}
              >
                {t.title}
              </span>

              {/* Priority dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[t.priority]}`}
              />

              {/* Priority badge */}
              <span
                className={`text-[9px] font-medium px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-[0.08em] ${
                  priorityBadge[t.priority]
                }`}
              >
                {t.priority}
              </span>

              {/* Delete */}
              <button
                onClick={() => {
                  deleteTodo(t.id)
                  setTodos((prev) => prev.filter((x) => x.id !== t.id))
                }}
                className="w-6 h-6 rounded-lg grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all shrink-0"
              >
                <Trash2 size={10} className="text-white/30" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
