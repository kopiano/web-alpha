import { useState, useMemo, useEffect, useCallback } from "react";
import { Flame, AlertCircle, UserRound } from "lucide-react";
import { getHotMerchants } from "@/api/transactions";
import { useAuth } from "@/components/dashboard/AuthProvider";

const GUEST_HOT = [
  { merchant: "美团外卖", amount: 3890, count: 28 },
  { merchant: "饿了么", amount: 2800, count: 20 },
  { merchant: "瑞幸咖啡", amount: 2150, count: 18 },
  { merchant: "滴滴出行", amount: 1980, count: 15 },
  { merchant: "淘宝", amount: 5200, count: 15 },
  { merchant: "星巴克(国贸店)", amount: 4560, count: 12 },
  { merchant: "盒马鲜生", amount: 3200, count: 12 },
  { merchant: "叮咚买菜", amount: 1280, count: 10 },
  { merchant: "哈啰出行", amount: 1200, count: 10 },
  { merchant: "肯德基", amount: 980, count: 8 },
];

interface Props {
  selectedMonth?: string;
  className?: string;
}

export const HotRanking = ({ selectedMonth, className = "" }: Props) => {
  const { user } = useAuth();
  const isGuest = user === null;
  const [data, setData] = useState<{ merchant: string; amount: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, month] = useMemo(() => {
    if (!selectedMonth) return ["", ""];
    const p = selectedMonth.split("-");
    return [p[0] || "", p[1] || ""];
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    if (isGuest) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await getHotMerchants({ year, month });
      setData(res.data?.data ?? []);
    } catch { setError("加载失败"); setData([]); }
    finally { setLoading(false); }
  }, [year, month, isGuest]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayData = isGuest ? GUEST_HOT : data;
  const maxCount = Math.max(...displayData.map(d => d.count), 1);

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Hot Ranking</p>
          <h4 className="text-lg font-semibold">热门商家排行</h4>
        </div>
        {isGuest && (
          <span className="text-[9px] text-amber-400/50 flex items-center gap-1">
            <UserRound size={10} /> 示例
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
          <AlertCircle size={24} className="text-rose-400/40" />
          <p className="text-xs text-rose-400/60">{error}</p>
        </div>
      ) : displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
          <Flame size={24} className="text-white/10" />
          <p className="text-xs text-white/30">暂无数据</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayData.map((item, i) => {
            const barW = (item.count / maxCount) * 100;
            const medals = ["🥇", "🥈", "🥉"];
            const prefix = i < 3 ? medals[i] : \`#\${i + 1}\`;
            return (
              <div key={item.merchant} className="flex items-center gap-3">
                <span className="text-[11px] w-6 text-center shrink-0">{prefix}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/70 truncate">{item.merchant}</span>
                    <span className="text-[11px] text-white/50 font-mono shrink-0 ml-2">{item.count}次</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500 animate-pulse"
                      style={{ width: \`\${Math.max(barW, 3)}%\`, background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                  </div>
                </div>
                <span className="text-[9px] text-white/20 w-16 text-right shrink-0">¥{item.amount.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
