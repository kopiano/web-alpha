import { useState, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { MonthlyExpenseChart } from "@/components/dashboard/MonthlyExpenseChart";
import { Particles } from "@/components/dashboard/Particles";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [monthOpen, setMonthOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const months = [
    { value: "2026-07", label: "July 2026" },
    { value: "2026-06", label: "June 2026" },
    { value: "2026-05", label: "May 2026" },
    { value: "2026-04", label: "April 2026" },
    { value: "2026-03", label: "March 2026" },
    { value: "2026-02", label: "February 2026" },
    { value: "2026-01", label: "January 2026" },
  ];

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      console.log("CSV content:", text);
      toast.success(`Imported ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const glassBtnStyle: React.CSSProperties = {
    background: "rgba(195,195,210,0.12)",
    backdropFilter: "blur(50px) saturate(180%)",
    WebkitBackdropFilter: "blur(50px) saturate(180%)",
    border: "0.5px solid rgba(255,255,255,0.15)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
  };

  return (
    <div className="relative min-h-screen w-full">
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
          <div className="flex items-center justify-between gap-4 px-5 py-3"
            style={{
              background: "rgba(195,195,210,0.10)",
              backdropFilter: "blur(50px) saturate(180%)",
              WebkitBackdropFilter: "blur(50px) saturate(180%)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              boxShadow: "0 4px 20px -8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
              borderRadius: "2rem",
            }}>

            {/* Month Filter — dropdown */}
            <div className="relative">
              <button
                onClick={() => setMonthOpen(!monthOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-[2rem] text-[12px] font-medium transition-all duration-200"
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
                {months.find((m) => m.value === selectedMonth)?.label || "Select month"}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4, transform: monthOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {monthOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMonthOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 z-[999] min-w-[200px] py-1.5 rounded-[1.25rem] overflow-hidden animate-dropdown-in"
                    style={{
                      background: "rgba(18,16,28,0.96)",
                      backdropFilter: "blur(60px) saturate(180%)",
                      WebkitBackdropFilter: "blur(60px) saturate(180%)",
                      border: "0.5px solid rgba(255,255,255,0.10)",
                      boxShadow: "0 20px 60px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}>
                    {months.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => { setSelectedMonth(m.value); setMonthOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-medium transition-all duration-150"
                        style={{
                          color: selectedMonth === m.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                          background: selectedMonth === m.value ? "rgba(255,255,255,0.06)" : "transparent",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = selectedMonth === m.value ? "rgba(255,255,255,0.06)" : "transparent"; e.currentTarget.style.color = selectedMonth === m.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"; }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Import CSV Button */}
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium transition-all duration-200 active:scale-95"
              style={{...glassBtnStyle, borderRadius: "2rem"}}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(195,195,210,0.18)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(195,195,210,0.12)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              <Upload size={15} className="text-white/60" />
              <span className="text-white/80">Import CSV</span>
            </button>
          </div>

          <TransactionTable key={`tx-${user?.id ?? "guest"}`} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpensePieChart key={`pie-${user?.id ?? "guest"}`} />
            <MonthlyExpenseChart key={`line-${user?.id ?? "guest"}`} />
          </div>
        </div>
      </main>
    </div>
  );
}
