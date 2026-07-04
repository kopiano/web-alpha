import { useState, useMemo, useEffect, useCallback } from "react";
import { TrendingUp, AlertCircle, UserRound } from "lucide-react";
import { getMonthlyExpense, getTransactionMonths } from "@/api/transactions";
import { useAuth } from "@/components/dashboard/AuthProvider";
import type { MonthlyEntry } from "@/api/transactions";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

const CHART_COLORS = {
  line: "#60a5fa",
  gradientTop: "rgba(96,165,250,0.25)",
  gradientBottom: "rgba(96,165,250,0.02)",
  dot: "#93c5fd",
  grid: "rgba(255,255,255,0.05)",
};

/* ─── Guest mock data ─── */
const GUEST_YEAR_DATA: Record<string, number[]> = {
  "2026": [4200, 3850, 5100, 4600, 4300, 5800, 3200, 0, 0, 0, 0, 0],
  "2025": [3800, 4200, 4900, 5200, 4100, 5500, 4800, 3900, 4500, 5300, 5100, 6200],
  "2024": [3500, 3900, 4400, 4800, 3700, 5200, 4300, 3600, 4100, 4900, 4700, 5800],
};

interface Props {
  className?: string;
}

export const MonthlyExpenseChart = ({ className = "" }: Props) => {
  const { user } = useAuth();
  const isGuest = user === null;

  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [years, setYears] = useState<string[]>([currentYear]);
  const [monthlyData, setMonthlyData] = useState<MonthlyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest: use mock data directly
  const guestData = useMemo(() => {
    return GUEST_YEAR_DATA[year] || GUEST_YEAR_DATA["2026"] || new Array(12).fill(0);
  }, [year]);

  const fetchYears = useCallback(async () => {
    if (isGuest) {
      setYears(Object.keys(GUEST_YEAR_DATA).sort().reverse());
      return;
    }
    try {
      const res = await getTransactionMonths();
      const months = res.data?.data ?? [];
      const yrSet = new Set(months.map((m: string) => m.split("-")[0]));
      const yrList = [...yrSet].sort().reverse();
      if (yrList.length > 0) {
        setYears(yrList);
        if (!yrList.includes(year)) setYear(yrList[0]);
      }
    } catch {
      // fallback
    }
  }, [isGuest]);

  const fetchData = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMonthlyExpense({ year });
      setMonthlyData(res.data?.data ?? []);
    } catch {
      setError("加载数据失败");
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  }, [year, isGuest]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build 12-month array
  const data = useMemo(() => {
    if (isGuest) return guestData;
    const arr = new Array(12).fill(0);
    for (const entry of monthlyData) {
      const [, mo] = entry.month.split("-");
      const idx = parseInt(mo) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = entry.amount;
    }
    return arr;
  }, [isGuest, guestData, monthlyData]);

  const maxVal = Math.max(...data, 1);
  const total = data.reduce((s, v) => s + v, 0);

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

  // 平滑曲线（Catmull-Rom → Cubic Bezier）
  const smoothPath = useMemo(() => {
    const pts = points;
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }, [points]);

  const linePath = smoothPath;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Monthly Trend</p>
          <h4 className="text-lg font-semibold">月度支出趋势</h4>
        </div>
        <div className="flex items-center gap-2">
          {isGuest && (
            <span className="text-[9px] text-amber-400/50 flex items-center gap-1">
              <UserRound size={10} /> 示例
            </span>
          )}
          <div className="flex items-center gap-1">
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)}
                className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition-all duration-200"
                style={{ background: year === y ? "rgba(255,255,255,0.12)" : "transparent", color: year === y ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}
              >{y}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[240px]">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[240px] gap-2">
          <AlertCircle size={24} className="text-rose-400/40" />
          <p className="text-xs text-rose-400/60">{error}</p>
        </div>
      ) : total === 0 && !isGuest ? (
        <div className="flex flex-col items-center justify-center h-[240px] gap-2">
          <TrendingUp size={24} className="text-white/10" />
          <p className="text-xs text-white/30">暂无数据</p>
          <p className="text-[10px] text-white/15">导入账单后可查看月度支出趋势</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={14} className="text-blue-400/60" />
            <span className="text-xs text-white/30">全年合计</span>
            <span className="text-lg font-bold text-white/80">¥{total.toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto scrollbar-none">
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[500px]">
              {yTicks.map((t) => {
                const y = padT + chartH - (t / maxVal) * chartH;
                return (
                  <g key={t}>
                    <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={CHART_COLORS.grid} strokeWidth="1" />
                    <text x={padL - 8} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">¥{t >= 1000 ? (t / 1000).toFixed(0) + "k" : t}</text>
                  </g>
                );
              })}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.gradientTop} />
                  <stop offset="100%" stopColor={CHART_COLORS.gradientBottom} />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path d={linePath} fill="none" stroke={CHART_COLORS.line} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <g key={i}>
                  {p.v > 0 && <circle cx={p.x} cy={p.y} r="5" fill={CHART_COLORS.dot} stroke="rgba(10,12,20,0.9)" strokeWidth="2" className="cursor-pointer" />}
                  {p.v > 0 && <title>{MONTH_LABELS[i]}: ¥{p.v.toLocaleString()}</title>}
                  <rect x={p.x - 12} y={p.y - 12} width="24" height="24" fill="transparent" className="cursor-pointer">
                    <title>{MONTH_LABELS[i]}: ¥{p.v.toLocaleString()}</title>
                  </rect>
                </g>
              ))}
              {points.map((p, i) => (
                <text key={i} x={p.x} y={padT + chartH + 18} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9">{MONTH_LABELS[i]}</text>
              ))}
            </svg>
          </div>
        </>
      )}
    </div>
  );
};
