import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

const YEAR_DATA: Record<string, number[]> = {
  "2026": [4200, 3850, 5100, 4600, 4300, 5800, 3200, 0, 0, 0, 0, 0],
  "2025": [3800, 4200, 4900, 5200, 4100, 5500, 4800, 3900, 4500, 5300, 5100, 6200],
  "2024": [3500, 3900, 4400, 4800, 3700, 5200, 4300, 3600, 4100, 4900, 4700, 5800],
};

const CHART_COLORS = {
  line: "#60a5fa",
  gradientTop: "rgba(96,165,250,0.25)",
  gradientBottom: "rgba(96,165,250,0.02)",
  dot: "#93c5fd",
  grid: "rgba(255,255,255,0.05)",
};

export const MonthlyExpenseChart = ({ className = "" }: { className?: string }) => {
  const [year, setYear] = useState("2026");
  const years = Object.keys(YEAR_DATA).sort().reverse();

  const data = YEAR_DATA[year] || YEAR_DATA["2026"];
  const maxVal = Math.max(...data, 1);
  const total = data.reduce((s, v) => s + v, 0);

  // SVG dimensions
  const w = 600, h = 240, padL = 50, padR = 20, padT = 20, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const points = useMemo(() => {
    return data.map((v, i) => {
      const x = padL + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padT + chartH - (v / maxVal) * chartH;
      return { x, y, v };
    });
  }, [data, maxVal]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Monthly Trend</p>
          <h4 className="text-lg font-semibold">月度支出趋势</h4>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition-all duration-200"
              style={{
                background: year === y ? "rgba(255,255,255,0.12)" : "transparent",
                color: year === y ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={14} className="text-blue-400/60" />
        <span className="text-xs text-white/30">全年合计</span>
        <span className="text-lg font-bold text-white/80">¥{total.toLocaleString()}</span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto scrollbar-none">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[500px]">
          {/* Grid lines */}
          {yTicks.map((t) => {
            const y = padT + chartH - (t / maxVal) * chartH;
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={CHART_COLORS.grid} strokeWidth="1" />
                <text x={padL - 8} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">
                  ¥{t >= 1000 ? (t / 1000).toFixed(0) + "k" : t}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.gradientTop} />
              <stop offset="100%" stopColor={CHART_COLORS.gradientBottom} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke={CHART_COLORS.line} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill={CHART_COLORS.dot}
                stroke="rgba(10,12,20,0.9)" strokeWidth="2" />
              {/* Tooltip value on hover */}
              <title>{MONTH_LABELS[i]}: ¥{p.v.toLocaleString()}</title>
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((p, i) => (
            <text key={i} x={p.x} y={padT + chartH + 18} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize="9">
              {MONTH_LABELS[i]}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
