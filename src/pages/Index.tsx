import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { StatCards } from "@/components/dashboard/StatCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RightCard } from "@/components/dashboard/RightCard";
import { PerformanceWidgets } from "@/components/dashboard/PerformanceWidgets";
import { StockChart } from "@/components/dashboard/StockChart";
import { Particles } from "@/components/dashboard/Particles";

const Index = () => {
  return (
    <div className="relative min-h-screen w-full">
      {/* Background Particles */}
      <Particles />

      {/* Music Player — now rendered in App.tsx */}

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(270, 95%, 50%, 0.15), transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(190, 100%, 50%, 0.1), transparent 70%)", animationDelay: "3s" }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="relative z-10 lg:pl-32 px-4 sm:px-6 py-4 sm:py-8 pb-20 lg:pb-8 max-w-[1600px] mx-auto">
        <TopNav />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="flex flex-col gap-6">
            <HeroCard />
            <StatCards />
            <RevenueChart />
            <PerformanceWidgets />
          </div>

          <RightCard />
        </div>

        <StockChart className="mt-6" />

        <footer className="mt-12 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/30">
          <p>© 2026 Nebula · Crafted with precision</p>
          <div className="flex gap-5">
            <a className="hover:text-white/70 transition-colors" href="#">Changelog</a>
            <a className="hover:text-white/70 transition-colors" href="#">Privacy</a>
            <a className="hover:text-white/70 transition-colors" href="#">Status · All systems normal</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
