import { BookOpen, Bookmark, Code2, Cloud, Database, Terminal, Zap } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "All Documents": Bookmark,
  Frontend: Code2,
  Backend: Cloud,
  Database: Database,
  DevOps: Terminal,
  API: Zap,
  Resources: BookOpen,
};

interface DocsSidebarProps {
  categories: { label: string; icon: React.ElementType }[];
  activeCat: number;
  setActiveCat: (i: number) => void;
  setSelectedIdx: (idx: number | null) => void;
  catCounts: number[];
  CAT_COLORS: Record<string, string>;
  visibilityFilter: "private" | "public";
  setVisibilityFilter: (value: "private" | "public") => void;
  onNavigate?: () => void;
}

export const DocsSidebar = ({ categories, activeCat, setActiveCat, setSelectedIdx, catCounts, CAT_COLORS, visibilityFilter, setVisibilityFilter, onNavigate }: DocsSidebarProps) => {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-3">
      <div className="space-y-1">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <button key={cat.label} onClick={() => { setActiveCat(i); setSelectedIdx(null); onNavigate?.(); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-300 flex items-center gap-3 ${
                i === activeCat
                  ? "text-white border border-blue-400/15"
                  : "text-white/40 hover:text-white/70 border border-transparent hover:bg-white/[0.04]"
              }`}
              style={i === activeCat ? { background: "linear-gradient(135deg, rgba(123,47,247,0.25), rgba(0,209,255,0.10))" } : {}}>
              <Icon size={16} className="shrink-0" style={{ color: CAT_COLORS[cat.label] || "rgba(255,255,255,0.6)" }} />
              <span className="flex-1">{cat.label}</span>
              <span className="text-[10px] font-medium ml-auto" style={{ color: i === activeCat ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}>
                {catCounts[i]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-white/[0.04]">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Visibility</p>
        <div className="relative grid grid-cols-2 items-center rounded-full p-1.5 bg-white/[0.05] border border-white/[0.08] overflow-hidden">
          <span
            className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.75rem)] rounded-full bg-white/[0.12] border border-white/[0.08] transition-transform duration-300 ease-out ${
              visibilityFilter === "public" ? "translate-x-[calc(100%+0.60rem)]" : "translate-x-0"
            }`}
          />
          {(["private", "public"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { setVisibilityFilter(item); setSelectedIdx(null); onNavigate?.(); }}
              className={`relative z-10 flex items-center justify-center px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ${
                visibilityFilter === item ? "text-white/90" : "text-white/35"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
