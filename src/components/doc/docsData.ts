import { BookOpen, Code2, Cloud, Database, Terminal, Zap, Bookmark } from "lucide-react";

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

export const TAGS = ["Frontend", "Backend", "Database", "DevOps", "API", "Resources"];
export const TAG_LOWER = ["frontend", "backend", "database", "devops", "api", "resources"];

export function loadMd(path: string, original: string): string {
  try { return localStorage.getItem(`docs-md:${path}`) ?? original; } catch { return original; }
}
export function saveMd(path: string, md: string) {
  try { localStorage.setItem(`docs-md:${path}`, md); } catch { /* quota exceeded */ }
}

export type Article = {
  title: string;
  desc: string;
  tag: string;
  readTime: string;
  date: string;
  time?: string;
  path: string;
  updatedDaysAgo: number;
  md: string;
  featured?: boolean;
  author: string;
  avatar: string;
  comments: number;
  content: string;
};

/* ─── Build local fallback articles ─── */
const mdEntries = Object.entries(mdModules);
export const LOCAL_ARTICLES: Article[] = mdEntries.map(([path, content], i) => {
  const tag = TAGS.includes(pathToTag(path).charAt(0).toUpperCase() + pathToTag(path).slice(1))
    ? pathToTag(path) : "Resources";
  return {
    title: filenameToTitle(path),
    desc: content.split("\n").slice(1, 3).join(" ").replace(/[#*`]/g, "").trim().slice(0, 100) || "Documentation file.",
    tag,
    readTime: `${Math.max(1, Math.floor((content.length / 3000) * 5) || 5)} min`,
    date: "2026-06-15",
    path: path.replace("/src/", ""),
    updatedDaysAgo: Math.floor(Math.random() * 14) + 1,
    md: loadMd(path, content),
    featured: i === mdEntries.length - 1,
    author: "Nebula Team",
    avatar: "NT",
    comments: Math.floor(Math.random() * 20),
    content,
  };
});

/* ─── Static configs (always present) ─── */
export const CATEGORIES = [
  { label: "All Documents", icon: Bookmark },
  { label: "Frontend", icon: Code2 },
  { label: "Backend", icon: Cloud },
  { label: "Database", icon: Database },
  { label: "DevOps", icon: Terminal },
  { label: "API", icon: Zap },
  { label: "Resources", icon: BookOpen },
];

export const TAG_COLORS: Record<string, string> = {
  Frontend: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  Backend: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
  Database: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  DevOps: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  API: "border-pink-500/30 bg-pink-500/15 text-pink-300",
  Resources: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
};

export const CAT_COLORS: Record<string, string> = {
  "All Documents": "#60a5fa", Frontend: "#a78bfa", Backend: "#22d3ee",
  Database: "#60a5fa", DevOps: "#f59e0b", API: "#f472b6", Resources: "#34d399",
};

export const TAG_ICONS: Record<string, React.ElementType> = {
  Frontend: Code2, Backend: Cloud, Database: Database,
  DevOps: Terminal, API: Zap, Resources: BookOpen,
};

export interface Comment {
  id: number; name: string; email: string; website: string; avatar: string; time: string;
  content: string; likes: number; liked?: boolean;
  parentId: number | null; replies?: Comment[]; avatarClassName?: string; avatarUrl?: string | null;
}

export const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "😉", "😍", "😘", "😋", "😎", "🤩", "🥳", "🤔", "🤗",
  "👍", "👌", "👏", "🙌", "💪", "🙏", "🎉", "✨", "🔥", "🚀",
  "🌩️", "🌨️", "🌧️", "🌦️", "🌥️", "🌤️", "⛈️", "⛅", "☁️", "🌍",
  "🥉","🥈","🥇","🏅","🥬","🍇","🍉"
];

export const INITIAL_COMMENTS: Comment[] = [
  { id: 1, name: "Alex Morgan", email: "alex@morgan.dev", website: "alex.dev", avatar: "AM", time: "2 hours ago", content: "**Great article!** The blur example helped a lot 🚀 _Really appreciate it._", likes: 12, parentId: null, replies: [
    { id: 4, name: "Priya Kapoor", email: "priya@kapoor.design", website: "priya.design", avatar: "PK", time: "1 hour ago", content: "Glad it helped! More advanced techniques coming soon.", likes: 5, parentId: 1 },
  ]},
  { id: 2, name: "Sophie Laurent", email: "sophie@laurent.tech", website: "sophie.tech", avatar: "SL", time: "5 hours ago", content: "Could you expand the WebSocket ingestion part? Building something similar at my company.", likes: 8, parentId: null, replies: [] },
  { id: 3, name: "Marcus Webb", email: "marcus@webb.codes", website: "marcus.codes", avatar: "MW", time: "3 hours ago", content: "The glassmorphism system is incredible. 🔥 Well documented!", likes: 6, parentId: null, replies: [] },
];
