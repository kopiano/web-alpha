import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Receipt, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTransactions, filterTransactions } from "@/api/transactions";
import { useTilt } from "@/hooks/useTilt";
import { useAuth } from "@/components/dashboard/AuthProvider";

/* ─── Types ─── */
interface Transaction {
  id: number;
  user_id?: number;
  time: string;
  type: "income" | "expense" | "neutral";
  merchant: string;
  product: string;
  amount: number;
  payment_method: string;
  payment_app: string;
  category: string;
  note: string;
}

interface TransactionSummary {
  income_count: number;
  income_amount: number;
  expense_count: number;
  expense_amount: number;
  neutral_count: number;
  neutral_amount: number;
  total_income: number;
  total_expense: number;
}

const CAT_COLORS: Record<string, string> = {
  "餐饮": "#f59e0b", "交通": "#60a5fa", "购物": "#f472b6",
  "娱乐": "#a78bfa", "居住": "#34d399", "医疗": "#22d3ee",
  "教育": "#818cf8", "通讯": "#fb923c", "金融": "#f97316",
  "社交": "#ec4899", "其他": "#94a3b8",
};

const TYPE_CONFIG = {
  income: { label: "收入", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  expense: { label: "支出", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
  neutral: { label: "中性", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
};

/* ─── Guest Mock Data ─── */
const MOCK_DATA: Transaction[] = [
  { id: 1, time: "2026-07-01 12:30", type: "expense", merchant: "星巴克(国贸店)", product: "拿铁咖啡·大杯", amount: 38.00, payment_method: "微信", payment_app: "微信支付", category: "餐饮", note: "午餐咖啡" },
  { id: 2, time: "2026-07-01 08:15", type: "expense", merchant: "滴滴出行", product: "快车", amount: 24.50, payment_method: "支付宝", payment_app: "支付宝", category: "交通", note: "上班通勤" },
  { id: 3, time: "2026-06-30 19:45", type: "expense", merchant: "京东自营", product: "机械键盘 Keychron K8", amount: 598.00, payment_method: "银行卡", payment_app: "云闪付", category: "购物", note: "办公外设" },
  { id: 4, time: "2026-06-30 13:00", type: "expense", merchant: "美团外卖", product: "黄焖鸡米饭+可乐", amount: 32.80, payment_method: "微信", payment_app: "微信支付", category: "餐饮", note: "工作日午餐" },
  { id: 5, time: "2026-06-29 20:30", type: "expense", merchant: "万达影城", product: "IMAX电影票×2", amount: 156.00, payment_method: "支付宝", payment_app: "支付宝", category: "娱乐", note: "周末观影" },
  { id: 6, time: "2026-06-29 15:00", type: "expense", merchant: "Apple Store", product: "iCloud+ 200GB月费", amount: 21.00, payment_method: "支付宝", payment_app: "支付宝", category: "通讯", note: "云存储订阅" },
  { id: 7, time: "2026-06-28 11:20", type: "expense", merchant: "链家地产", product: "6月房租", amount: 3200.00, payment_method: "银行卡", payment_app: "招商银行", category: "居住", note: "整月房租" },
  { id: 8, time: "2026-06-28 09:00", type: "expense", merchant: "瑞幸咖啡", product: "生椰拿铁", amount: 15.90, payment_method: "微信", payment_app: "微信支付", category: "餐饮", note: "早餐咖啡" },
  { id: 9, time: "2026-06-27 18:30", type: "expense", merchant: "叮咚买菜", product: "蔬菜水果套餐", amount: 67.30, payment_method: "支付宝", payment_app: "支付宝", category: "餐饮", note: "周末食材" },
  { id: 10, time: "2026-06-27 10:00", type: "expense", merchant: "中石化加油站", product: "92号汽油 45L", amount: 328.50, payment_method: "微信", payment_app: "微信支付", category: "交通", note: "加油" },
  { id: 11, time: "2026-06-26 14:00", type: "expense", merchant: "丁香诊所", product: "体检套餐", amount: 599.00, payment_method: "银行卡", payment_app: "银联", category: "医疗", note: "年度体检" },
  { id: 12, time: "2026-05-15 16:00", type: "expense", merchant: "极客时间", product: "Go语言高级编程", amount: 199.00, payment_method: "支付宝", payment_app: "支付宝", category: "教育", note: "在线课程" },
  { id: 13, time: "2026-07-02 09:00", type: "income", merchant: "公司", product: "7月薪资", amount: 15000.00, payment_method: "银行卡", payment_app: "招商银行", category: "其他", note: "工资" },
  { id: 14, time: "2026-06-15 10:30", type: "income", merchant: "支付宝", product: "余额宝收益", amount: 86.50, payment_method: "支付宝", payment_app: "支付宝", category: "金融", note: "" },
  { id: 15, time: "2026-06-10 14:00", type: "neutral", merchant: "微信", product: "零钱通转入", amount: 2000.00, payment_method: "微信", payment_app: "微信支付", category: "金融", note: "" },
  { id: 16, time: "2026-05-20 11:00", type: "neutral", merchant: "理财通", product: "基金申购", amount: 1000.00, payment_method: "银行卡", payment_app: "微信支付", category: "金融", note: "" },
];

const MOCK_SUMMARY: TransactionSummary = {
  income_count: 2, income_amount: 15086.50,
  expense_count: 12, expense_amount: 5280.00,
  neutral_count: 2, neutral_amount: 3000.00,
  total_income: 15086.50, total_expense: 8280.00,
};

const PAGE_SIZE = 6;

interface Props {
  selectedMonth?: string;
  className?: string;
  refreshTrigger?: number;
}

export const TransactionTable = ({ selectedMonth, className = "", refreshTrigger = 0 }: Props) => {
  const { user } = useAuth();
  const isGuest = user === null;
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"time" | "amount">("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Guest data (static)
  const guestTransactions = useMemo(() => {
    let data = MOCK_DATA;
    if (selectedMonth) {
      data = data.filter((t) => t.time.startsWith(selectedMonth));
    }
    return data;
  }, [selectedMonth]);

  const guestSummary = useMemo(() => {
    const filtered = selectedMonth
      ? MOCK_DATA.filter((t) => t.time.startsWith(selectedMonth))
      : MOCK_DATA;
    return {
      income_count: filtered.filter((t) => t.type === "income").length,
      income_amount: filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense_count: filtered.filter((t) => t.type === "expense").length,
      expense_amount: filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      neutral_count: filtered.filter((t) => t.type === "neutral").length,
      neutral_amount: filtered.filter((t) => t.type === "neutral").reduce((s, t) => s + t.amount, 0),
      total_income: filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      total_expense: filtered.reduce((s, t) => s + t.amount, 0),
    };
  }, [selectedMonth]);

  // Logged-in: backend data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, month] = useMemo(() => {
    if (!selectedMonth) return ["", ""];
    const parts = selectedMonth.split("-");
    return [parts[0] || "", parts[1] || ""];
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    if (isGuest) return;
    setLoading(true);
    setError(null);
    try {
      let res;
      // 有年月筛选时使用 POST，否则使用 GET
      if (year || month) {
        res = await filterTransactions(year || "", month || "");
      } else {
        res = await getTransactions({
          page,
          page_size: PAGE_SIZE,
        });
      }
      const data = res.data?.data;
      if (data) {
        setTransactions(data.list || []);
        setTotal(data.total || 0);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "加载交易记录失败");
      setTransactions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [year, month, page, isGuest, refreshTrigger]);

  useEffect(() => {
    if (isGuest) return;
    fetchData();
  }, [fetchData, isGuest]);

  useEffect(() => {
    setPage(1);
  }, [selectedMonth]);

  // Determine display data
  const displayTransactions = useMemo(() => {
    if (isGuest) return guestTransactions;
    return transactions;
  }, [isGuest, guestTransactions, transactions]);

  const displaySummary = useMemo(() => {
    if (isGuest) return guestSummary;
    return summary;
  }, [isGuest, guestSummary, summary]);

  const displayTotal = useMemo(() => {
    if (isGuest) return guestTransactions.length;
    return total;
  }, [isGuest, guestTransactions.length, total]);

  const displayLoading = !isGuest && loading;
  const displayError = !isGuest ? error : null;
  const isEmpty = !isGuest && !loading && !error && transactions.length === 0 && total === 0;
  const isGuestEmpty = isGuest && guestTransactions.length === 0;

  // Sort
  const sorted = useMemo(() => {
    return [...displayTransactions].sort((a, b) => {
      const va = sortKey === "time" ? a.time : a.amount;
      const vb = sortKey === "time" ? b.time : b.amount;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [displayTransactions, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(displayTotal / PAGE_SIZE));
  const current = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: "time" | "amount") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "time" ? "desc" : "desc");
    }
    setPage(1);
  };

  const formatAmount = (amount: number) => `¥${amount.toFixed(2)}`;

  const formatTime = (t: string) => t.replace(/:(\d{2})$/, ""); // 去掉末尾秒数

  /* ─── Sparkline ─── */
  const Spark = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const w = 80, h = 28;
    const pts = data
      .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`)
      .join(" ");
    const id = `s-${color.replace(/\s/g, "")}`;
    return (
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} className="animate-draw" />
      </svg>
    );
  };

  /* ─── TiltCard ─── */
  const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
    const tilt = useTilt(6);
    return (
      <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave} style={tilt.style} className={className}>
        {children}
      </div>
    );
  };

  /* ─── Stat Cards ─── */
  const statCards = useMemo(() => {
    if (!displaySummary) return [];
    const s = displaySummary;
    return [
      {
        label: "收入",
        value: formatAmount(s.income_amount),
        delta: `${s.income_count} 笔`,
        icon: TrendingUp,
        color: "from-emerald-500 to-teal-400",
        spark: [3, 6, 4, 8, 5, 9, 7, 11, 8, 12],
        badgeColor: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
      },
      {
        label: "支出",
        value: formatAmount(s.expense_amount),
        delta: `${s.expense_count} 笔`,
        icon: TrendingDown,
        color: "from-rose-500 to-pink-400",
        spark: [8, 12, 10, 14, 11, 15, 12, 10, 13, 9],
        badgeColor: "text-rose-300 bg-rose-400/10 border-rose-400/20",
      },
      {
        label: "中性交易",
        value: formatAmount(s.neutral_amount),
        delta: `${s.neutral_count} 笔`,
        icon: Minus,
        color: "from-amber-500 to-orange-400",
        spark: [2, 4, 3, 5, 4, 6, 5, 7, 6, 8],
        badgeColor: "text-amber-300 bg-amber-400/10 border-amber-400/20",
      },
    ];
  }, [displaySummary]);

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* ═══ Guest Banner ═══ */}
      {isGuest && (
        <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3 animate-fade-in" style={{ border: "1px solid rgba(251,191,36,0.2)" }}>
          <UserRound size={16} className="text-amber-400/70 shrink-0" />
          <p className="text-[12px] text-white/50">
            当前为<span className="text-amber-400 font-semibold">未登录</span>状态，显示默认示例数据。
            <span className="text-amber-400/70 font-medium"> 登录</span>后可查看和管理自己的交易记录
          </p>
        </div>
      )}

      {/* ═══ Stat Cards ═══ */}
      {displaySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <TiltCard key={s.label} className="glass glass-hover noise relative rounded-3xl p-5 overflow-hidden">
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
                <div className="relative flex items-start justify-between mb-6">
                  <div className={`w-10 h-10 rounded-[50%] bg-gradient-to-br ${s.color} grid place-items-center shadow-lg`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold ${s.badgeColor} px-2 py-1 rounded-full border`}>
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
      )}

      {/* ═══ Transaction Table ═══ */}
      <div className="glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Transactions</p>
            <h4 className="text-lg font-semibold">交易记录</h4>
          </div>
          <div className="flex items-center gap-2">
            {displayError && (
              <button onClick={fetchData} className="flex items-center gap-1 text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors">
                <RefreshCw size={12} /> 重试
              </button>
            )}
            <Badge variant="outline" className="border-white/10 bg-white/5 text-white/60">
              {displayTotal} records
            </Badge>
          </div>
        </div>

        {/* Loading state */}
        {displayLoading ? (
          <div className="space-y-3" style={{ minHeight: "252px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[38px] rounded-2xl bg-white/[0.03] animate-pulse" style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : displayError ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "252px" }}>
            <AlertCircle size={32} className="text-rose-400/40" />
            <p className="text-sm text-rose-400/60">{displayError}</p>
            <button onClick={fetchData} className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-all">
              点击重试
            </button>
          </div>
        ) : isEmpty ? (
          /* Empty state (logged-in, no data) */
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "252px" }}>
            <Receipt size={32} className="text-white/10" />
            <p className="text-sm text-white/30">暂无交易记录</p>
            <p className="text-[10px] text-white/15">点击"导入 CSV"按钮导入微信账单</p>
          </div>
        ) : displayTransactions.length === 0 && isGuestEmpty ? (
          /* Empty guest state */
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "252px" }}>
            <Receipt size={32} className="text-white/10" />
            <p className="text-sm text-white/30">暂无匹配记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <div className="grid min-w-[980px] grid-cols-[0.8fr_1fr_0.8fr_0.5fr_0.7fr_0.6fr_0.6fr_0.5fr] gap-0 px-4 pb-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">
                <button className="text-left flex items-center gap-1 hover:text-white/50 transition-colors" onClick={() => toggleSort("time")}>
                  交易时间 {sortKey === "time" && (sortDir === "desc" ? "↓" : "↑")}
                </button>
                <div className="text-left">商家</div>
                <div className="text-left">商品</div>
                <div className="text-center">收支</div>
                <button className="text-right flex items-center justify-end gap-1 hover:text-white/50 transition-colors" onClick={() => toggleSort("amount")}>
                  金额 {sortKey === "amount" && (sortDir === "desc" ? "↓" : "↑")}
                </button>
                <div className="text-center">支付</div>
                <div className="text-center">分类</div>
                <div className="text-left">备注</div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] min-w-[980px]" style={{ minHeight: "252px", transition: "min-height 0.3s ease" }}>
                {current.map((tx, i) => {
                  const catColor = CAT_COLORS[tx.category] || "#94a3b8";
                  const typeCfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.expense;
                  const isExpense = tx.type === "expense";
                  return (
                    <div key={tx.id}
                      className="grid min-w-[980px] grid-cols-[0.8fr_1fr_0.8fr_0.5fr_0.7fr_0.6fr_0.6fr_0.5fr] gap-0 px-4 py-3 border-b border-white/[0.08] last:border-b-0 transition-colors bg-white/[0.025] hover:bg-white/[0.04]"
                    >
                      <div className="text-xs text-white/50 self-center truncate">{formatTime(tx.time)}</div>
                      <div className="text-xs text-white/80 self-center truncate font-medium">{tx.merchant}</div>
                      <div className="text-xs text-white/60 self-center truncate">{tx.product}</div>
                      <div className="self-center flex justify-center">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeCfg.bg} ${typeCfg.border} border ${typeCfg.color}`}>{typeCfg.label}</span>
                      </div>
                      <div className={`text-xs self-center text-right font-mono font-semibold tabular-nums ${isExpense ? "text-rose-400/80" : tx.type === "income" ? "text-emerald-400/80" : "text-amber-400/60"}`}>
                        {isExpense ? "-" : ""}¥{tx.amount.toFixed(2)}
                      </div>
                      <div className="self-center flex justify-center text-[10px] text-white/40">
                        {tx.payment_app || tx.payment_method || "—"}
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

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/30">Page {page} of {totalPages} · {displayTotal} records</div>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(255,255,255,0.06)" }}
                  disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                ><ChevronLeft className="h-4 w-4" style={{ color: page === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
                <button className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(255,255,255,0.06)" }}
                  disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                ><ChevronRight className="h-4 w-4" style={{ color: page === totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
