import { BookOpen,Clock,ArrowRight,Eye,Lock,PencilLine } from "lucide-react";
import { resolveImageAvatar } from "@/lib/avatar";

/* ─── Doc Grid ─── */
interface DocGridProps {
  activeCat: number;
  ARTICLES: any[];
  filteredArticles: any[];
  featured: any | undefined;
  setSelectedIdx: (idx: number | null) => void;
  openArticle?: (article: any) => void;
  rc: string;
  TAG_COLORS: Record<string, string>;
  TAG_ICONS: Record<string, any>;
  usersById?: Map<number, any>;
}

export const DocGrid = ({ activeCat, ARTICLES, filteredArticles, featured, setSelectedIdx, openArticle, rc, TAG_COLORS, TAG_ICONS, usersById = new Map() }: DocGridProps) => {
  const visibilityLabel = (visibility?: number) => (visibility === 0 ? "private" : "public");
  const VisibilityIcon = (visibility?: number) => (visibility === 0 ? Lock : Eye);
  const editLabel = (editPermission?: number) => (editPermission === 1 ? "public" : "owner");
  const EditIcon = (editPermission?: number) => (editPermission === 1 ? PencilLine : Lock);
  const timeAgo = (value?: string) => {
    if (!value) return "";
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return "";
    const diff = Math.max(0, Date.now() - date.getTime());
    const mins = Math.max(1, Math.round(diff / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.max(1, Math.round(mins / 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.max(1, Math.round(hours / 24));
    return `${days}d ago`;
  };
  const avatarFallback = (article: any, fallbackLabel = "G") => {
    const text = String(article?.author || article?.username || fallbackLabel || "").trim();
    if (!text) return fallbackLabel;
    return text.slice(0, 1).toUpperCase();
  };
  const contributorIds = (article: any) => {
    const ids = Array.isArray(article?.contributors) ? article.contributors.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id >= 0) : [];
    if (ids.length > 0) return ids;
    const legacy = Number(article?.userId || article?.user_id || 0);
    return legacy > 0 ? [legacy] : [0];
  };
  const contributorAvatar = (user: any) => resolveImageAvatar(user?.avatar || user?.avatar_url || user?.avatarUrl) || "";
  const contributorLabel = (user: any, id: number) => String(user?.username || user?.name || (id === 0 ? "G" : "U")).slice(0, 2).toUpperCase();
  const isGuestArticle = (article: any) => Number(article?.userId || article?.user_id || 0) === 0;
  return (
    <>
      {featured && activeCat === 0 && (
        <div className="relative rounded-2xl overflow-hidden group cursor-pointer"
          style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.6), rgba(123,47,247,0.45))", boxShadow: "0 20px 60px -12px rgba(76,201,240,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" }}
          onClick={() => openArticle ? openArticle(featured) : setSelectedIdx(featured.id ?? ARTICLES.indexOf(featured))}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)" }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(76,201,240,0.3), transparent 70%)" }} />
          <div className="relative p-8 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[10px] font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/25">✦ Featured</span>
                <span className="text-[10px] text-white/60">{featured.date}</span>
                <span className="text-[10px] text-white/40">{featured.readTime}</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-3 text-white leading-[1.08]">{featured.title}</h2>
              <div className="text-[12px] text-white/70 leading-relaxed max-w-lg overflow-hidden">
                {MiniMd(featured.desc)}
              </div>
              <div className="flex items-center gap-5 mt-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-cyan-300 grid place-items-center text-[9px] font-bold shadow-lg">AM</div>
                  <span className="text-[12px] text-white/70">{featured.author}</span>
                </div>
                <span className="text-[11px] text-white/50">{featured.comments} comments</span>
              </div>
            </div>
            <div className="w-28 h-28 rounded-2xl bg-white/10 backdrop-blur-xl grid place-items-center shrink-0 ml-6 border border-white/15"><BookOpen size={32} className="text-white/40" /></div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filteredArticles.map((a, i) => (
        <div key={a.id ?? i} className={`${rc} min-h-[176px]`} onClick={() => openArticle ? openArticle(a) : setSelectedIdx(a.id ?? ARTICLES.indexOf(a))}>
            <div className="relative p-4 h-full">
              <div className="flex items-center justify-between gap-2 mb-8">
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-0.5 rounded-full border ${TAG_COLORS[a.tag] || "border-white/10 text-white/40"}`}>
                  {(() => { const Icon = TAG_ICONS[a.tag] || BookOpen; return <Icon size={10} />; })()}{a.tag}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-0.5 rounded-full border border-white/10 text-white/45 bg-white/[0.03]">
                  {(() => { const Icon = VisibilityIcon(a.visibility); return <Icon size={10} />; })()}
                  {visibilityLabel(a.visibility)}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-0.5 rounded-full border border-white/10 text-white/35 bg-white/[0.02]">
                  {(() => { const Icon = EditIcon(a.editPermission); return <Icon size={10} />; })()}
                  {editLabel(a.editPermission)}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight text-white/88 group-hover:text-white text-center leading-[1.35] line-clamp-3">{a.title}</h3>
              <div className="mt-2 flex items-center justify-start">
                <div className="flex items-center -space-x-2.5">
                  {contributorIds(a).slice(0, 10).map((id: number, idx: number) => {
                    const user = id > 0 ? usersById.get(id) : null;
                    const image = contributorAvatar(user);
                    const label = idx === 0 ? avatarFallback(a, isGuestArticle(a) ? "G" : a.author) : contributorLabel(user, id);
                    return (
                      <div
                        key={`${a.id ?? a.title}-${id}-${idx}`}
                        className={`w-[26px] h-[26px] rounded-full overflow-hidden shrink-0 border-[1.5px] border-[#0c0c14] grid place-items-center text-[8px] font-bold text-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] ${idx === 0 ? "bg-gradient-to-br from-violet-400/20 to-cyan-300/20" : "bg-white/[0.06]"}`}
                        title={user?.username || (id === 0 ? "Guest" : `User ${id}`)}
                      >
                        {image ? (
                          <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <span>{label}</span>
                        )}
                      </div>
                    );
                  })}
                  {contributorIds(a).length > 10 && (
                    <div className="w-[26px] h-[26px] rounded-full border-[1.5px] border-[#0c0c14] grid place-items-center text-[8px] font-bold text-white/55 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                      +{contributorIds(a).length - 10}
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute left-4 right-4 bottom-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock size={11} className="text-white/15" />
                  <span className="text-[10px] text-white/25">
                    {timeAgo(a.updatedAt || a.createdAt || a.date)}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full grid place-items-center border border-white/[0.08] bg-white/[0.03] transition-all duration-300 group-hover:border-blue-400/30 group-hover:bg-blue-400/10 group-hover:shadow-[0_0_14px_rgba(76,201,240,0.2)]">
                  <ArrowRight size={12} className="text-white/25 transition-all duration-300 group-hover:text-blue-300 group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
