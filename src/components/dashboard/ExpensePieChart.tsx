import { useState, useMemo } from "react";
import { PieChart } from "lucide-react";

const CAT_COLORS: Record<string, string> = {
  "餐饮": "#f59e0b", "交通": "#60a5fa", "购物": "#f472b6",
  "娱乐": "#a78bfa", "居住": "#34d399", "医疗": "#22d3ee",
  "教育": "#818cf8", "通讯": "#fb923c", "其他": "#94a3b8",
};

interface PieData {
  category: string;
  amount: number;
  percentage: number;
}

// ─── Mock data ───
const MONTHLY_DATA: PieData[] = [
  { category: "居住", amount: 3200, percentage: 42.1 },
  { category: "餐饮", amount: 1520, percentage: 20.0 },
  { category: "交通", amount: 680, percentage: 8.9 },
  { category: "购物", amount: 1100, percentage: 14.5 },
  { category: "娱乐", amount: 420, percentage: 5.5 },
  { category: "医疗", amount: 350, percentage: 4.6 },
  { category: "通讯", amount: 180, percentage: 2.4 },
  { category: "教育", amount: 150, percentage: 2.0 },
];

const YEARLY_DATA: PieData[] = [
  { category: "居住", amount: 38400, percentage: 35.2 },
  { category: "餐饮", amount: 21800, percentage: 20.0 },
  { category: "交通", amount: 9600, percentage: 8.8 },
  { category: "购物", amount: 15200, percentage: 13.9 },
  { category: "娱乐", amount: 6200, percentage: 5.7 },
  { category: "医疗", amount: 4800, percentage: 4.4 },
  { category: "教育", amount: 5600, percentage: 5.1 },
  { category: "通讯", amount: 2400, percentage: 2.2 },
  { category: "其他", amount: 5200, percentage: 4.7 },
];

function buildSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export const ExpensePieChart = ({ className = "" }: { className?: string }) => {
  const [mode, setMode] = useState<"month" | "year">("month");
  const data = mode === "month" ? MONTHLY_DATA : YEARLY_DATA;
  const total = useMemo(() => data.reduce((s, d) => s + d.amount, 0), [data]);

  const cx = 140, cy = 140, outerR = 110, innerR = 60;
  let angle = -Math.PI / 2;

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Expense Breakdown</p>
          <h4 className="text-lg font-semibold">支出分类</h4>
        </div>
        {/* Toggle */}
        <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["month", "year"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                background: mode === m ? "rgba(255,255,255,0.12)" : "transparent",
                color: mode === m ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
              }}
            >
              {m === "month" ? "当月" : "全年"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* SVG Donut */}
        <svg width="280" height="280" viewBox="0 0 280 280" className="-mt-2">
          {data.map((d, i) => {
            const sliceAngle = (d.amount / total) * Math.PI * 2;
            const startAngle = angle;
            const endAngle = angle + sliceAngle;
            const path = buildSlicePath(cx, cy, outerR, startAngle, endAngle);
            angle = endAngle;
            // mid-angle for label line
            const mid = startAngle + sliceAngle / 2;
            const lx = cx + (outerR + 18) * Math.cos(mid);
            const ly = cy + (outerR + 18) * Math.sin(mid);
            return (
              <g key={d.category}>
                <path d={path} fill={CAT_COLORS[d.category] || "#94a3b8"} opacity={0.85}
                  stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
                {d.percentage >= 4 && (
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight={600}>
                    {d.percentage.toFixed(1)}%
                  </text>
                )}
              </g>
            );
          })}
          {/* Center circle (donut hole) */}
          <circle cx={cx} cy={cy} r={innerR} fill="rgba(10,12,20,0.8)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight={500}>
            {mode === "month" ? "当月支出" : "全年支出"}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="16" fontWeight={700}>
            ¥{(total / (mode === "month" ? 1 : 10000)).toFixed(mode === "month" ? 0 : 1)}{mode === "month" ? "" : "w"}
          </text>
        </svg>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 w-full max-w-[400px]">
          {data.map((d) => (
            <div key={d.category} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[d.category] || "#94a3b8" }} />
              <span className="text-[10px] text-white/40">{d.category}</span>
              <span className="text-[10px] text-white/20 ml-auto">{d.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
