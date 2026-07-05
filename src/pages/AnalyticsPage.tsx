import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { MonthlyExpenseChart } from "@/components/dashboard/MonthlyExpenseChart";
import { MerchantRanking } from "@/components/dashboard/MerchantRanking";
import { Particles } from "@/components/dashboard/Particles";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { useNotifications } from "@/components/dashboard/NotificationProvider";
import { importTransactions, getTransactionMonths } from "@/api/transactions";
import { Upload, Loader2, LogIn, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const { user, openAuth } = useAuth();
  const { push: pushNotification } = useNotifications();
  const authLoading = user === undefined;
  const isGuest = user === null;
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthOpen, setMonthOpen] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Guest mock months
  const guestMonths = ["2026-07", "2026-06", "2026-05"];

  // Fetch available months from backend
  useEffect(() => {
    if (user === undefined) return;
    if (isGuest) {
      setAvailableMonths(guestMonths);
      setLoadingMonths(false);
      if (!selectedMonth) setSelectedMonth(guestMonths[0]);
      return;
    }
    setLoadingMonths(true);
    getTransactionMonths()
      .then((res) => {
        const d = res.data?.data;
        const months = Array.isArray(d) ? d : Array.isArray(d?.months) ? d.months : [];
        setAvailableMonths(months);
        if (months.length > 0 && !selectedMonth) {
          setSelectedMonth(months[0]);
        }
      })
      .catch(() => {
        setAvailableMonths([]);
      })
      .finally(() => setLoadingMonths(false));
  }, [user, isGuest, refreshKey]);





  const months = isGuest ? guestMonths : availableMonths;
  const displayMonths = Array.isArray(months) ? months : [];
  const monthOptions = displayMonths.map((m) => ({ value: m, label: m }));

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isGuest) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("请选择 CSV 文件", { description: "仅支持 .csv 格式的账单文件" });
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const res = await importTransactions(file);
      const data = res.data?.data;
      setRefreshKey((k) => k + 1);

      toast.success(
        `导入成功！新增 ${data?.imported || 0} 条`,
        {
          description: data?.duplicates
            ? `跳过 ${data.duplicates} 条重复 · 收入 ${data.summary?.income_count || 0} 笔 ¥${(data.summary?.income_amount || 0).toFixed(2)} · 支出 ${data.summary?.expense_count || 0} 笔 ¥${(data.summary?.expense_amount || 0).toFixed(2)}`
            : data?.summary
              ? `收入 ${data.summary.income_count} 笔 ¥${data.summary.income_amount?.toFixed(2)} · 支出 ${data.summary.expense_count} 笔 ¥${data.summary.expense_amount?.toFixed(2)}`
              : undefined,
          duration: 5000,
        }
      );
      pushNotification({
        kind: "csv_upload",
        actor: user?.username || "Someone",
        object: "CSV",
        title: "imported CSV successfully",
        text: `Imported ${data?.imported || 0} transaction records`,
        dedupeKey: `csv_upload:${user?.id ?? "guest"}:${data?.imported || 0}:${selectedMonth || "all"}`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "导入失败";
      toast.error("导入失败", { description: msg });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const monthBtnRef = useRef<HTMLButtonElement>(null);

  const glassBtnStyle: React.CSSProperties = {
    background: "rgba(195,195,210,0.12)",
    backdropFilter: "blur(50px) saturate(180%)",
    WebkitBackdropFilter: "blur(50px) saturate(180%)",
    border: "0.5px solid rgba(255,255,255,0.15)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* 等待 auth 加载完成后再渲染 */}
      {authLoading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
        </div>
      ) : (<>
      <Particles />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(220, 100%, 55%, 0.12), transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(170, 100%, 50%, 0.08), transparent 70%)", animationDelay: "3s" }} />
      </div>

      <Sidebar />
      <main className="relative z-10 lg:pl-32 px-4 sm:px-6 py-4 sm:py-8 pb-20 lg:pb-8 max-w-[1600px] mx-auto">
        <TopNav />
        <div className="flex flex-col gap-6">

          {/* Filter + Import Bar */}
          <header
            className="flex items-center justify-between gap-4 px-5 py-3"
            style={{
              position: "sticky",
              top: "20px",
              zIndex: 30,
              background: "rgba(195,195,210,0.10)",
              backdropFilter: "blur(50px) saturate(180%)",
              WebkitBackdropFilter: "blur(50px) saturate(180%)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              boxShadow: "0 4px 20px -8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
              borderRadius: "2rem",
            }}>

            {/* Month Filter */}
            <div>
              <button
                ref={monthBtnRef}
                onClick={() => setMonthOpen(!monthOpen)}
                disabled={loadingMonths}
                className="flex items-center gap-2 px-4 py-2 rounded-[2rem] text-[12px] font-medium transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "rgba(195,195,210,0.12)",
                  backdropFilter: "blur(50px) saturate(180%)",
                  WebkitBackdropFilter: "blur(50px) saturate(180%)",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(195,195,210,0.18)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(195,195,210,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.6}}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {loadingMonths ? "加载中..." : selectedMonth ? monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth : "All records"}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4, transform: monthOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {monthOpen &&
                createPortal(
                  <div className="fixed inset-0 z-[99999]">
                    <div className="absolute inset-0" onClick={() => setMonthOpen(false)} />
                    <div className="absolute glass-strong rounded-2xl p-1.5 animate-dropdown-in overflow-hidden"
                      style={{
                        top: monthBtnRef.current ? monthBtnRef.current.getBoundingClientRect().bottom + 8 : 0,
                        left: monthBtnRef.current ? monthBtnRef.current.getBoundingClientRect().left : 0,
                        width: "120px",
                      }}>
                      <button onClick={() => { setSelectedMonth(""); setMonthOpen(false); }}
                        className="w-full text-left px-5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 hover:bg-white/5 relative"
                        style={{ color: !selectedMonth ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", background: !selectedMonth ? "rgba(255,255,255,0.04)" : "transparent" }}
                      >
                        {!selectedMonth && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />}
                        All records
                      </button>
                      <div className="h-px bg-white/[0.06] mx-3 my-1" />
                      {monthOptions.map((m) => (
                        <button key={m.value} onClick={() => { setSelectedMonth(m.value); setMonthOpen(false); }}
                          className="w-full text-left px-5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 hover:bg-white/5 relative"
                          style={{ color: selectedMonth === m.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", background: selectedMonth === m.value ? "rgba(255,255,255,0.05)" : "transparent" }}
                        >
                          {selectedMonth === m.value && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body,
                )}
            </div>

            {/* Import CSV + Clear Buttons */}
            <div
              id="header-bar" className="flex items-center" style={{ gap: "30px" }}>
              {/* Clear Button */}
              {!isGuest && (
                <button
                  onClick={() => setClearConfirmOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium transition-all duration-200 active:scale-95"
                  style={{
                    ...glassBtnStyle,
                    borderRadius: "2rem",
                    color: "rgba(255,255,255,0.55)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,100,100,0.12)"; e.currentTarget.style.borderColor = "rgba(255,100,100,0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(195,195,210,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.6}}>
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  <span>Clear data</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" disabled={importing || isGuest} />
              <button
                onClick={() => {
                  if (isGuest) {
                    openAuth("login");
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  ...glassBtnStyle,
                  borderRadius: "2rem",
                }}
                onMouseEnter={(e) => {
                  if (!importing) { e.currentTarget.style.background = "rgba(195,195,210,0.18)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(195,195,210,0.12)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              >
                {importing ? (
                  <Loader2 size={15} className="text-white/60 animate-spin" />
                ) : (
                  <Upload size={15} className="text-white/60" />
                )}
                <span className="text-white/80">{importing ? "导入中..." : "导入 CSV"}</span>
              </button>
            </div>
          </header>

          {/* Guest hint */}
          {isGuest && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full animate-fade-in"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <LogIn size={12} className="text-amber-400/40" />
                <span className="text-[11px] text-white/25 tracking-wide">
                  <span className="text-amber-400/40 font-medium">未登录</span> · 浏览示例数据
                </span>
              </div>
            </div>
          )}

          {/* Transaction table */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <TransactionTable
              key={`tx-${user?.id ?? "guest"}`}
              refreshTrigger={refreshKey}
              selectedMonth={selectedMonth}
            />
          </div>
          <div className="mt-6">
            <MerchantRanking selectedMonth={selectedMonth} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpensePieChart key={`pie-${user?.id ?? "guest"}-${refreshKey}`} selectedMonth={selectedMonth} />
            <MonthlyExpenseChart key={`line-${user?.id ?? "guest"}-${refreshKey}`} />
          </div>
        </div>
      </main>

      {/* ═══ Clear Confirm Modal ═══ */}
      {clearConfirmOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}>
          <div className="glass-strong rounded-2xl p-6 w-[320px] animate-dropdown-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full grid place-items-center" style={{ background: "rgba(255,80,80,0.12)" }}>
                  <AlertTriangle size={15} className="text-rose-400/70" />
                </div>
                <span className="text-sm font-semibold text-white/90">Clear data</span>
              </div>
              <button onClick={() => setClearConfirmOpen(false)} className="w-7 h-7 rounded-full grid place-items-center hover:bg-white/[0.06] transition-colors">
                <X size={13} className="text-white/40" />
              </button>
            </div>
            <p className="text-[13px] text-white/50 leading-relaxed mb-5">
              Delete all your transaction records?<br />
              <span className="text-rose-400/60">This action cannot be undone.</span>
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setClearConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200 hover:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)" }}>
                Cancel
              </button>
              <button onClick={() => {
                setClearConfirmOpen(false);
                import('@/api/transactions').then(({ deleteTransactions }) => {
                  deleteTransactions().then(() => {
                    setRefreshKey((k) => k + 1);
                    pushNotification({
                      kind: "transaction_cleared",
                      actor: user?.username || "Someone",
                      object: "transactions",
                      title: "cleared transactions",
                      text: "All transaction data cleared",
                      dedupeKey: `transaction_cleared:${user?.id ?? "guest"}:${Date.now()}`,
                    });
                    toast.success("All transaction data cleared");
                  }).catch(() => toast.error("Clear failed"));
                });
              }}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200"
                style={{ background: "rgba(255,80,80,0.12)", color: "rgba(255,100,100,0.85)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,80,80,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,80,80,0.12)"; }}>
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </>)}
    </div>
  );
}
