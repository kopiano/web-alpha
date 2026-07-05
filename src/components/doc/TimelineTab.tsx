import { useState, useMemo } from "react";
import { BookOpen, Activity, ArrowRight, Loader2 } from "lucide-react";
import type { Article } from "@/hooks/useArticles";
import type { TimelineGroup } from "@/hooks/useTimeline";

interface TimelineTabProps {
  filteredArticles: Article[];
  articles: Article[];
  setSelectedIdx: (idx: number | null) => void;
  openArticle?: (article: Article) => void;
  TAG_COLORS: Record<string, string>;
  TAG_ICONS: Record<string, any>;
  /** API 驱动的分组时间轴数据（可选，有则优先使用） */
  timelineGroups?: TimelineGroup[];
  /** 可用年份列表（可选） */
  availableYears?: string[];
  /** 加载状态 */
  loading?: boolean;
}

/** 将月份数字转为英文缩写 */
const MONTH_NAMES: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export const TimelineTab = ({
  filteredArticles,
  articles,
  setSelectedIdx,
  openArticle,
  TAG_COLORS,
  TAG_ICONS,
  timelineGroups,
  availableYears: availYears,
  loading,
}: TimelineTabProps) => {
  const [timelineYear, setTimelineYear] = useState("2026");
  const [timelineMonth, setTimelineMonth] = useState("");

  const getSortKey = (article: Article) => article.updatedAt || article.time || article.date || "";
  const getYear = (article: Article) => (getSortKey(article).slice(0, 4) || article.date?.slice(0, 4) || "2026");
  const getMonth = (article: Article) => (getSortKey(article).slice(5, 7) || article.date?.slice(5, 7) || "01");

  // ---- Fallback: 旧版 flat 文章过滤逻辑 ----
  const availableMonths = [...new Set(
    articles
      .filter((a) => getYear(a) === timelineYear)
      .map((a) => getMonth(a))
  )].sort();

  const timelineArticles = useMemo(() => {
    if (timelineGroups && timelineGroups.length > 0) {
      // 使用新版分组数据
      const entries: Article[] = [];
      for (const g of timelineGroups) {
        if (g.year !== timelineYear) continue;
        for (const m of g.months) {
          if (timelineMonth && m.month !== timelineMonth) continue;
          entries.push(...m.entries);
        }
      }
      return entries.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
    }
    // 旧版 flat fallback
    return [...filteredArticles]
      .filter((a) => {
        const y = getYear(a);
        const m = getMonth(a);
        if (timelineMonth && `${y}-${m}` !== `${timelineYear}-${timelineMonth}`) return false;
        if (!timelineMonth && y !== timelineYear) return false;
        return true;
      })
      .sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
  }, [timelineGroups, filteredArticles, timelineYear, timelineMonth]);

  // ---- 年份列表 ----
  const years = useMemo(() => {
    if (availYears && availYears.length > 0) return availYears;
    return [...new Set(articles.map((a) => getYear(a)))].sort().reverse();
  }, [availYears, articles]);

  // ---- 月份列表（新版分组模式） ----
  const monthsFromGroups = useMemo(() => {
    if (!timelineGroups) return availableMonths;
    const group = timelineGroups.find((g) => g.year === timelineYear);
    return group?.months.map((m) => m.month).sort() ?? [];
  }, [timelineGroups, timelineYear, availableMonths]);

  // ---- 按月份分组的条目（新版渲染用） ----
  const groupedByMonth = useMemo(() => {
    if (!timelineGroups) return null;
    const group = timelineGroups.find((g) => g.year === timelineYear);
    if (!group) return [];
    return group.months
      .filter((m) => !timelineMonth || m.month === timelineMonth)
      .sort((a, b) => Number(b.month) - Number(a.month))
      .map((m) => ({
        month: m.month,
        monthName: MONTH_NAMES[m.month] ?? m.month,
        entries: m.entries.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a))),
      }));
  }, [timelineGroups, timelineYear, timelineMonth]);

  // ---- 加载骨架屏 ----
  if (loading) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={16} className="text-blue-400/60" />
          <h3 className="text-sm font-semibold text-white/80">Timeline</h3>
        </div>
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-5 animate-pulse">
              <div className="w-[100px] h-3 rounded bg-white/[0.06]" />
              <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
              <div className="flex-1 h-16 rounded-2xl bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- 空状态 ----
  const displayMonths = timelineGroups ? monthsFromGroups : availableMonths;

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={16} className="text-blue-400/60" />
          <h3 className="text-sm font-semibold text-white/80">Timeline</h3>
          <span className="text-[11px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
            {timelineArticles.length} documents
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 年份选择器 */}
          <select
            value={timelineYear}
            onChange={(e) => { setTimelineYear(e.target.value); setTimelineMonth(""); }}
            className="px-3 py-1.5 text-[10px] font-medium rounded-lg outline-none text-white/70 border border-white/[0.06] bg-white/[0.04] cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              paddingRight: "28px",
            }}
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0d1117] text-white/80">{y}</option>
            ))}
          </select>
          {/* 月份选择器 */}
          <select
            value={timelineMonth}
            onChange={(e) => setTimelineMonth(e.target.value)}
            className="px-3 py-1.5 text-[10px] font-medium rounded-lg outline-none text-white/70 border border-white/[0.06] bg-white/[0.04] cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              paddingRight: "28px",
            }}
          >
            <option value="" className="bg-[#0d1117] text-white/50">All months</option>
            {displayMonths.map((m) => (
              <option key={m} value={m} className="bg-[#0d1117] text-white/80">{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── 新版分组渲染 ─── */}
      {groupedByMonth && groupedByMonth.length > 0 ? (
        <div className="space-y-8">
          {groupedByMonth.map(({ month, monthName, entries }) => (
            <div key={month}>
              {/* 月份标题 */}
              <div className="flex items-center gap-3 mb-4 ml-[112px]">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  {monthName}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
                <span className="text-[10px] text-white/25">{entries.length} docs</span>
              </div>

              {/* 条目列表 */}
              <div className="relative">
                <div className="absolute left-[112px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-violet-500/30 to-transparent" />
                <div className="space-y-5">
                  {entries.map((article, i) => {
                    const TagIcon = TAG_ICONS[article.tag] || BookOpen;
                    return (
                      <div
                        key={i}
                        className="relative flex items-center cursor-pointer group"
                        onClick={() =>
                          openArticle
                            ? openArticle(article)
                            : setSelectedIdx(articles.indexOf(article))
                        }
                      >
                        {/* 日期 */}
                        <div className="shrink-0 text-right pr-5" style={{ width: "100px" }}>
                          <span className="text-[10px] text-white/30 font-mono tracking-tight">
                            {article.updatedAt || article.time || article.date}
                          </span>
                        </div>
                        {/* 圆点 */}
                        <div
                          className="relative flex items-center justify-center shrink-0"
                          style={{ width: "24px" }}
                        >
                          <div className="relative z-10 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 shadow-[0_0_10px_rgba(76,201,240,0.5)]" />
                        </div>
                        {/* 卡片 */}
                        <div
                          className="flex-1 min-w-0 ml-5 rounded-2xl p-4 border border-white/[0.06] transition-all duration-500 hover:translate-y-[-2px] hover:border-blue-400/20"
                          style={{
                            background: "rgba(255,255,255,0.025)",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 4px 16px -6px rgba(0,0,0,0.3)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                                  TAG_COLORS[article.tag] || "border-white/10 text-white/40"
                                }`}
                              >
                                <TagIcon size={10} />
                                {article.tag}
                              </span>
                              <h4 className="text-[13px] font-semibold text-white/85 truncate">
                                {article.title}
                              </h4>
                            </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] text-white/25 whitespace-nowrap">
                                updated {article.updatedAt || article.date}
                              </span>
                              <div className="w-7 h-7 rounded-full grid place-items-center border border-white/[0.08] bg-white/[0.03] transition-all duration-400 group-hover:border-blue-400/30 group-hover:bg-blue-400/10 group-hover:shadow-[0_0_14px_rgba(76,201,240,0.25)]">
                                <ArrowRight
                                  size={12}
                                  className="text-white/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── 旧版 flat 渲染（无分组数据时使用） ─── */
        <div className="relative">
          <div className="absolute left-[112px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-violet-500/30 to-transparent" />
          <div className="space-y-6">
            {timelineArticles.length ? (
              timelineArticles.map((article, i) => {
                const TagIcon = TAG_ICONS[article.tag] || BookOpen;
                return (
                  <div
                    key={i}
                    className="relative flex items-center cursor-pointer group"
                    onClick={() =>
                      openArticle
                        ? openArticle(article)
                        : setSelectedIdx(articles.indexOf(article))
                    }
                  >
                    <div className="shrink-0 text-right pr-5" style={{ width: "100px" }}>
                      <span className="text-[10px] text-white/30 font-mono tracking-tight">
                        {article.date}
                      </span>
                    </div>
                    <div
                      className="relative flex items-center justify-center shrink-0"
                      style={{ width: "24px" }}
                    >
                      <div className="relative z-10 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 shadow-[0_0_10px_rgba(76,201,240,0.5)]" />
                    </div>
                    <div
                      className="flex-1 min-w-0 ml-5 rounded-2xl p-4 border border-white/[0.06] transition-all duration-500 hover:translate-y-[-2px] hover:border-blue-400/20"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 4px 16px -6px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                              TAG_COLORS[article.tag] || "border-white/10 text-white/40"
                            }`}
                          >
                            <TagIcon size={10} />
                            {article.tag}
                          </span>
                          <h4 className="text-[13px] font-semibold text-white/85 truncate">
                            {article.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] text-white/25 whitespace-nowrap">
                            updated {article.updatedDaysAgo}d ago
                          </span>
                          <div className="w-7 h-7 rounded-full grid place-items-center border border-white/[0.08] bg-white/[0.03] transition-all duration-400 group-hover:border-blue-400/30 group-hover:bg-blue-400/10 group-hover:shadow-[0_0_14px_rgba(76,201,240,0.25)]">
                            <ArrowRight
                              size={12}
                              className="text-white/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center py-12">
                <span className="text-[12px] text-white/25">No documents found for this period</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
