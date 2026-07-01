import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { MonthlyExpenseChart } from "@/components/dashboard/MonthlyExpenseChart";
import { Particles } from "@/components/dashboard/Particles";
import { useAuth } from "@/components/dashboard/AuthProvider";

export default function AnalyticsPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen w-full">
      <Particles />
      {/* Ambient glow backgrounds */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(220, 100%, 55%, 0.12), transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(170, 100%, 50%, 0.08), transparent 70%)", animationDelay: "3s" }} />
      </div>

      <Sidebar />
      <main className="relative z-10 lg:pl-32 pr-6 pl-6 py-8 max-w-[1600px] mx-auto">
        <TopNav />
        <div className="flex flex-col gap-6">
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
