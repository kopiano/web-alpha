import { useEffect, useState } from "react";
import { Eye, Globe, Users } from "lucide-react";
import { getVisitorStats } from "@/api/visitor";

const VISITOR_ID_KEY = "visitor_id";
const DEVICE_FINGERPRINT_KEY = "device_fingerprint";

function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1) + "k";
  return (n / 10000).toFixed(1) + "w";
}

function getDeviceFingerprint(): string {
  try {
    return [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.platform,
    ].join("|");
  } catch {
    return navigator.userAgent || "unknown";
  }
}

function readFingerprint(): string {
  const stored = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (stored) return stored;
  const fp = getDeviceFingerprint();
  localStorage.setItem(DEVICE_FINGERPRINT_KEY, fp);
  return fp;
}

function readVisitorId(): string {
  return localStorage.getItem(VISITOR_ID_KEY) || "";
}

function formatLocation(data: any): string {
  const country = data?.country || "";
  const city = data?.city || "";
  const ip = data?.ip || "";
  if (country) {
    return city && city !== country ? `${country} · ${city}` : country;
  }
  if (ip) return ip;
  return "--";
}

export const VisitorCounter = () => {
  const [pv, setPv] = useState<number | null>(null);
  const [uv, setUv] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("--");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getVisitorStats({
          visitor_id: readVisitorId(),
          fingerprint: readFingerprint(),
        });
        const d = res.data?.data || res.data || {};
        setPv(Number(d.total_pv ?? d.pv ?? 0));
        setUv(Number(d.total_uv ?? d.uv ?? 0));
        // Use current_visitor from backend identification
        const cv = d.current_visitor;
        if (cv) {
          setLocationLabel(formatLocation(cv));
        }
      } catch {
        /* ignore */
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2 rounded-full"
      style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center gap-1.5" title="Total Visits">
        <Eye size={12} className="text-white/60" />
        <span className="text-[11px] font-medium text-white/85 tabular-nums">
          {pv === null ? "--" : formatCompact(pv)}
        </span>
      </div>

      <span className="text-white/10 text-[10px] select-none">|</span>

      <div className="flex items-center gap-1.5" title="Unique Visitors">
        <Users size={12} className="text-white/60" />
        <span className="text-[11px] font-medium text-white/85 tabular-nums">
          {uv === null ? "--" : formatCompact(uv)}
        </span>
      </div>

      <span className="text-white/10 text-[10px] select-none">|</span>

      <div className="flex items-center gap-1.5" title={locationLabel}>
        <Globe size={12} className="text-white/60" />
        <span className="max-w-[130px] truncate text-[11px] font-medium text-white/70 tabular-nums">
          {locationLabel}
        </span>
      </div>
    </div>
  );
};
