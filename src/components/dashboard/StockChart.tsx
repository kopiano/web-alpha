import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Period = "1D" | "1W" | "1M" | "1Y";

const STOCK = {
  symbol: "SPACEX",
  name: "Space Exploration Tech",
  price: 842.50,
  change: 15.75,
  changePercent: 1.91,
};

function generateData(period: Period, basePrice: number): number[] {
  const volatility = 0.012;
  let count: number;
  switch (period) {
    case "1D": count = 78; break;   // 5-min intervals
    case "1W": count = 70; break;   // hourly
    case "1M": count = 60; break;   // daily
    case "1Y": count = 52; break;   // weekly
  }

  const data: number[] = [basePrice * (1 - 0.03)];
  for (let i = 1; i < count; i++) {
    const drift = (Math.random() - 0.48) * volatility * 2;
    const shock = (Math.random() - 0.5) * volatility * 3;
    const prev = data[i - 1];
    data.push(prev * (1 + drift + shock));
  }
  // Ensure last value is near current price
  const last = data[data.length - 1];
  const target = basePrice;
  for (let i = 0; i < data.length; i++) {
    const ratio = target / last;
    const t = i / (data.length - 1);
    data[i] = data[i] * (1 + (ratio - 1) * t * t);
  }
  return data;
}

function getLabels(period: Period, count: number): string[] {
  switch (period) {
    case "1D": {
      const now = new Date();
      const labels: string[] = [];
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 5 * 60 * 1000);
        labels.push(d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      }
      return labels;
    }
    case "1W": {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const today = new Date().getDay();
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const idx = (today - i + 7) % 7;
        labels.push(days[idx]);
      }
      // Repeat to match count (10 per day)
      return Array.from({ length: count }, (_, i) => labels[Math.floor(i / 10)]);
    }
    case "1M": {
      return Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (count - 1 - i));
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
    }
    case "1Y": {
      return Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (count - 1 - i));
        return d.toLocaleDateString("en-US", { month: "short" });
      });
    }
  }
}

export const StockChart = ({ className = "" }: { className?: string }) => {
  const [period, setPeriod] = useState<Period>("1M");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo(() => generateData(period, STOCK.price), [period]);
  const labels = useMemo(() => getLabels(period, data.length), [period, data.length]);

  const w = 700, h = 280, padL = 56, padR = 20, padT = 20, padB = 36;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const min = Math.min(...data) * 0.998;
  const max = Math.max(...data) * 1.002;
  const range = max - min;

  const points = data.map((v, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - ((v - min) / range) * chartH,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x},${padT + chartH} L ${points[0].x},${padT + chartH} Z`;

  const isUp = STOCK.change >= 0;
  const gridLines = [0.25, 0.5, 0.75];
  const yTicks = [max, min + range * 0.75, min + range * 0.5, min + range * 0.25, min];

  // X-axis label interval
  const labelInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div
      className={`glass glass-hover noise rounded-3xl p-6 lg:p-8 animate-fade-in overflow-hidden ${className}`}
      style={{ animationDelay: "0.4s" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-[50%]
bg-gradient-to-br ${isUp ? "from-neon-green to-neon-cyan" : "from-neon-pink to-neon-purple"} grid place-items-center shadow-lg`}>
              {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">{STOCK.symbol}</h3>
                <span className="text-[10px] text-white/30 font-medium bg-white/5 px-2 py-0.5 rounded-full">PRIVATE</span>
              </div>
              <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase">{STOCK.name}</p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            ${STOCK.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs font-semibold tabular-nums flex items-center justify-end gap-1 ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
            {isUp ? "+" : ""}{STOCK.change.toFixed(2)} ({isUp ? "+" : ""}{STOCK.changePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Period Toggle */}
      <div className="flex gap-1.5 p-1 rounded-2xl glass mb-5 w-fit">
        {(["1D", "1W", "1M", "1Y"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-xl
text-xs font-semibold transition-all ${
              period === p
                ? "bg-white/10 text-white shadow-inner"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="stockAreaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ec4899"} stopOpacity="0.35" />
              <stop offset="100%" stopColor={isUp ? "#06b6d4" : "#a855f7"} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="stockLineGrad" x1="0" x2="1">
              <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ec4899"} />
              <stop offset="100%" stopColor={isUp ? "#06b6d4" : "#a855f7"} />
            </linearGradient>
            <filter id="stockGlow">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {gridLines.map((frac) => {
            const y = padT + chartH * frac;
            const val = min + range * (1 - frac);
            return (
              <g key={frac}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="white" strokeOpacity="0.04" strokeDasharray="2 4" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="Inter, system-ui, sans-serif">
                  ${val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#stockAreaGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#stockLineGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#stockGlow)"
            className="animate-draw"
          />

          {/* Hover point */}
          {hoverIdx !== null && (
            <>
              <line
                x1={points[hoverIdx].x}
                y1={padT}
                x2={points[hoverIdx].x}
                y2={padT + chartH}
                stroke="white"
                strokeOpacity="0.12"
                strokeDasharray="2 3"
              />
              <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="5" fill="white" opacity="0.25" />
              <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="3" fill="white" />
            </>
          )}

          {/* Invisible hover areas */}
          {points.map((p, i) => (
            <rect
              key={i}
              x={i === 0 ? 0 : (points[i - 1].x + p.x) / 2}
              y={padT}
              width={i === points.length - 1 ? w - p.x + 10 : (i < points.length - 1 ? (points[i + 1].x - p.x) / 2 : 10) + (i > 0 ? (p.x - points[i - 1].x) / 2 : 10)}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}
        </svg>

        {/* Hover tooltip */}
        {hoverIdx !== null && (
          <div
            className="absolute glass-strong rounded-xl px-3 py-2 text-xs pointer-events-none -translate-x-1/2 -translate-y-[calc(100%+8px)]"
            style={{ left: `${(points[hoverIdx].x / w) * 100}%`, top: `${(points[hoverIdx].y / h) * 100}%` }}
          >
            <p className="text-white/40 text-[10px]">{labels[hoverIdx]}</p>
            <p className="font-bold text-sm tabular-nums">
              ${data[hoverIdx].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* X-axis labels */}
        <g>
          {labels.map((l, i) => {
            if (i % labelInterval !== 0 && i !== 0 && i !== labels.length - 1) return null;
            return (
              <text
                key={i}
                x={points[i].x}
                y={h - padB / 2 + 4}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize="9"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {l}
              </text>
            );
          })}
        </g>
      </div>

      {/* Bottom stats */}
      <div className="flex gap-6 mt-4 pt-4 border-t border-white/5">
        {[
          { label: "Open", value: `$${(STOCK.price - STOCK.change * 0.7).toFixed(2)}` },
          { label: "High", value: `$${max.toFixed(2)}` },
          { label: "Low", value: `$${min.toFixed(2)}` },
          { label: "Volume", value: "48.2M" },
          { label: "P/E Ratio", value: "74.31" },
        ].map((s) => (
          <div key={s.label} className="flex-1 text-center">
            <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase mb-0.5">{s.label}</p>
            <p className="text-xs font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
