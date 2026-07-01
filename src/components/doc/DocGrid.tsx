import { BookOpen, Clock, ArrowRight } from "lucide-react";

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
}

export const DocGrid = ({ activeCat, ARTICLES, filteredArticles, featured, setSelectedIdx, openArticle, rc, TAG_COLORS, TAG_ICONS }: DocGridProps) => {
  return (
    <>
      {featured && activeCat === 0 && (
        <div className="relative rounded-2xl overflow-hidden group cursor-pointer"
          style={{ background: "linear-gradient(135deg, rgba(76,201,240,0.6), rgba(123,47,247,0.45))", boxShadow: "0 20px 60px -12px rgba(76,201,240,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" }}
          onClick={() => openArticle ? openArticle(featured) : setSelectedIdx(ARTICLES.indexOf(featured))}>
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
              <p className="text-[14px] text-white/75 leading-relaxed max-w-lg">{featured.desc}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map((a, i) => (
          <div key={i} className={rc} onClick={() => openArticle ? openArticle(a) : setSelectedIdx(ARTICLES.indexOf(a))}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-0.5 rounded-full border ${TAG_COLORS[a.tag] || "border-white/10 text-white/40"}`}>
                  {(() => { const Icon = TAG_ICONS[a.tag] || BookOpen; return <Icon size={10} />; })()}{a.tag}
                </span>
                <span className="text-[9px] text-white/25">{a.readTime}</span>
              </div>
              <h3 className="text-[14px] font-semibold tracking-tight mb-2 text-white/85 group-hover:text-white">{a.title}</h3>
              <p className="text-[12px] text-white/45 leading-relaxed line-clamp-2">{a.desc}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.03]">
                <div className="flex items-center gap-2"><Clock size={11} className="text-white/15" /><span className="text-[10px] text-white/25">{a.date}</span></div>
                <ArrowRight size={14} className="text-white/20 group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
