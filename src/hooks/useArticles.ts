import { useState, useEffect, useCallback } from "react";
import { fetchDocList } from "@/api/doc";
import {
  CATEGORIES, TAG_COLORS, CAT_COLORS, TAG_ICONS, TAGS,
  LOCAL_ARTICLES, Article,
} from "@/components/doc/docsData";

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
          setArticles(flat.length > 0 ? flat : LOCAL_ARTICLES);
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
