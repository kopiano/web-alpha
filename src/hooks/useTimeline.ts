import { useMemo } from "react";
import { useArticles } from "@/hooks/useArticles";
import type { Article } from "@/hooks/useArticles";

/** 按年月分组的时间轴数据 */
export interface TimelineGroup {
  year: string;
  months: TimelineMonth[];
}

export interface TimelineMonth {
  month: string;
  entries: Article[];
}

const getSortKey = (article: Article) => article.updatedAt || article.createdAt || article.time || article.date || "";

function buildTimelineGroups(articles: Article[]): TimelineGroup[] {
  const yearMap = new Map<string, Map<string, Article[]>>();
  for (const article of articles) {
    const key = getSortKey(article);
    const year = key.slice(0, 4) || article.date?.slice(0, 4) || "2026";
    const month = key.slice(5, 7) || article.date?.slice(5, 7) || "01";
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(article);
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
}

/**
 * Hook: 基于文档列表生成时间轴数据
 * 与 Docs tab 共用同一份 articles 状态，避免刷新后不同步
 */
export function useTimeline(source?: {
  articles: Article[];
  loading: boolean;
  refresh: () => Promise<void> | void;
}) {
  const fallback = useArticles();
  const articles = source?.articles ?? fallback.articles;
  const loading = source?.loading ?? fallback.loading;
  const refresh = source?.refresh ?? fallback.refresh;

  const timelineGroups = useMemo(() => buildTimelineGroups(articles), [articles]);
  const availableYears = useMemo(
    () => [...new Set(timelineGroups.map((g) => g.year))].sort().reverse(),
    [timelineGroups],
  );
  const flatEntries = useMemo(
    () => timelineGroups.flatMap((g) => g.months.flatMap((m) => m.entries)),
    [timelineGroups],
  );

  return {
    timelineGroups,
    flatEntries,
    availableYears,
    loading,
    apiAvailable: true,
    refresh,
  };
}
