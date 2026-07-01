import { TrendingUp, Users, ShoppingBag, Zap } from "lucide-react";
import { useTilt } from "@/hooks/useTilt";

const stats = [
  { label: "Revenue", value: "$48,290", delta: "+24.1%", icon: TrendingUp, color: "from-neon-purple to-neon-pink", spark: [4, 8, 5, 9, 7, 12, 10, 14, 11, 17] },
  { label: "Active Users", value: "12,847", delta: "+8.3%", icon: Users, color: "from-neon-cyan to-neon-blue", spark: [10, 8, 11, 9, 13, 12, 15, 14, 17, 16] },
  { label: "Orders", value: "3,241", delta: "+12.7%", icon: ShoppingBag, color: "from-neon-green to-neon-cyan", spark: [6, 9, 7, 11, 9, 13, 12, 10, 14, 16] },
  { label: "Conversion", value: "4.82%", delta: "+0.9%", icon: Zap, color: "from-neon-pink to-neon-purple", spark: [8, 6, 9, 7, 10, 12, 11, 14, 13, 15] },
];

const Spark = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 80, h = 28;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`)
    .join(" ");
  const id = `g-${color.replace(/\s/g, "")}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        className="animate-draw"
      />
    </svg>
  );
};

const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const tilt = useTilt(6);
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

export const StatCards = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
    {stats.map((s, i) => {
      const Icon = s.icon;
      return (
        <TiltCard
          key={s.label}
          className="glass glass-hover noise relative rounded-3xl p-5 overflow-hidden"
        >
          <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
          <div className="relative flex items-start justify-between mb-6">
            <div className={`w-10 h-10 rounded-[50%]
bg-gradient-to-br ${s.color} grid place-items-center shadow-lg`}>
              <Icon size={16} className="text-white" />
            </div>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">
              {s.delta}
            </span>
          </div>
          <p className="text-xs text-white/50 font-medium mb-1">{s.label}</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            <Spark data={s.spark} color={`c${i}`} />
          </div>
        </TiltCard>
      );
    })}
  </div>
);
