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
  { icon: LayoutDashboard, label: "Overview" },
  { icon: BarChart3, label: "Analytics" },
  { icon: FileText, label: "Docs" },
  { icon: Users, label: "User" },
  { icon: Sparkles, label: "AI Insights" },
  { icon: MessageSquare, label: "Chat" },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveFromPath = () => {
    if (location.pathname === "/analytics") return 1; // Analytics
    if (location.pathname === "/chat") return 5; // Messages
    if (location.pathname === "/docs") return 2; // Docs
    if (location.pathname === "/user") return 3; // User
    return 0; // Overview (dashboard)
  };

  const [active, setActive] = useState(getActiveFromPath);

  useEffect(() => {
    setActive(getActiveFromPath());
  }, [location.pathname]);

  const handleClick = (index: number, label: string) => {
    setActive(index);
    if (label === "Analytics") {
      navigate("/analytics");
    } else if (label === "Chat") {
      navigate("/chat");
    } else if (label === "Docs") {
      navigate("/docs");
    } else if (label === "User") {
      navigate("/user");
    } else if (location.pathname !== "/") {
      navigate("/");
    }
  };

  return (
    <aside className="fixed left-4 top-[calc(50%-200px)] -translate-y-1/2 z-30 hidden lg:block animate-slide-left">
      <div className="rounded-[2rem] p-2.5 flex flex-col items-center gap-[3px]" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))", backdropFilter: "blur(40px) saturate(160%)", boxShadow: "0 30px 80px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255,255,255,0.1), inset 0 -1px 0 0 rgba(255,255,255,0.03)" }}>
        {/* Nav Items */}
        {items.map((it, i) => {
          const Icon = it.icon;
          const isActive = active === i;
          return (
            <button
              key={it.label}
              onClick={() => handleClick(i, it.label)}
              className={`group relative w-10 h-10 rounded-[50%] grid place-items-center transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-br from-neon-purple/30 to-neon-cyan/20 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              aria-label={it.label}
              style={{ transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-neon-purple to-neon-cyan shadow-[0_0_10px_hsl(var(--neon-purple)/0.6)]" />
              )}
              <Icon size={16} strokeWidth={1.8} />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-[50%] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px]"
                style={{ background: "rgba(255, 255, 255, 0.04)", backdropFilter: "blur(32px)", color: "rgba(255,255,255,0.7)" }}>
                {it.label}
              </span>
              {/* Hover glow ring */}
              <span
                className="absolute inset-0 rounded-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  boxShadow: "0 0 15px -3px hsl(var(--neon-purple) / 0.3)",
                }}
              />
            </button>
          );
        })}

      </div>
    </aside>
  );
};
