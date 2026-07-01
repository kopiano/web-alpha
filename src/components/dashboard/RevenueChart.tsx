import { useMemo, useState } from "react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const data = [32, 45, 38, 58, 52, 71, 64, 82, 76, 94, 88, 112];
const prev = [22, 28, 30, 38, 42, 50, 48, 60, 58, 70, 72, 80];

export const RevenueChart = () => {
  const [hover, setHover] = useState<number | null>(8);
  const w = 600, h = 220, pad = 24;
  const max = Math.max(...data, ...prev) * 1.1;

  const path = useMemo(() => {
    const step = (w - pad * 2) / (data.length - 1);
    const pts = data.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      d += ` C ${cx},${py} ${cx},${y} ${x},${y}`;
    }
    return { d, pts };
  }, [max]);

  const prevPath = useMemo(() => {
    const step = (w - pad * 2) / (prev.length - 1);
    const pts = prev.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      d += ` C ${cx},${py} ${cx},${y} ${x},${y}`;
    }
    return d;
  }, [max]);

  return (
    <div className="glass glass-hover noise relative rounded-3xl p-6 lg:p-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase mb-1">Revenue</p>
          <h3 className="text-2xl font-semibold">Performance Overview</h3>
        </div>
        <div className="flex gap-1.5 p-1 rounded-2xl glass">
          {["1W", "1M", "3M", "1Y", "All"].map((p, i) => (
            <button
              key={p}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                i === 3 ? "bg-white/10 text-white shadow-inner" : "text-white/50 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 mb-2">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan" /> This year
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="w-3 h-3 rounded-full bg-white/15" /> Previous
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="hsl(270, 95%, 65%)" />
              <stop offset="50%" stopColor="hsl(220, 100%, 60%)" />
              <stop offset="100%" stopColor="hsl(190, 100%, 55%)" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(270, 95%, 65%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(190, 100%, 55%)" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0.25, 0.5, 0.75].map((y) => (
            <line key={y} x1={pad} x2={w - pad} y1={pad + (h - pad * 2) * y} y2={pad + (h - pad * 2) * y} stroke="white" strokeOpacity="0.04" strokeDasharray="2 4" />
          ))}

          <path d={`${path.d} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`} fill="url(#areaGrad)" />
          <path d={prevPath} fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d={path.d} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" className="animate-draw" />

          {path.pts.map((p, i) => (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <circle cx={p[0]} cy={p[1]} r="14" fill="transparent" />
              {hover === i && (
                <>
                  <line x1={p[0]} y1={pad} x2={p[0]} y2={h - pad} stroke="white" strokeOpacity="0.15" strokeDasharray="2 2" />
                  <circle cx={p[0]} cy={p[1]} r="6" fill="hsl(190, 100%, 55%)" opacity="0.3" />
                  <circle cx={p[0]} cy={p[1]} r="3.5" fill="white" />
                </>
              )}
            </g>
          ))}
        </svg>

        {hover !== null && (
          <div
            className="absolute glass-strong rounded-xl px-3 py-2 text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: `${(path.pts[hover][0] / w) * 100}%`, top: `${(path.pts[hover][1] / h) * 100}%` }}
          >
            <p className="text-white/50 text-[10px]">{months[hover]} 2026</p>
            <p className="font-semibold">${data[hover]}.4K</p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-2 px-6">
        {months.map((m, i) => (
          <span key={m} className={`text-[10px] ${i === hover ? "text-white" : "text-white/30"} transition-colors`}>{m}</span>
        ))}
      </div>
    </div>
  );
};
