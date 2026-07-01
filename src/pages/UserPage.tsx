import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { UserTable } from "@/components/dashboard/UserTable";
import { VisitorTable } from "@/components/dashboard/VisitorTable";
import { DailyVisitorTable } from "@/components/dashboard/DailyVisitorTable";
import { Particles } from "@/components/dashboard/Particles";
import { useAuth } from "@/components/dashboard/AuthProvider";

export default function UserPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen w-full">
      <Particles />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-ambient-glow" style={{ background: "radial-gradient(circle, hsla(270, 95%, 50%, 0.15), transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-ambient-glow" style={{ background: "radial-gradient(circle, hsla(190, 100%, 50%, 0.1), transparent 70%)", animationDelay: "3s" }} />
      </div>
      <Sidebar />
      <main className="relative z-10 lg:pl-32 pr-6 pl-6 py-8 max-w-[1600px] mx-auto">
        <TopNav />
        <div className="flex flex-col gap-6">
          <UserTable key={`user-${user?.id ?? "guest"}`} />
          <VisitorTable key={`visitor-${user?.id ?? "guest"}`} />
          <DailyVisitorTable key={`daily-${user?.id ?? "guest"}`} />
        </div>
      </main>
    </div>
  );
}
