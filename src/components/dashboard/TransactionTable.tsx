import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: number;
  time: string;
  merchant: string;
  product: string;
  amount: number;
  paymentMethod: string;
  paymentApp: string;
  category: string;
  note: string;
}

const CAT_COLORS: Record<string, string> = {
  "餐饮": "#f59e0b", "交通": "#60a5fa", "购物": "#f472b6",
  "娱乐": "#a78bfa", "居住": "#34d399", "医疗": "#22d3ee",
  "教育": "#818cf8", "通讯": "#fb923c", "其他": "#94a3b8",
};

const MOCK_DATA: Transaction[] = [
  { id: 1, time: "2026-07-01 12:30", merchant: "星巴克(国贸店)", product: "拿铁咖啡·大杯", amount: 38.00, paymentMethod: "微信", paymentApp: "微信支付", category: "餐饮", note: "午餐咖啡" },
  { id: 2, time: "2026-07-01 08:15", merchant: "滴滴出行", product: "快车", amount: 24.50, paymentMethod: "支付宝", paymentApp: "支付宝", category: "交通", note: "上班通勤" },
  { id: 3, time: "2026-06-30 19:45", merchant: "京东自营", product: "机械键盘 Keychron K8", amount: 598.00, paymentMethod: "银行卡", paymentApp: "云闪付", category: "购物", note: "办公外设" },
  { id: 4, time: "2026-06-30 13:00", merchant: "美团外卖", product: "黄焖鸡米饭+可乐", amount: 32.80, paymentMethod: "微信", paymentApp: "微信支付", category: "餐饮", note: "工作日午餐" },
  { id: 5, time: "2026-06-29 20:30", merchant: "万达影城", product: "IMAX电影票×2", amount: 156.00, paymentMethod: "支付宝", paymentApp: "支付宝", category: "娱乐", note: "周末观影" },
  { id: 6, time: "2026-06-29 15:00", merchant: "Apple Store", product: "iCloud+ 200GB月费", amount: 21.00, paymentMethod: "支付宝", paymentApp: "支付宝", category: "通讯", note: "云存储订阅" },
  { id: 7, time: "2026-06-28 11:20", merchant: "链家地产", product: "6月房租", amount: 3200.00, paymentMethod: "银行卡", paymentApp: "招商银行", category: "居住", note: "整月房租" },
  { id: 8, time: "2026-06-28 09:00", merchant: "瑞幸咖啡", product: "生椰拿铁", amount: 15.90, paymentMethod: "微信", paymentApp: "微信支付", category: "餐饮", note: "早餐咖啡" },
  { id: 9, time: "2026-06-27 18:30", merchant: "叮咚买菜", product: "蔬菜水果套餐", amount: 67.30, paymentMethod: "支付宝", paymentApp: "支付宝", category: "餐饮", note: "周末食材" },
  { id: 10, time: "2026-06-27 10:00", merchant: "中石化加油站", product: "92号汽油 45L", amount: 328.50, paymentMethod: "微信", paymentApp: "微信支付", category: "交通", note: "加油" },
  { id: 11, time: "2026-06-26 14:00", merchant: "丁香诊所", product: "体检套餐", amount: 599.00, paymentMethod: "银行卡", paymentApp: "银联", category: "医疗", note: "年度体检" },
  { id: 12, time: "2026-05-15 16:00", merchant: "极客时间", product: "Go语言高级编程", amount: 199.00, paymentMethod: "支付宝", paymentApp: "支付宝", category: "教育", note: "在线课程" },
];

const PAGE_SIZE = 8;

export const TransactionTable = ({ className = "" }: { className?: string }) => {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"time" | "amount">("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...MOCK_DATA].sort((a, b) => {
      const va = sortKey === "time" ? a.time : a.amount;
      const vb = sortKey === "time" ? b.time : b.amount;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: "time" | "amount") => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  };

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Transactions</p>
          <h4 className="text-lg font-semibold">交易记录</h4>
        </div>
        <Badge variant="outline" className="border-white/10 bg-white/5 text-white/60">
          {sorted.length} records
        </Badge>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        {/* Column headers */}
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.6fr_0.7fr] gap-2 px-4 pb-3 text-[10px] font-semibold tracking-wider uppercase text-white/30 min-w-[800px]">
          <button className="text-left flex items-center gap-1 hover:text-white/50 transition-colors" onClick={() => toggleSort("time")}>
            交易时间 {sortKey === "time" && (sortDir === "desc" ? "↓" : "↑")}
          </button>
          <div className="text-left">商家</div>
          <div className="text-left">商品</div>
          <button className="text-right flex items-center justify-end gap-1 hover:text-white/50 transition-colors" onClick={() => toggleSort("amount")}>
            金额 {sortKey === "amount" && (sortDir === "desc" ? "↓" : "↑")}
          </button>
          <div className="text-center">支付方式</div>
          <div className="text-center">支付软件</div>
          <div className="text-center">分类</div>
          <div className="text-left">备注</div>
        </div>

        {/* Rows */}
        <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] min-w-[800px]">
          {current.map((tx, i) => {
            const catColor = CAT_COLORS[tx.category] || "#94a3b8";
            const isIncome = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className={`grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.6fr_0.7fr] gap-2 px-4 py-3 border-b border-white/[0.08] last:border-b-0 transition-colors ${
                  i % 2 === 0 ? "bg-white/[0.02] hover:bg-white/[0.05]" : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-xs text-white/50 self-center truncate">{tx.time}</div>
                <div className="text-xs text-white/80 self-center truncate font-medium">{tx.merchant}</div>
                <div className="text-xs text-white/60 self-center truncate">{tx.product}</div>
                <div className={`text-xs self-center text-right font-mono font-semibold tabular-nums ${isIncome ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                  ¥{tx.amount.toFixed(2)}
                </div>
                <div className="self-center flex justify-center">
                  <span className="text-[10px] text-white/40">{tx.paymentMethod}</span>
                </div>
                <div className="self-center flex justify-center">
                  <span className="text-[10px] text-white/40">{tx.paymentApp}</span>
                </div>
                <div className="self-center flex justify-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${catColor}18`, border: `1px solid ${catColor}30`, color: catColor }}>
                    {tx.category}
                  </span>
                </div>
                <div className="text-[10px] text-white/30 self-center truncate">{tx.note || "—"}</div>
              </div>
            );
          })}
        </div>
      </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-white/30">
            Page {page} of {totalPages} · {sorted.length} records
          </div>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(255,255,255,0.06)",
              }}
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
            ><ChevronLeft className="h-4 w-4" style={{ color: page === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
            <button
              className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(255,255,255,0.06)",
              }}
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
            ><ChevronRight className="h-4 w-4" style={{ color: page === totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
          </div>
        </div>
    </div>
  );
};
