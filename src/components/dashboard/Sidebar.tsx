import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  Sparkles,
  MessageSquare,
} from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: FileText, label: "Docs", path: "/docs" },
  { icon: Users, label: "User", path: "/user" },
  { icon: Sparkles, label: "AI Insights", path: "/" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveFromPath = () => {
    if (location.pathname === "/analytics") return 1;
    if (location.pathname === "/chat") return 5;
    if (location.pathname === "/docs") return 2;
    if (location.pathname === "/user") return 3;
    return 0;
  };

  const [active, setActive] = useState(getActiveFromPath);

  useEffect(() => {
    setActive(getActiveFromPath());
  }, [location.pathname]);

  const handleClick = (index: number) => {
    setActive(index);
    navigate(items[index].path);
  };

  return (
    <>
      {/* Desktop sidebar — unchanged */}
      <aside className="fixed left-4 top-[calc(50%-200px)] -translate-y-1/2 z-30 hidden lg:block animate-slide-left">
        <div
          className="rounded-[2rem] p-2.5 flex flex-col items-center gap-[3px]"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
            backdropFilter: "blur(40px) saturate(160%)",
            WebkitBackdropFilter: "blur(40px) saturate(160%)",
            boxShadow: "0 30px 80px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255,255,255,0.1), inset 0 -1px 0 0 rgba(255,255,255,0.03)",
          }}
        >
          {items.map((it, i) => {
            const Icon = it.icon;
            const isActive = active === i;
            return (
              <button
                key={it.label}
                onClick={() => handleClick(i)}
                className={`group relative w-10 h-10 rounded-[50%] grid place-items-center transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-neon-purple/30 to-neon-cyan/20 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
                aria-label={it.label}
              >
                {isActive && (
                  <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-neon-purple to-neon-cyan shadow-[0_0_10px_hsl(var(--neon-purple)/0.6)]" />
                )}
                <Icon size={16} strokeWidth={1.8} />
                <span
                  className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(32px)",
                    WebkitBackdropFilter: "blur(32px)",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* iOS‑style mobile bottom nav — light frosted glass, icons only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: "rgba(195,195,210,0.12)",
          backdropFilter: "blur(50px) saturate(180%)",
          WebkitBackdropFilter: "blur(50px) saturate(180%)",
          borderTop: "0.5px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="flex items-center justify-around px-3 md:px-4 py-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 10px), 10px)" }}>
          {items.map((it, i) => {
            const Icon = it.icon;
            const isActive = active === i;
            return (
              <button
                key={it.label}
                onClick={() => handleClick(i)}
                aria-label={it.label}
                className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 active:scale-90"
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                    }}
                  />
                )}
                <Icon
                  size={isActive ? 22 : 20}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className="relative z-10 transition-all duration-200"
                  style={{
                    color: isActive
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.38)",
                  }}
                />
                {/* Active bottom dot */}
                {isActive && (
                  <span
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
