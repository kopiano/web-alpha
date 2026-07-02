import { useState, useMemo, useEffect, useCallback } from "react";
import { PieChart, AlertCircle, UserRound } from "lucide-react";
import { getExpenseCategories, getTransactionSummary } from "@/api/transactions";
import { useAuth } from "@/components/dashboard/AuthProvider";

const CAT_COLORS: Record<string, string> = {
  "餐饮": "#f59e0b", "交通": "#60a5fa", "购物": "#f472b6",
  "娱乐": "#a78bfa", "居住": "#34d399", "医疗": "#22d3ee",
  "教育": "#818cf8", "通讯": "#fb923c", "金融": "#f97316",
  "社交": "#ec4899", "其他": "#94a3b8",
};

function buildSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

const FALLBACK_COLORS = ["#f59e0b", "#60a5fa", "#f472b6", "#a78bfa", "#34d399", "#22d3ee", "#818cf8", "#fb923c", "#f97316", "#94a3b8"];

/* ─── Guest mock data ─── */
const GUEST_MONTHLY = [
  { category: "居住", amount: 3200, percentage: 42.1, count: 1 },
  { category: "餐饮", amount: 1520, percentage: 20.0, count: 4 },
  { category: "交通", amount: 680, percentage: 8.9, count: 3 },
  { category: "购物", amount: 1100, percentage: 14.5, count: 2 },
  { category: "娱乐", amount: 420, percentage: 5.5, count: 1 },
  { category: "医疗", amount: 350, percentage: 4.6, count: 1 },
  { category: "通讯", amount: 180, percentage: 2.4, count: 2 },
  { category: "教育", amount: 150, percentage: 2.0, count: 1 },
];

const GUEST_YEARLY = [
  { category: "居住", amount: 38400, percentage: 35.2, count: 12 },
  { category: "餐饮", amount: 21800, percentage: 20.0, count: 48 },
  { category: "交通", amount: 9600, percentage: 8.8, count: 24 },
  { category: "购物", amount: 15200, percentage: 13.9, count: 18 },
  { category: "娱乐", amount: 6200, percentage: 5.7, count: 10 },
  { category: "医疗", amount: 4800, percentage: 4.4, count: 6 },
  { category: "教育", amount: 5600, percentage: 5.1, count: 8 },
  { category: "通讯", amount: 2400, percentage: 2.2, count: 6 },
  { category: "其他", amount: 5200, percentage: 4.7, count: 15 },
];

interface Props {
  className?: string;
}

export const ExpensePieChart = ({ className = "" }: Props) => {
  const { user } = useAuth();
  const isGuest = user === null;
  const [mode, setMode] = useState<"month" | "year">("month");
  const [pieData, setPieData] = useState<typeof GUEST_MONTHLY>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear().toString();
  const [year] = useState(currentYear);

  // Guest: use mock data immediately
  const guestData = useMemo(() => {
    return mode === "month" ? GUEST_MONTHLY : GUEST_YEARLY;
  }, [mode]);

  const fetchData = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = mode === "month" ? { year } : { year };
      const [catRes] = await Promise.all([getExpenseCategories(params)]);
      const data = catRes.data?.data ?? [];
      setPieData(data);
    } catch {
      setError("加载数据失败");
      setPieData([]);
    } finally {
      setLoading(false);
    }
  }, [mode, year, isGuest]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const data = isGuest ? guestData : pieData;
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
        <div className="flex items-center gap-2">
          {isGuest && (
            <span className="text-[9px] text-amber-400/50 flex items-center gap-1">
              <UserRound size={10} /> 示例
            </span>
          )}
          <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["month", "year"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
                style={{ background: mode === m ? "rgba(255,255,255,0.12)" : "transparent", color: mode === m ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}
              >{m === "month" ? "当月" : "全年"}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center h-[280px]">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-2">
            <AlertCircle size={24} className="text-rose-400/40" />
            <p className="text-xs text-rose-400/60">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-2">
            <PieChart size={24} className="text-white/10" />
            <p className="text-xs text-white/30">暂无数据</p>
            <p className="text-[10px] text-white/15">导入账单后可查看分类支出</p>
          </div>
        ) : (
          <>
            <svg width="280" height="280" viewBox="0 0 280 280" className="-mt-2">
              {data.map((d, i) => {
                const sliceAngle = (d.amount / total) * Math.PI * 2;
                const startAngle = angle;
                const endAngle = angle + sliceAngle;
                const path = buildSlicePath(cx, cy, outerR, startAngle, endAngle);
                angle = endAngle;
                const mid = startAngle + sliceAngle / 2;
                const lx = cx + (outerR + 18) * Math.cos(mid);
                const ly = cy + (outerR + 18) * Math.sin(mid);
                const color = CAT_COLORS[d.category] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                return (
                  <g key={d.category}>
                    <path d={path} fill={color} opacity={0.85} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
                    {d.percentage >= 4 && (
                      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight={600}>
                        {d.percentage.toFixed(1)}%
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx={cx} cy={cy} r={innerR} fill="rgba(10,12,20,0.8)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight={500}>
                {mode === "month" ? "当月支出" : "全年支出"}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="16" fontWeight={700}>
                ¥{total >= 10000 ? (total / 10000).toFixed(1) + "w" : total.toFixed(0)}
              </text>
            </svg>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 w-full max-w-[400px] mt-2">
              {data.map((d, i) => {
                const color = CAT_COLORS[d.category] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                return (
                  <div key={d.category} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[10px] text-white/40">{d.category}</span>
                    <span className="text-[10px] text-white/20 ml-auto">{d.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
