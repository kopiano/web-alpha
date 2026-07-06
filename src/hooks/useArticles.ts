import { useState, useEffect, useCallback } from "react";
import { fetchDocList } from "@/api/doc";
import { resolveImageAvatar } from "@/lib/avatar";
import {
  CATEGORIES, TAG_COLORS, CAT_COLORS, TAG_ICONS, TAGS,
  Article,
} from "@/components/doc/docsData";

const normalizeDocTime = (value?: string) => {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const sortArticles = (list: Article[]) =>
  [...list].sort((a, b) => (b.updatedAt || b.createdAt || b.date || "").localeCompare(a.updatedAt || a.createdAt || a.date || ""));

const articleKey = (article: Pick<Article, "id" | "path" | "tag" | "title">) => {
  if (article.id) return `id:${article.id}`;
  const path = normalizePath(article.path);
  if (path) return `path:${path}`;
  return `meta:${String(article.tag || "").toLowerCase()}::${String(article.title || "").toLowerCase()}`;
};

const articleIdentityMatches = (left: Pick<Article, "id" | "path" | "tag" | "title">, right: Pick<Article, "id" | "path" | "tag" | "title">) => {
  if (left.id && right.id && left.id === right.id) return true;

  const leftPath = normalizePath(left.path);
  const rightPath = normalizePath(right.path);
  if (leftPath && rightPath && leftPath === rightPath) return true;

  const leftMeta = `${String(left.tag || "").toLowerCase()}::${String(left.title || "").toLowerCase()}`;
  const rightMeta = `${String(right.tag || "").toLowerCase()}::${String(right.title || "").toLowerCase()}`;
  return leftMeta === rightMeta;
};

const normalizePath = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/docs/")) return raw;
  if (raw.startsWith("docs/")) return `/${raw}`;
  if (raw.startsWith("/src/")) return raw.replace(/^\/src\//, "/");
  if (raw.startsWith("src/")) return `/${raw}`;
  return raw;
};

const normalizeArticle = (item: any): Article => {
  const tagName = TAGS.find((t) => t.toLowerCase() === String(item.category || item.tag || "").toLowerCase()) || "Resources";
  const createdAt = normalizeDocTime(item.created_at || item.createdAt);
  const updatedAt = normalizeDocTime(item.updated_at || item.updatedAt || item.created_at || item.createdAt);
  const id = Number(item.id || 0) || undefined;
  return {
    id,
    userId: Number(item.user_id ?? item.userId ?? item.UserID ?? 0) || undefined,
    contributors: Array.isArray(item.contributors)
      ? item.contributors.map((value: any) => Number(value)).filter((value: number) => Number.isFinite(value) && value >= 0)
      : (Number(item.user_id ?? item.userId ?? item.UserID ?? 0) > 0 ? [Number(item.user_id ?? item.userId ?? item.UserID ?? 0)] : [0]),
    visibility: Number(item.visibility ?? item.Visibility ?? 1) || 1,
    editPermission: Number(item.edit_permission ?? item.editPermission ?? 0) || 0,
    title: item.title || "Untitled",
    desc: item.excerpt || item.content?.split("\n").slice(1, 3).join(" ").replace(/[#*`]/g, "").trim().slice(0, 100) || "Documentation file.",
    tag: tagName,
    readTime: `${Math.max(1, Math.floor((item.content?.length || 0) / 3000 * 5) || 5)} min`,
    date: (createdAt || updatedAt || item.time || "2026-06-27").slice(0, 10),
    createdAt,
    updatedAt,
    time: item.time || updatedAt || createdAt,
    path: item.path || (id ? String(id) : ""),
    updatedDaysAgo: Math.floor(Math.random() * 14) + 1,
    md: item.content || item.md || "",
    featured: false,
    author: Number(item.user_id ?? item.userId ?? item.UserID ?? 0) > 0
      ? (item.username || item.author || item.user_name || "用户名")
      : "游客",
    avatar: item.avatar || item.author_avatar || "",
    avatarUrl: resolveImageAvatar(item.avatar_url || item.avatarUrl || item.author_avatar_url || item.authorAvatarUrl || item.avatar || item.author_avatar) || "",
    editorAvatar: item.editor_avatar || item.editorAvatar || item.updated_avatar || item.updatedAvatar || item.avatar || item.author_avatar || "",
    editorAvatarUrl: resolveImageAvatar(item.editor_avatar_url || item.editorAvatarUrl || item.updated_avatar_url || item.updatedAvatarUrl || item.updated_avatar || item.updatedAvatar || item.avatar || item.author_avatar) || "",
    comments: Math.floor(Math.random() * 20),
    content: item.content || item.md || "",
    excerpt: item.excerpt || "",
  };
};

/* ─── Hook: fetch docs from backend, fallback to local ─── */
export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const upsertArticle = useCallback((article: Article) => {
    const normalizedArticle = { ...article, path: normalizePath(article.path) };
    setArticles((prev) => {
      const nextKey = articleKey(normalizedArticle);
      const idx = prev.findIndex((item) => articleIdentityMatches(item, normalizedArticle) || articleKey(item) === nextKey);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...normalizedArticle };
        return sortArticles(next.filter((item, index, self) => index === self.findIndex((cur) => articleIdentityMatches(cur, item))));
      }
      return sortArticles([...prev, normalizedArticle].filter((item, index, self) => index === self.findIndex((cur) => articleIdentityMatches(cur, item))));
    });
  }, []);

  const removeArticle = useCallback((idOrPath?: number | string) => {
    const id = typeof idOrPath === "number" ? idOrPath : Number(idOrPath);
    const normalizedPath = typeof idOrPath === "string" ? normalizePath(idOrPath) : "";
    setArticles((prev) => sortArticles(prev.filter((item) => {
      if (Number.isFinite(id) && id > 0 && item.id === id) return false;
      if (normalizedPath && normalizePath(item.path) === normalizedPath) return false;
      return true;
    })));
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetchDocList()
      .then((res) => {
        const payload = res.data;
        if (payload?.code && payload.code !== 200) {
          const message = String(payload.message || "");
          const hasToken = Boolean(localStorage.getItem("token"));
          if (hasToken && message.includes("登录已过期")) {
            localStorage.removeItem("token");
            return fetchDocList().then((retryRes) => {
              const retryPayload = retryRes.data?.data ?? retryRes.data ?? [];
              const retryList = Array.isArray(retryPayload) ? retryPayload : retryPayload.list ?? [];
              const fetched = retryList.map((item: any) => normalizeArticle(item));
              setArticles(sortArticles(fetched.filter((item, index, self) => index === self.findIndex((cur) => articleKey(cur) === articleKey(item)))));
            });
          }
          setArticles([]);
          return;
        }
        const data = payload?.data ?? payload ?? [];
        const list = Array.isArray(data) ? data : data.list ?? [];
        const fetched = list.map((item: any) => normalizeArticle(item));
        setArticles(sortArticles(fetched.filter((item, index, self) => index === self.findIndex((cur) => articleKey(cur) === articleKey(item)))));
      })
      .catch(() => {
        setArticles([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { articles, loading, refresh: fetchData, upsertArticle, removeArticle };
}

export type { Article };
export { CATEGORIES, TAG_COLORS, CAT_COLORS, TAG_ICONS };
