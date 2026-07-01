import { Zap, Headphones, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTilt } from "@/hooks/useTilt";

const quickActions = [
  { icon: Zap, label: "New Campaign", color: "from-neon-purple to-neon-pink" },
  { icon: FileText, label: "Generate Report", color: "from-neon-cyan to-neon-blue" },
  { icon: Calendar, label: "Schedule Meeting", color: "from-neon-green to-neon-cyan" },
  { icon: Headphones, label: "Contact Support", color: "from-neon-pink to-neon-purple" },
];

const ring = (value: number, color: string) => {
  const r = 36, c = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" className="-rotate-90">
      <circle cx="48" cy="48" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
      <circle
        cx="48" cy="48" r={r}
        stroke={color} strokeWidth="6" fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (value / 100) * c}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </svg>
  );
};

const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const tilt = useTilt(5);
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className={className}
    >
      {children}
    </div>
  );
};

export const PerformanceWidgets = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
    {/* Performance Ring */}
    <TiltCard className="glass glass-hover noise rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl bg-gradient-to-br from-neon-purple to-neon-cyan" />
      <p className="text-xs text-white/40 font-medium tracking-widest uppercase mb-1">Performance</p>
      <h4 className="text-lg font-semibold mb-4">System Health</h4>
      <div className="flex items-center gap-5">
        <div className="relative">
          {ring(87, "hsl(270, 95%, 65%)")}
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-2xl font-bold leading-none">87</p>
              <p className="text-[9px] text-white/40 mt-0.5">SCORE</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-xs">
          {[
            { l: "CPU", v: "42%", c: "bg-neon-cyan" },
            { l: "Memory", v: "68%", c: "bg-neon-purple" },
            { l: "Network", v: "12ms", c: "bg-neon-green" },
          ].map((s) => (
            <div key={s.l} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${s.c}`} />
              <span className="text-white/50 flex-1">{s.l}</span>
              <span className="font-semibold">{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </TiltCard>

    {/* Quick Actions */}
    <TiltCard className="glass glass-hover noise rounded-3xl p-6">
      <p className="text-xs text-white/40 font-medium tracking-widest uppercase mb-1">Shortcuts</p>
      <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-2.5">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              className="group glass rounded-2xl p-3 flex flex-col items-start gap-2 hover:bg-white/8 active:scale-[0.97] transition-all hover:-translate-y-0.5"
              onClick={() => toast.success(`${a.label}`, { description: "Action triggered successfully" })}
            >
              <div className={`w-9 h-9 rounded-[50%]
bg-gradient-to-br ${a.color} grid place-items-center group-hover:scale-110 transition-transform shadow-lg`}>
                <Icon size={14} />
              </div>
              <span className="text-xs font-medium text-left">{a.label}</span>
            </button>
          );
        })}
      </div>
    </TiltCard>

    {/* Top Sources */}
    <TiltCard className="glass glass-hover noise rounded-3xl p-6 relative overflow-hidden">
      <p className="text-xs text-white/40 font-medium tracking-widest uppercase mb-1">Traffic</p>
      <h4 className="text-lg font-semibold mb-4">Top Sources</h4>
      <div className="space-y-3">
        {[
          { name: "Organic Search", v: 42, c: "from-neon-purple to-neon-pink" },
          { name: "Direct", v: 28, c: "from-neon-cyan to-neon-blue" },
          { name: "Social Media", v: 18, c: "from-neon-green to-neon-cyan" },
          { name: "Referral", v: 12, c: "from-neon-pink to-neon-purple" },
        ].map((s) => (
          <div key={s.name}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/70">{s.name}</span>
              <span className="font-semibold tabular-nums">{s.v}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${s.c}`} style={{ width: `${s.v * 2}%` }} />
            </div>
          </div>
        ))}
      </div>
    </TiltCard>
  </div>
);
