import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { getUsers } from "@/api/user";
import { resolveAvatar } from "@/lib/avatar";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { Badge } from "@/components/ui/badge";

interface User {
  id?: number;
  user_id?: number;
  ID?: number;
  username?: string;
  email?: string;
  website?: string;
  status?: string;
  avatar?: string;
}

interface UserTableProps {
  className?: string;
}

const PAGE_SIZE = 5;

export const UserTable = ({ className = "" }: UserTableProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        setUsers(
          list.map((item: User & { id?: number }) => ({
            ...item,
            id: item.id ?? item.user_id ?? item.ID,
          })),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    return [...users].sort((a, b) => {
      const aActive = String(a.status || "").toLowerCase() === "active";
      const bActive = String(b.status || "").toLowerCase() === "active";
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Users</p>
          <h4 className="text-lg font-semibold">User List</h4>
        </div>
        <Badge variant="outline" className="border-white/10 bg-white/5 text-white/60">
          {filtered.length} total
        </Badge>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        {loading ? (
          <div className="space-y-3 py-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-white/30">
            <Users size={24} />
            <p className="text-xs">Failed to load users</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.2fr_1.25fr_1fr_0.8fr] gap-0 px-4 pb-3 text-[10px] font-semibold tracking-wider uppercase text-white/30 min-w-[500px]">
              <div>Name</div>
              <div className="text-center">Email</div>
              <div className="text-center">Website</div>
              <div className="text-center">Status</div>
            </div>
            <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08]">
              {current.map((u, index) => (
                <div
                  key={u.id ?? `user-${index}`}
                  className={`grid grid-cols-[1.2fr_1.25fr_1fr_0.8fr] gap-0 px-4 py-3 border-b border-white/[0.08] last:border-b-0 transition-colors min-w-[500px] ${String(u.status || "").toLowerCase() === "active" ? "bg-emerald-400/10 hover:bg-emerald-400/14" : "bg-white/[0.025] hover:bg-white/[0.04]"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-neon-pink via-neon-purple to-neon-blue grid place-items-center text-[10px] font-bold overflow-hidden">
                      {resolveAvatar(u.avatar) ? (
                        <>
                          <img
                            src={resolveAvatar(u.avatar)!}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              img.style.display = "none";
                              const fallback = img.parentElement?.querySelector<HTMLElement>("[data-avatar-fallback]");
                              if (fallback) fallback.style.display = "grid";
                            }}
                          />
                          <span data-avatar-fallback className="hidden w-full h-full place-items-center">
                            {(u.username || "?").charAt(0).toUpperCase()}
                          </span>
                        </>
                      ) : (
                        (u.username || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate">{u.username || "Unknown"}</p>
                  </div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{u.email || "—"}</div>
                  <div className="text-xs text-white/50 truncate self-center text-center">{u.website || "—"}</div>
                  <div className="self-center flex justify-center">
                    <Badge
                      variant="outline"
                      className={`border-white/10 ${String(u.status || "").toLowerCase() === "active" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/5 text-white/70"}`}
                    >
                      {u.status || "inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/30">Page {page} of {totalPages}</div>
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
                ><ChevronLeft className="h-4 w-4" style={{ color: page === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
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
                ><ChevronRight className="h-4 w-4" style={{ color: page === totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }} /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
