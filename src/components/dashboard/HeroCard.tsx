import { useRef, useState, useCallback } from "react";
import { ArrowUpRight, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const HeroCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setTilt({ x, y });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleWatchRecap = () => {
    toast.success("Video recap loaded", {
      description: "Playing quarterly performance summary",
    });
  };

  const handleViewReport = () => {
    toast("Report generated", {
      description: "Full report available for download",
    });
  };

  return (
    <div className="animate-hero-float">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-[2rem] overflow-hidden group tilt-card"
        style={{
          transform: `perspective(800px) rotateX(${-tilt.y * 4}deg) rotateY(${tilt.x * 4}deg)`,
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        }}
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background:
              "linear-gradient(135deg, #6d28d9 0%, #4f46e5 35%, #0891b2 75%, #06b6d4 100%)",
            backgroundSize: "200% 200%",
          }}
        />

        {/* Radial blobs */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, rgba(244, 114, 182, 0.6), transparent 50%), radial-gradient(circle at 10% 90%, rgba(34, 211, 238, 0.5), transparent 50%)",
          }}
        />
        <div className="absolute inset-0 noise" />

        {/* Moving light sweep */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 h-full w-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
              transform: "skewX(-20deg)",
              animation: "light-sweep 4s ease-in-out infinite",
            }}
          />
        </div>

        {/* Glow blobs */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, #f0abfc, transparent 70%)" }}
        />
        <div
          className="absolute -left-10 -bottom-10 w-72 h-72 rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #67e8f9, transparent 70%)" }}
        />

        {/* Content */}
        <div className="relative p-8 md:p-10 min-h-[280px] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium">
              <Sparkles size={12} /> AI-Powered Insights
            </div>
            <button
              className="w-11 h-11 rounded-[50%] bg-white/15 backdrop-blur-md grid place-items-center hover:bg-white/25 active:scale-[0.97] transition-all"
              onClick={() => toast("Opening detailed analytics...")}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="max-w-xl">
            <p className="text-white/70 text-sm font-medium mb-2">
              Quarterly Performance
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-2">
              Your revenue jumped{" "}
              <span className="italic font-light">38.2%</span> this quarter
            </h2>
            <p className="text-white/70 text-sm md:text-base max-w-md">
              Driven by a surge in enterprise upgrades and a 2.4× lift in
              conversion from the new onboarding flow.
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex gap-3">
              <button
                onClick={handleWatchRecap}
                className="relative overflow-hidden px-5 py-3 rounded-xl bg-white text-zinc-900 text-sm font-semibold hover:scale-[1.02] active:scale-[0.97] transition-transform inline-flex items-center gap-2"
                onMouseDown={(e) => {
                  const btn = e.currentTarget;
                  const ripple = document.createElement("span");
                  ripple.className = "ripple-effect animate-ripple";
                  const rect = btn.getBoundingClientRect();
                  const size = Math.max(rect.width, rect.height);
                  ripple.style.width = ripple.style.height = `${size}px`;
                  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
                  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
                  btn.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                }}
              >
                <Play size={14} fill="currentColor" /> Watch Recap
              </button>
              <button
                onClick={handleViewReport}
                className="relative overflow-hidden px-5 py-3 rounded-xl bg-white/10 backdrop-blur-md text-sm font-semibold hover:bg-white/20 active:scale-[0.97] transition-all"
                onMouseDown={(e) => {
                  const btn = e.currentTarget;
                  const ripple = document.createElement("span");
                  ripple.className = "ripple-effect animate-ripple";
                  const rect = btn.getBoundingClientRect();
                  const size = Math.max(rect.width, rect.height);
                  ripple.style.width = ripple.style.height = `${size}px`;
                  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
                  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
                  btn.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                }}
              >
                View Report
              </button>
            </div>

            <div className="flex gap-6">
              {[
                { l: "MRR", v: "$284K", d: "+12%" },
                { l: "Churn", v: "1.2%", d: "-0.4%" },
                { l: "NPS", v: "72", d: "+8" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">
                    {s.l}
                  </p>
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-[10px] text-emerald-200 font-medium">
                    {s.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
