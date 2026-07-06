import { BookOpen, Code2, Cloud, Database, Terminal, Zap, Bookmark } from "lucide-react";

export const DOC_CATEGORIES = ["Frontend", "Backend", "Database", "DevOps", "API", "Resources"] as const;

export const DOC_CATEGORY_LOWER = DOC_CATEGORIES.map((item) => item.toLowerCase());

export const DOC_CATEGORY_OPTIONS = [
  { label: "All Documents", icon: Bookmark },
  { label: "Frontend", icon: Code2 },
  { label: "Backend", icon: Cloud },
  { label: "Database", icon: Database },
  { label: "DevOps", icon: Terminal },
  { label: "API", icon: Zap },
  { label: "Resources", icon: BookOpen },
] as const;

export const DOC_TAG_COLORS: Record<string, string> = {
  Frontend: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  Backend: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
  Database: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  DevOps: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  API: "border-pink-500/30 bg-pink-500/15 text-pink-300",
  Resources: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
};

export const DOC_CAT_COLORS: Record<string, string> = {
  "All Documents": "#60a5fa",
  Frontend: "#a78bfa",
  Backend: "#22d3ee",
  Database: "#60a5fa",
  DevOps: "#f59e0b",
  API: "#f472b6",
  Resources: "#34d399",
};

export const DOC_TAG_ICONS: Record<string, React.ElementType> = {
  Frontend: Code2,
  Backend: Cloud,
  Database: Database,
  DevOps: Terminal,
  API: Zap,
  Resources: BookOpen,
};
