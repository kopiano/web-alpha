import { useState, useMemo, useEffect } from "react";
import { BookOpen, Activity, ArrowRight, Loader2, Eye, Lock, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Article } from "@/hooks/useArticles";
import type { TimelineGroup } from "@/hooks/useTimeline";
import { resolveAvatar, resolveImageAvatar } from "@/lib/avatar";
import { getUsers } from "@/api/user";

interface TimelineTabProps {
  filteredArticles: Article[];
  articles: Article[];
  setSelectedIdx: (idx: number | null) => void;
  openArticle?: (article: Article) => void;
  currentUserId?: number | null;
  TAG_COLORS: Record<string, string>;
  TAG_ICONS: Record<string, any>;
  usersById?: Map<number, any>;
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

const formatDocTime = (value?: string) => {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getVisibilityMeta = (visibility?: number) => {
  if (visibility === 0) return { label: "Private", Icon: Lock, className: "border-amber-400/20 text-amber-200 bg-amber-400/10" };
  return { label: "Public", Icon: Eye, className: "border-emerald-400/20 text-emerald-200 bg-emerald-400/10" };
};

const getEditMeta = (editPermission?: number) => {
  if (editPermission === 1) return { label: "Editable", Icon: PencilLine, className: "border-sky-400/20 text-sky-200 bg-sky-400/10" };
  return { label: "Owner", Icon: Lock, className: "border-white/10 text-white/35 bg-white/[0.02]" };
};

const BADGE_WIDTH = "w-[88px]";

const getAvatarSrc = (value?: string) => String(value || "").trim();

const getAvatarLabel = (name?: string, fallback = "G") => {
  const raw = String(name || "").trim();
  if (!raw || raw === "游客") return fallback;
  return raw.slice(0, 2).toUpperCase();
};

export const TimelineTab = ({
  filteredArticles,
  articles,
  setSelectedIdx,
  openArticle,
  currentUserId = null,
  TAG_COLORS,
  TAG_ICONS,
  usersById = new Map(),
  timelineGroups,
  availableYears: availYears,
  loading,
}: TimelineTabProps) => {
  const [timelineYear, setTimelineYear] = useState("2026");
  const [timelineMonth, setTimelineMonth] = useState("");
  const [timelineUsers, setTimelineUsers] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    let mounted = true;
    getUsers()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        const map = new Map<number, any>();
        list.forEach((item: any) => {
          const id = Number(item.id ?? item.user_id ?? item.ID ?? 0);
          if (id <= 0) return;
          const avatar = item.avatar_url ?? item.avatarUrl ?? item.avatar ?? "";
          map.set(id, {
            ...item,
            id,
            user_id: id,
            username: item.username ?? item.name ?? "",
            avatar,
            avatar_url: avatar,
            avatarUrl: resolveImageAvatar(avatar) || resolveAvatar(avatar) || "",
          });
        });
        if (mounted) setTimelineUsers(map);
      })
      .catch(() => {
        if (mounted) setTimelineUsers(new Map());
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getSortKey = (article: Article) => article.updatedAt || article.createdAt || article.time || article.date || "";
  const getYear = (article: Article) => (getSortKey(article).slice(0, 4) || article.date?.slice(0, 4) || "2026");
  const getMonth = (article: Article) => (getSortKey(article).slice(5, 7) || article.date?.slice(5, 7) || "01");
  const docHref = (article: Article, index: number) => `/docs?doc=${encodeURIComponent(String(article.id ?? index))}`;
  const resolveUserAvatar = (id: number, fallbackName = "", fallbackAvatar = "") => {
    const user = id > 0 ? (timelineUsers.get(id) || usersById.get(id)) : null;
    const rawAvatar = user?.avatarUrl || user?.avatar_url || user?.avatar || fallbackAvatar || "";
    const src = getAvatarSrc(resolveImageAvatar(rawAvatar) || rawAvatar);
    const label = getAvatarLabel(user?.username || user?.name || fallbackName, id > 0 ? "U" : "G");
    return { src, label };
  };
  const getOwnerId = (article: Article) => {
    const primary = Number(article.userId ?? 0);
    if (primary > 0) return primary;
    const firstContributor = Array.isArray(article.contributors) ? Number(article.contributors[0] ?? 0) : 0;
    return firstContributor > 0 ? firstContributor : 0;
  };
  const isOwner = (article: Article) => getOwnerId(article) > 0 && getOwnerId(article) === Number(currentUserId ?? 0);
  const canViewArticle = (article: Article) => Number(article.visibility ?? 1) !== 0 || isOwner(article);
  const handleDocClick = (article: Article, index: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!canViewArticle(article)) {
      e.preventDefault();
      toast.error("该文档为 private，请向创作者申请 public 查看权限");
      return;
    }
    if (openArticle) {
      e.preventDefault();
      openArticle(article);
      return;
    }
    setSelectedIdx(Number(article.id ?? articles.findIndex((item) => item.id === article.id)));
  };
  const handleVisibilityBadgeClick = (article: Article, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (Number(article.visibility ?? 1) === 0 && !isOwner(article)) {
      toast.error("该文档为 private，请向创作者申请 public 查看权限");
    }
  };
  const handleEditBadgeClick = (article: Article, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (Number(article.editPermission ?? 0) === 0 && !isOwner(article)) {
      toast.error("该文档仅创作者可编辑，请向创作者申请编辑权限");
    }
  };
  const getAvatarItems = (article: Article) => {
    const contributorIds = Array.isArray(article.contributors)
      ? article.contributors.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [];
    const orderedIds = [...new Set(contributorIds)];
    const fallbackCreatorId = Number(article.userId ?? 0);
    if (fallbackCreatorId > 0 && !orderedIds.includes(fallbackCreatorId)) orderedIds.unshift(fallbackCreatorId);

    return orderedIds.slice(0, 15).map((id, index) => {
      const isCreator = index === 0;
      const fallbackName = isCreator ? (article.author || "") : "";
      const fallbackAvatar = isCreator ? (article.avatarUrl || article.avatar || "") : (article.editorAvatarUrl || article.editorAvatar || "");
      const avatar = resolveUserAvatar(id, fallbackName, fallbackAvatar);
      return { key: String(id), src: avatar.src, label: avatar.label };
    });
  };

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
                    const href = docHref(article, i);
                    return (
                      <Link
                        key={article.path || `${month}-${i}`}
                        to={href}
                        aria-disabled={!canViewArticle(article)}
                        className={`relative flex items-center group text-left ${canViewArticle(article) ? "cursor-pointer" : "cursor-not-allowed"}`}
                        onClick={(e) => handleDocClick(article, i, e)}
                      >
                        {/* 日期 */}
                        <div className="shrink-0 text-right pr-5" style={{ width: "100px" }}>
                          <span className="text-[10px] text-white/30 font-mono tracking-tight">
                            {formatDocTime(article.updatedAt || article.createdAt || article.date)}
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
                            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            boxShadow: "0 4px 16px -6px rgba(0,0,0,0.3)",
                          }}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span
                              className={`inline-flex items-center justify-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border shrink-0 ${BADGE_WIDTH} ${
                                TAG_COLORS[article.tag] || "border-white/10 text-white/40"
                              }`}
                            >
                              <TagIcon size={10} />
                              {article.tag}
                            </span>
                            <h4 className="flex-1 min-w-0 text-[13px] font-semibold text-white/85 truncate">
                              {article.title}
                            </h4>
                            <div className="flex items-center -space-x-2 shrink-0">
                              {getAvatarItems(article).map((avatar, avatarIndex) => (
                                <div
                                  key={`${article.id ?? article.path ?? i}-avatar-${avatarIndex}`}
                                  className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-[#0c0c14] bg-white/[0.04] grid place-items-center text-[9px] font-bold text-white/85"
                                  title={avatar.label}
                                >
                                  {avatar.src ? (
                                    <img
                                      src={avatar.src}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    <span>{avatar.label}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <span
                              onClick={(e) => handleVisibilityBadgeClick(article, e)}
                              className={`inline-flex items-center justify-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border shrink-0 ${BADGE_WIDTH} ${getVisibilityMeta(article.visibility).className} ${Number(article.visibility ?? 1) === 0 && !isOwner(article) ? "cursor-pointer" : ""}`}
                            >
                              {(() => {
                                const { Icon } = getVisibilityMeta(article.visibility);
                                return <Icon size={10} />;
                              })()}
                              {getVisibilityMeta(article.visibility).label}
                            </span>
                            <span
                              onClick={(e) => handleEditBadgeClick(article, e)}
                              className={`inline-flex items-center justify-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border shrink-0 ${BADGE_WIDTH} ${getEditMeta(article.editPermission).className} ${Number(article.editPermission ?? 0) === 0 && !isOwner(article) ? "cursor-pointer" : ""}`}
                            >
                              {(() => {
                                const { Icon } = getEditMeta(article.editPermission);
                                return <Icon size={10} />;
                              })()}
                              {getEditMeta(article.editPermission).label}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[9px] text-white/25 whitespace-nowrap">
                                updated {formatDocTime(article.updatedAt || article.createdAt || article.date)}
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
                      </Link>
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
                  const href = docHref(article, i);
                  return (
                  <Link
                    key={article.path || `${timelineYear}-${timelineMonth}-${i}`}
                    to={href}
                    aria-disabled={!canViewArticle(article)}
                    className={`relative flex items-center group text-left ${canViewArticle(article) ? "cursor-pointer" : "cursor-not-allowed"}`}
                    onClick={(e) => handleDocClick(article, i, e)}
                  >
                    <div className="shrink-0 text-right pr-5" style={{ width: "100px" }}>
                      <span className="text-[10px] text-white/30 font-mono tracking-tight">
                        {formatDocTime(article.updatedAt || article.createdAt || article.date)}
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
                        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                        boxShadow: "0 4px 16px -6px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className={`inline-flex items-center justify-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border shrink-0 ${BADGE_WIDTH} ${
                            TAG_COLORS[article.tag] || "border-white/10 text-white/40"
                          }`}
                        >
                          <TagIcon size={10} />
                          {article.tag}
                        </span>
                        <h4 className="flex-1 min-w-0 text-[13px] font-semibold text-white/85 truncate">
                          {article.title}
                        </h4>
                        <div className="flex items-center -space-x-2 shrink-0">
                          {getAvatarItems(article).map((avatar, avatarIndex) => (
                            <div
                              key={`${article.id ?? article.path ?? i}-avatar-${avatarIndex}`}
                              className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-[#0c0c14] bg-white/[0.04] grid place-items-center text-[9px] font-bold text-white/85"
                              title={avatar.label}
                            >
                              {avatar.src ? (
                                <img
                                  src={avatar.src}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <span>{avatar.label}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-[9px] text-white/25 whitespace-nowrap">
                          updated {formatDocTime(article.updatedAt || article.createdAt || article.date)}
                        </span>
                        <div className="w-7 h-7 rounded-full grid place-items-center border border-white/[0.08] bg-white/[0.03] transition-all duration-400 group-hover:border-blue-400/30 group-hover:bg-blue-400/10 group-hover:shadow-[0_0_14px_rgba(76,201,240,0.25)]">
                          <ArrowRight
                            size={12}
                            className="text-white/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
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
