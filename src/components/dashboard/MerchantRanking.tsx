import { useState, useMemo, useEffect, useCallback } from "react";
import { TrendingDown, AlertCircle, UserRound } from "lucide-react";
import { getTopMerchants } from "@/api/transactions";
import { useAuth } from "@/components/dashboard/AuthProvider";

const GUEST_MERCHANTS: Record<string, { merchant: string; amount: number; count: number }[]> = {
  WeChat: [
    { merchant: "星巴克(国贸店)", amount: 4560, count: 12 },
    { merchant: "美团外卖", amount: 3890, count: 28 },
    { merchant: "瑞幸咖啡", amount: 2150, count: 18 },
    { merchant: "滴滴出行", amount: 1980, count: 15 },
    { merchant: "京东自营", amount: 1850, count: 5 },
    { merchant: "中石化加油站", amount: 1640, count: 4 },
    { merchant: "叮咚买菜", amount: 1280, count: 10 },
    { merchant: "肯德基", amount: 980, count: 8 },
    { merchant: "链家地产", amount: 3200, count: 1 },
    { merchant: "Apple Store", amount: 720, count: 3 },
  ],
  Alipay: [
    { merchant: "淘宝", amount: 5200, count: 15 },
    { merchant: "盒马鲜生", amount: 3200, count: 12 },
    { merchant: "饿了么", amount: 2800, count: 20 },
    { merchant: "哈啰出行", amount: 1200, count: 10 },
    { merchant: "大润发", amount: 980, count: 6 },
    { merchant: "必胜客", amount: 860, count: 4 },
    { merchant: "名创优品", amount: 540, count: 5 },
    { merchant: "屈臣氏", amount: 420, count: 3 },
    { merchant: "小米商城", amount: 380, count: 2 },
    { merchant: "网易严选", amount: 350, count: 3 },
  ],
};

interface Props {
  selectedMonth?: string;
  className?: string;
}

const PAY_APPS = ["WeChat", "Alipay"];

export const MerchantRanking = ({ selectedMonth, className = "" }: Props) => {
  const { user } = useAuth();
  const isGuest = user === null;
  const [paymentApp, setPaymentApp] = useState("WeChat");
  const [data, setData] = useState<{ merchant: string; amount: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, month] = useMemo(() => {
    if (!selectedMonth) return ["", ""];
    const p = selectedMonth.split("-");
    return [p[0] || "", p[1] || ""];
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getTopMerchants({ year, month, payment_app: paymentApp });
      setData(res.data?.data ?? []);
    } catch {
      setError("加载失败");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, paymentApp, isGuest]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayData = isGuest
    ? (GUEST_MERCHANTS[paymentApp] || GUEST_MERCHANTS.WeChat)
    : data;

  const maxAmount = Math.max(...displayData.map(d => d.amount), 1);

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Merchant Ranking</p>
          <h4 className="text-lg font-semibold">消费商家排行</h4>
        </div>
        <div className="flex items-center gap-2">
          {isGuest && (
            <span className="text-[9px] text-amber-400/50 flex items-center gap-1">
              <UserRound size={10} /> 示例
            </span>
          )}
          <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {PAY_APPS.map((app) => (
              <button key={app} onClick={() => setPaymentApp(app)}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
                style={{ background: paymentApp === app ? "rgba(255,255,255,0.12)" : "transparent", color: paymentApp === app ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}
              >{app}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-rose-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
          <AlertCircle size={24} className="text-rose-400/40" />
          <p className="text-xs text-rose-400/60">{error}</p>
        </div>
      ) : displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
          <TrendingDown size={24} className="text-white/10" />
          <p className="text-xs text-white/30">暂无数据</p>
          <p className="text-[10px] text-white/15">{paymentApp === "WeChat" ? "微信" : "支付宝"}消费记录</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayData.map((item, i) => {
            const pct = (item.amount / maxAmount) * 100;
            return (
              <div key={item.merchant} className="flex items-center gap-3">
                <span className="text-[10px] text-white/30 w-4 shrink-0 text-right font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/70 truncate">{item.merchant}</span>
                    <span className="text-[11px] text-white/50 font-mono shrink-0 ml-2">¥{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%`, background: "linear-gradient(90deg, #a855f7, #06b6d4)" }} />
                  </div>
                </div>
                <span className="text-[9px] text-white/20 w-8 text-right shrink-0">{item.count}笔</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
