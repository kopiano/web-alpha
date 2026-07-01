import { useEffect, useState } from "react";
import { Calendar, BarChart3 } from "lucide-react";
import { getVisitorDaily } from "@/api/visitor";
import { Badge } from "@/components/ui/badge";

interface DailyRecord {
  id: number;
  date: string;
  uv: number;
  pv: number;
  created_at?: string;
  updated_at?: string;
}

const PAGE_SIZE = 5;

const formatDate = (raw: string) => {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const DailyVisitorTable = ({ className = "" }: { className?: string }) => {
  const [items, setItems] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getVisitorDaily()
      .then((res) => {
        const payload = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(payload) ? payload : payload.list ?? payload.records ?? [];
        setItems(list);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={`glass glass-hover noise rounded-3xl p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Daily Stats</p>
          <h4 className="text-lg font-semibold">Visitor Daily</h4>
        </div>
        <Badge variant="outline" className="border-white/10 bg-white/5 text-white/60">
          {items.length} days
        </Badge>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-white/30">
            <BarChart3 size={24} />
            <p className="text-xs">Failed to load daily stats</p>
          </div>
        ) : current.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-white/30">
            <Calendar size={24} />
            <p className="text-xs">No daily records yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-0 px-4 pb-3 text-[10px] font-semibold tracking-wider uppercase text-white/30 min-w-[360px]">
              <div>Date</div>
              <div className="text-center">PV</div>
              <div className="text-center">UV</div>
            </div>
            <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08]">
              {current.map((r) => (
                <div
                  key={r.id ?? r.date}
                  className="grid grid-cols-[0.8fr_1fr_1fr] gap-0 px-4 py-3 border-b border-white/[0.08] last:border-b-0 transition-colors bg-white/[0.025] hover:bg-white/[0.04] min-w-[360px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 self-center">
                    <Calendar size={14} className="text-white/30 shrink-0" />
                    <span className="text-xs font-medium text-white/80 truncate">{formatDate(r.date)}</span>
                  </div>
                  <div className="text-xs text-white/70 self-center text-center tabular-nums font-medium">
                    {r.pv.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/70 self-center text-center tabular-nums font-medium">
                    {r.uv.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/30">
                Page {page} of {totalPages} · {items.length} days
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 2px 8px rgba(255,255,255,0.06)",
                  }}
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  <span style={{ color: page === 1 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)" }}>‹</span>
                </button>
                <button
                  className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 2px 8px rgba(255,255,255,0.06)",
                  }}
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  <span style={{ color: page === totalPages ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)" }}>›</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
