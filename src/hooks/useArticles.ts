import { useState, useEffect, useCallback } from "react";
import { fetchDocList } from "@/api/doc";
import {
  CATEGORIES, TAG_COLORS, CAT_COLORS, TAG_ICONS, TAGS,
  LOCAL_ARTICLES, Article,
} from "@/components/doc/docsData";

const normalizeDocTime = (value?: string) => {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/* ─── Hook: fetch docs from backend, fallback to local ─── */
export function useArticles() {
  const [articles, setArticles] = useState<Article[]>(LOCAL_ARTICLES);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetchDocList()
      .then((res) => {
        const data = res.data;
        const groups = Array.isArray(data) ? data : data?.data ?? [];
        if (groups.length > 0) {
          const flat = groups.flatMap((g) => {
            const tagName = TAGS.find((t) => t.toLowerCase() === g.tag.toLowerCase()) || "Resources";
            return (g.items || []).map((item) => ({
              title: item.title,
              desc: item.content?.split("\n").slice(1, 3).join(" ").replace(/[#*`]/g, "").trim().slice(0, 100) || "Documentation file.",
              tag: tagName,
              readTime: `${Math.max(1, Math.floor((item.content?.length || 0) / 3000 * 5) || 5)} min`,
              date: item.time ? item.time.slice(0, 10) : "2026-06-27",
              createdAt: normalizeDocTime(item.createdAt || item.time),
              updatedAt: normalizeDocTime(item.updatedAt || item.time),
              time: item.time || "",
              path: item.path || "",
              updatedDaysAgo: Math.floor(Math.random() * 14) + 1,
              md: item.content || "",
              featured: false,
              author: "Nebula Team",
              avatar: "NT",
              comments: Math.floor(Math.random() * 20),
              content: item.content || "",
            }));
          });
          const sorted = flat.length > 0
            ? [...flat].sort((a, b) => (b.updatedAt || b.date || "").localeCompare(a.updatedAt || a.date || ""))
            : LOCAL_ARTICLES;
          setArticles(sorted);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { articles, loading, refresh: fetchData };
}

export type { Article };
export { CATEGORIES, TAG_COLORS, CAT_COLORS, TAG_ICONS };
