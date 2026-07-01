import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Globe2 } from "lucide-react";
import { getVisitors } from "@/api/visitor";
import { resolveAvatar } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";

interface Visitor {
  id?: number | string;
  ip?: string;
  country?: string;
  city?: string;
  location?: string;
  os?: string;
  device?: string;
  browser?: string;
  duration?: string | number;
  last_seen?: string;
  status?: string;
  user_name?: string;
  avatar?: string;
}

interface VisitorTableProps {
  className?: string;
}

const PAGE_SIZE = 5;

const unwrapList = (input: any): Visitor[] => {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== "object") return [];
  const candidates = [
    input.list, input.items, input.rows, input.records,
    input.data, input.result, input.visitors, input.payload,
  ];
  for (const candidate of candidates) {
    const list = unwrapList(candidate);
    if (list.length) return list;
  }
  return [];
};

const readTotal = (input: any): number | undefined =>
  input?.total ?? input?.total_count ?? input?.count ??
  input?.totalItems ?? input?.totalItemsCount ??
  input?.pagination?.total ?? input?.pageInfo?.total;

const avatarGradients = [
  "from-violet-400 to-cyan-400", "from-pink-400 to-violet-400",
  "from-emerald-400 to-cyan-400", "from-amber-400 to-rose-400",
  "from-blue-400 to-indigo-400",
];

const getAvatarGradient = (seed: string) => {
  const code = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarGradients[Math.abs(code) % avatarGradients.length];
};

const formatDuration = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "0s";
  if (typeof value === "string") {
    const compact = value.trim();
    const hms = compact.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (hms) {
      const [, h, m, s] = hms;
      return formatDuration(Number(h) * 3600 + Number(m) * 60 + Number(s));
    }
    const textual = compact.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (textual) {
      const h = Number(textual[1] || 0);
      const m = Number(textual[2] || 0);
      const s = Number(textual[3] || 0);
      if (h + m + s > 0) return formatDuration(h * 3600 + m * 60 + s);
    }
  }
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h ? `${h}h` : "", m ? `${m}m` : "", s || (!h && !m) ? `${s}s` : ""].join("");
};

const formatLastSeen = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const shortId = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  const idx = text.indexOf("-");
  return idx > 0 ? text.slice(0, idx) : text.slice(0, 8);
};

const formatLocation = (visitor: Visitor) => {
  if (visitor.location) return visitor.location;
  const country = visitor.country && visitor.country !== "—" ? visitor.country : "";
  const city = visitor.city && visitor.city !== "—" ? visitor.city : "";
  if (!country && !city) return "—";
  if (!city || city === country) return country || city;
  return `${country} · ${city}`;
};

const isLiveStatus = (value: unknown) => {
  const status = String(value || "").toLowerCase();
  return status === "active";
};

const normalizeVisitor = (item: any): Visitor => ({
  id: item?.id ?? item?.ID ?? item?._id ?? item?.visitor_id,
  ip: item?.ip ?? item?.client_ip ?? item?.clientIp ?? item?.remote_ip ?? item?.remoteIp ?? "—",
  country: item?.country ?? item?.visitor_country ?? item?.geo?.country ?? "—",
  city: item?.city ?? item?.visitor_city ?? item?.geo?.city ?? "—",
  location: item?.location ?? item?.country_city ?? item?.countryCity,
  os: item?.os ?? item?.platform,
  device: item?.device ?? item?.device_type ?? item?.deviceType ?? item?.os ?? "—",
  browser: item?.browser ?? item?.browser_name ?? item?.browserName ?? "—",
  duration: item?.duration ?? item?.total_duration ?? item?.totalDuration ?? item?.browse_time ?? item?.browseTime ?? "—",
  last_seen: item?.last_seen ?? item?.lastSeen ?? item?.updated_at ?? item?.updatedAt ?? "—",
  status: item?.status ?? "unknown",
  user_name: item?.user_name ?? item?.userName ?? item?.username ?? "Guest",
  avatar: item?.avatar ?? item?.avatar_url ?? item?.avatarUrl ?? "",
});

export const VisitorTable = ({ className = "" }: VisitorTableProps) => {
  const [items, setItems] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [serverPaging, setServerPaging] = useState<{ total?: number; page?: number; pageSize?: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const load = async () => {
      try {
        const res = await getVisitors({
          page, pageNum: page, current: page,
          page_size: PAGE_SIZE, pageSize: PAGE_SIZE, limit: PAGE_SIZE,
          per_page: PAGE_SIZE, size: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
        });
        const payload = res.data?.data ?? res.data ?? {};
        const list = unwrapList(payload);
        setItems(Array.isArray(list) ? list.map(normalizeVisitor) : []);
        setServerPaging({
          total: readTotal(payload),
          page: payload.page ?? payload.page_num ?? payload.pageNum ?? payload.current_page ?? payload.currentPage ?? payload.current ?? page,
          pageSize: payload.page_size ?? payload.pageSize ?? payload.limit ?? payload.size ?? PAGE_SIZE,
        });
      } catch (err) {
        console.error("Failed to load visitor list", err);
        setItems([]);
        setServerPaging(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page]);

  const total = serverPaging?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <div className={`glass glass-hover noise rounded-3xl p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Visitors</p>
          <h4 className="text-lg font-semibold">Visitor Information</h4>
        </div>
        <Badge variant="outline" className="border-white/10 bg-white/5 text-white/60">{items.length} total</Badge>
      </div>

      {loading ? (
        <div className="space-y-3 py-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-white/30">
          <Globe2 size={24} />
          <p className="text-xs">Failed to load visitor list</p>
        </div>
      ) : current.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-white/30">
          <Globe2 size={24} />
          <p className="text-xs">Visitor list is empty</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin">
            <div className="grid min-w-[980px] grid-cols-[1.2fr_0.8fr_1fr_1.25fr_1.2fr_0.8fr_0.9fr_0.8fr] gap-0 px-4 pb-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">
              <div>User</div><div className="text-center">Visitor ID</div><div className="text-center">IP</div><div className="text-center">Location</div><div className="text-center">Device · Browser</div><div className="text-center">Duration</div><div className="text-center">Last Seen</div><div className="text-center">Status</div>
            </div>
            <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] min-w-[980px]">
              {current.map((v, i) => (
                <div
                  key={v.id ?? `${v.ip}-${i}`}
                  className="grid min-w-[980px] grid-cols-[1.2fr_0.8fr_1fr_1.25fr_1.2fr_0.8fr_0.9fr_0.8fr] gap-0 px-4 py-3 border-b border-white/[0.08] last:border-b-0 transition-colors bg-white/[0.025] hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3 min-w-0 self-center">
                    <div className={`w-9 h-9 rounded-full shrink-0 bg-gradient-to-br ${getAvatarGradient(String(v.id ?? v.ip ?? i))} grid place-items-center text-[10px] font-bold overflow-hidden text-white`}>
                      {resolveAvatar(v.avatar) ? (
                        <img src={resolveAvatar(v.avatar)!} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (v.user_name || "G").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/85 truncate">{v.user_name || "Guest"}</p>
                      <p className="text-[10px] text-white/30 truncate">{v.avatar ? "Signed visitor" : "Anonymous"}</p>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{shortId(v.id)}</div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{v.ip || "—"}</div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{formatLocation(v)}</div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{v.device || "—"} · {v.browser || "—"}</div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{formatDuration(v.duration)}</div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{formatLastSeen(v.last_seen)}</div>
                  <div className="self-center flex justify-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                        isLiveStatus(v.status)
                          ? "border-emerald-400/25 bg-emerald-400/18 text-emerald-50"
                          : "border-white/10 bg-white/5 text-white/70"
                      }`}
                    >
                      <i className={`inline-block h-1.5 w-1.5 rounded-full ${isLiveStatus(v.status) ? "bg-emerald-300" : "bg-white/30"}`} />
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-white/30">
              Page {serverPaging?.page ?? page} of {totalPages} {serverPaging?.total ? `· ${serverPaging.total} items` : ""}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 2px 8px rgba(255,255,255,0.06)",
                }}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              ><ChevronLeft className="h-4 w-4" style={{ color: page === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
              <button
                className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 2px 8px rgba(255,255,255,0.06)",
                }}
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              ><ChevronRight className="h-4 w-4" style={{ color: page === totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
