import { useState, useEffect, useCallback, useMemo } from "react";
import { getTimeline } from "@/api/timeline";
import { useArticles } from "@/hooks/useArticles";
import type { Article } from "@/hooks/useArticles";

/** 时间轴条目（后端返回的原始结构） */
export interface TimelineEntry {
  id?: number;
  title: string;
  date: string;
  time?: string;
  tag: string;
  path: string;
  desc: string;
  author?: string;
}

/** 按年月分组的时间轴数据 */
export interface TimelineGroup {
  year: string;
  months: TimelineMonth[];
}

export interface TimelineMonth {
  month: string;
  entries: Article[];
}

/**
 * Hook: 从 GET /timeline 获取时间轴数据
 * 后端不可用时自动 fallback 到本地文章数据
 */
export function useTimeline() {
  const { articles: fallbackArticles, loading: fallbackLoading } = useArticles();
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  const fetchTimeline = useCallback(() => {
    setLoading(true);
    getTimeline()
      .then((res) => {
        const payload = res.data?.data ?? res.data ?? [];
        if (Array.isArray(payload) && payload.length > 0) {
          // 后端返回分组结构: [{ year, months: [{ month, articles: [...] }] }]
          const groups: TimelineGroup[] = payload.map((g: any) => ({
            year: String(g.year ?? ""),
            months: (g.months ?? []).map((m: any) => ({
              month: String(m.month ?? "").padStart(2, "0"),
              entries: (m.articles ?? m.entries ?? []).map(normalizeEntry),
            })),
          }));
          setTimelineGroups(groups);
          setApiAvailable(true);
        } else if (Array.isArray(payload) && payload.length === 0) {
          // 空数组，后端在线但无数据
          setTimelineGroups([]);
          setApiAvailable(true);
        } else {
          throw new Error("Empty or invalid response");
        }
      })
      .catch(() => {
        setApiAvailable(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  /** 从文章列表构建时间轴分组（fallback） */
  const fallbackGroups = useMemo((): TimelineGroup[] => {
    if (apiAvailable) return [];
    const yearMap = new Map<string, Map<string, Article[]>>();
    for (const a of fallbackArticles) {
      const year = a.date?.slice(0, 4) ?? "2026";
      const month = a.date?.slice(5, 7) ?? "01";
      if (!yearMap.has(year)) yearMap.set(year, new Map());
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(a);
    }
    return [...yearMap.entries()]
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, monthMap]) => ({
        year,
        months: [...monthMap.entries()]
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([month, entries]) => ({
            month,
            entries: entries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
          })),
      }));
  }, [fallbackArticles, apiAvailable]);

  /** 打平的时间轴条目列表（兼容旧版 TimelineTab） */
  const flatEntries = useMemo((): Article[] => {
    const source = apiAvailable ? timelineGroups : fallbackGroups;
    return source.flatMap((g) =>
      g.months.flatMap((m) => m.entries)
    );
  }, [timelineGroups, fallbackGroups, apiAvailable]);

  /** 所有可用的年份 */
  const availableYears = useMemo(() => {
    const source = apiAvailable ? timelineGroups : fallbackGroups;
    return [...new Set(source.map((g) => g.year))].sort().reverse();
  }, [timelineGroups, fallbackGroups, apiAvailable]);

  return {
    timelineGroups: apiAvailable ? timelineGroups : fallbackGroups,
    flatEntries,
    availableYears,
    loading: loading && fallbackLoading,
    apiAvailable,
    refresh: fetchTimeline,
  };
}

/** 将后端条目标准化为 Article */
function normalizeEntry(raw: any): Article {
  return {
    title: raw.title ?? "",
    desc: raw.desc ?? raw.description ?? "",
    tag: raw.tag ?? "Resources",
    readTime: raw.readTime ?? raw.read_time ?? "5 min",
    date: raw.date?.slice(0, 10) ?? "",
    time: raw.time ?? raw.date ?? "",
    path: raw.path ?? "",
    updatedDaysAgo: raw.updatedDaysAgo ?? raw.updated_days_ago ?? 0,
    md: raw.md ?? raw.content ?? "",
    featured: raw.featured ?? false,
    author: raw.author ?? "Nebula Team",
    avatar: raw.avatar ?? "NT",
    comments: raw.comments ?? 0,
    content: raw.content ?? raw.md ?? "",
  };
}
