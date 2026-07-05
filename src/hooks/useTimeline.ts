import { useMemo } from "react";
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
  const getSortKey = (article: Article) => article.updatedAt || article.time || article.date || "";

  /** 从文章列表构建时间轴分组（fallback） */
  const fallbackGroups = useMemo((): TimelineGroup[] => {
    const yearMap = new Map<string, Map<string, Article[]>>();
    for (const a of fallbackArticles) {
      const key = getSortKey(a);
      const year = key.slice(0, 4) || a.date?.slice(0, 4) || "2026";
      const month = key.slice(5, 7) || a.date?.slice(5, 7) || "01";
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
            entries: entries.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a))),
          })),
      }));
  }, [fallbackArticles]);

  /** 打平的时间轴条目列表（兼容旧版 TimelineTab） */
  const flatEntries = useMemo((): Article[] => {
    return fallbackGroups.flatMap((g) => g.months.flatMap((m) => m.entries));
  }, [fallbackGroups]);

  /** 所有可用的年份 */
  const availableYears = useMemo(() => {
    return [...new Set(fallbackGroups.map((g) => g.year))].sort().reverse();
  }, [fallbackGroups]);

  return {
    timelineGroups: fallbackGroups,
    flatEntries,
    availableYears,
    loading: fallbackLoading,
    apiAvailable: false,
    refresh: () => void 0,
  };
}
