import { DOC_CATEGORIES, DOC_CATEGORY_LOWER, DOC_CATEGORY_OPTIONS, DOC_TAG_COLORS, DOC_CAT_COLORS, DOC_TAG_ICONS } from "@/config/docs";
import { EMOJI_LIST } from "@/config/chat";

/* ─── Fallback local md import (used when backend is unreachable) ─── */
export const mdModules = import.meta.glob("/src/docs/**/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export function filenameToTitle(path: string): string {
  const name = path.split("/").pop()?.replace(/\.md$/, "") || "";
  return name.replace(/^\d+-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function pathToTag(path: string): string {
  const parts = path.split("/");
  const folderIdx = parts.indexOf("docs") + 1;
  return parts[folderIdx] || "Resources";
}

export const TAGS = [...DOC_CATEGORIES];
export const TAG_LOWER = [...DOC_CATEGORY_LOWER];

export function loadMd(path: string, original: string): string {
  try { return localStorage.getItem(`docs-md:${path}`) ?? original; } catch { return original; }
}
export function saveMd(path: string, md: string) {
  try { localStorage.setItem(`docs-md:${path}`, md); } catch { /* quota exceeded */ }
}

export type Article = {
  id?: number;
  userId?: number;
  contributors?: number[];
  title: string;
  desc: string;
  tag: string;
  visibility?: number;
  editPermission?: number;
  readTime: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  time?: string;
  path: string;
  updatedDaysAgo: number;
  md: string;
  featured?: boolean;
  author: string;
  avatar: string;
  avatarUrl?: string;
  editorAvatar?: string;
  editorAvatarUrl?: string;
  comments: number;
  content: string;
  excerpt?: string;
};

/* ─── Build local fallback articles ─── */
const mdEntries = Object.entries(mdModules);
export const LOCAL_ARTICLES: Article[] = mdEntries.map(([path, content], i) => {
  const normalizedPath = path.replace(/^\/src\//, "/").replace(/^src\//, "/").replace(/^docs\//, "/docs/");
  const tag = TAGS.includes(pathToTag(path).charAt(0).toUpperCase() + pathToTag(path).slice(1))
    ? pathToTag(path) : "Resources";
  return {
    title: filenameToTitle(path),
    desc: content.split("\n").slice(1, 3).join(" ").replace(/[#*`]/g, "").trim().slice(0, 100) || "Documentation file.",
    tag,
    editPermission: 0,
    readTime: `${Math.max(1, Math.floor((content.length / 3000) * 5) || 5)} min`,
    date: "2026-06-15",
    createdAt: "2026-06-15 00:00:00",
    updatedAt: "2026-06-15 00:00:00",
    path: normalizedPath,
    updatedDaysAgo: Math.floor(Math.random() * 14) + 1,
    md: loadMd(path, content),
    featured: i === mdEntries.length - 1,
    author: "游客",
    avatar: "",
    avatarUrl: "",
    editorAvatar: "",
    editorAvatarUrl: "",
    contributors: [0],
    comments: Math.floor(Math.random() * 20),
    content,
  };
});

/* ─── Static configs (always present) ─── */
export const CATEGORIES = [...DOC_CATEGORY_OPTIONS];
export const TAG_COLORS = DOC_TAG_COLORS;
export const CAT_COLORS = DOC_CAT_COLORS;
export const TAG_ICONS = DOC_TAG_ICONS;

export interface Comment {
  id: number; name: string; email: string; website: string; avatar: string; time: string;
  content: string; likes: number; liked?: boolean;
  parentId: number | null; replies?: Comment[]; avatarClassName?: string; avatarUrl?: string | null;
}

export { EMOJI_LIST };

export const INITIAL_COMMENTS: Comment[] = [
  { id: 1, name: "Alex Morgan", email: "alex@morgan.dev", website: "alex.dev", avatar: "AM", time: "2 hours ago", content: "**Great article!** The blur example helped a lot 🚀 _Really appreciate it._", likes: 12, parentId: null, replies: [
    { id: 4, name: "Priya Kapoor", email: "priya@kapoor.design", website: "priya.design", avatar: "PK", time: "1 hour ago", content: "Glad it helped! More advanced techniques coming soon.", likes: 5, parentId: 1 },
  ]},
  { id: 2, name: "Sophie Laurent", email: "sophie@laurent.tech", website: "sophie.tech", avatar: "SL", time: "5 hours ago", content: "Could you expand the WebSocket ingestion part? Building something similar at my company.", likes: 8, parentId: null, replies: [] },
  { id: 3, name: "Marcus Webb", email: "marcus@webb.codes", website: "marcus.codes", avatar: "MW", time: "3 hours ago", content: "The glassmorphism system is incredible. 🔥 Well documented!", likes: 6, parentId: null, replies: [] },
];
