import { useState } from "react";
import { BookOpen,Activity,ArrowRight } from "lucide-react";
import type { Article } from "@/hooks/useArticles";

interface TimelineTabProps {
  filteredArticles: Article[];
  articles: Article[];
  setSelectedIdx: (idx: number | null) => void;
  openArticle?: (article: Article) => void;
  TAG_COLORS: Record<string, string>;
  TAG_ICONS: Record<string, any>;
}

export const TimelineTab = ({ filteredArticles, articles, setSelectedIdx, openArticle, TAG_COLORS, TAG_ICONS }: TimelineTabProps) => {
  const [timelineYear, setTimelineYear] = useState("2026");
  const [timelineMonth, setTimelineMonth] = useState("");

  const availableMonths = [...new Set(articles.filter(a => a.date?.slice(0, 4) === timelineYear).map(a => a.date?.slice(5, 7)))].sort();
  const timelineArticles = [...filteredArticles].filter(a => {
    const y = a.date?.slice(0, 4);
    const m = a.date?.slice(5, 7);
    if (timelineMonth && `${y}-${m}` !== `${timelineYear}-${timelineMonth}`) return false;
    if (!timelineMonth && y !== timelineYear) return false;
    return true;
  }).sort((a, b) => -1);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={16} className="text-blue-400/60" />
          <h3 className="text-sm font-semibold text-white/80">Timeline</h3>
          <span className="text-[11px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">{timelineArticles.length} documents</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={timelineYear} onChange={e => setTimelineYear(e.target.value)}
            className="px-3 py-1.5 text-[10px] font-medium rounded-lg outline-none text-white/70 border border-white/[0.06] bg-white/[0.04] cursor-pointer appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "28px" }}>
            {[...new Set(articles.map(a => a.date?.slice(0, 4)))].sort().reverse().map(y => (
              <option key={y} value={y} className="bg-[#0d1117] text-white/80">{y}</option>
            ))}
          </select>
          <select value={timelineMonth} onChange={e => setTimelineMonth(e.target.value)}
            className="px-3 py-1.5 text-[10px] font-medium rounded-lg outline-none text-white/70 border border-white/[0.06] bg-white/[0.04] cursor-pointer appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "28px" }}>
            <option value="" className="bg-[#0d1117] text-white/50">All months</option>
            {availableMonths.map(m => (
              <option key={m} value={m} className="bg-[#0d1117] text-white/80">{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="relative">
        {/* Continuous vertical line — center aligned with dot */}
        <div className="absolute left-[112px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-violet-500/30 to-transparent" />
        <div className="space-y-6">
          {timelineArticles.length ? timelineArticles.map((article, i) => {
            const TagIcon = TAG_ICONS[article.tag] || BookOpen;
            return (
            <div key={i} className="relative flex items-center cursor-pointer group"
              onClick={() => openArticle ? openArticle(article) : setSelectedIdx(articles.indexOf(article))}>
              {/* Date on the left */}
              <div className="shrink-0 text-right pr-5" style={{ width: "100px" }}>
                <span className="text-[10px] text-white/30 font-mono tracking-tight">{article.date}</span>
              </div>
              {/* Dot (line passes through center) */}
              <div className="relative flex items-center justify-center shrink-0" style={{ width: "24px" }}>
                <div className="relative z-10 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 shadow-[0_0_10px_rgba(76,201,240,0.5)]" />
              </div>
              {/* Card */}
              <div className="flex-1 min-w-0 ml-5 rounded-2xl p-4 border border-white/[0.06] transition-all duration-500 hover:translate-y-[-2px] hover:border-blue-400/20"
                style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(12px)", boxShadow: "0 4px 16px -6px rgba(0,0,0,0.3)" }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TAG_COLORS[article.tag] || "border-white/10 text-white/40"}`}>
                      <TagIcon size={10} />{article.tag}
                    </span>
                    <h4 className="text-[13px] font-semibold text-white/85 truncate">{article.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[9px] text-white/25 whitespace-nowrap">updated {article.updatedDaysAgo}d ago</span>
                    <div className="w-7 h-7 rounded-full grid place-items-center border border-white/[0.08] bg-white/[0.03] transition-all duration-400 group-hover:border-blue-400/30 group-hover:bg-blue-400/10 group-hover:shadow-[0_0_14px_rgba(76,201,240,0.25)]">
                      <ArrowRight size={12} className="text-white/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-white/20 mt-2 font-mono">{article.path}</p>
              </div>
            </div>
          )}) : (
            <div className="flex items-center justify-center py-12">
              <span className="text-[12px] text-white/25">No documents found for this period</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
