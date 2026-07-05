import { useState, useEffect } from "react";
import { useDeferredEffect } from "@/hooks/useDeferredEffect";
import { Plus, Check, Trash2, Circle, Loader2, Globe } from "lucide-react";
import { createTodo, getTodos, updateTodo, deleteTodo } from "@/api/hotSearch";

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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<Todo["priority"]>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useDeferredEffect(() => {
    getTodos()
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        setTodos(Array.isArray(raw) ? raw : [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

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
    <div className="glass glass-hover noise rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[50%]
bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center shadow-lg">
            <Circle size={12} fill="currentColor" className="text-white/80" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-medium tracking-widest uppercase">
              Tasks
            </p>
            <h4 className="text-sm font-semibold">To Do</h4>
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
          placeholder="Add a task..."
          className="flex-1 bg-white/5 rounded-xl
px-3 py-2 text-xs outline-none placeholder:text-white/20 focus:bg-white/8 focus:ring-1 focus:ring-neon-purple/20 transition-all"
        />
        <button
          onClick={() => {
            const order: Todo["priority"][] = ["medium", "high", "low"];
            const idx = order.indexOf(selectedPriority);
            setSelectedPriority(order[(idx + 1) % order.length]);
          }}
          className={`w-16 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
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
          className="w-8 h-8 rounded-[50%]
bg-gradient-to-br from-neon-purple to-neon-cyan grid place-items-center hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
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
              className={`flex items-center gap-3 p-2.5 rounded-xl
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
                className={`text-xs flex-1 transition-all ${
                  !t.active
                    ? "line-through text-white/25"
                    : "text-white/80"
                }`}
              >
                {t.title}
              </span>

              {/* Priority dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColors[t.priority]}`}
              />

              {/* Priority badge */}
              <span
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
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
