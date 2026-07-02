# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- `pnpm run dev` — Start Vite dev server on port 5000 (hot-reload, proxies `/api` → `localhost:8000`)
- `pnpm run build` — Production build
- `pnpm run preview` — Preview production build
- `pnpm run lint` — ESLint across the project
- `pnpm run test` — Run Vitest tests once
- `pnpm run test:watch` — Vitest watch mode

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Package manager**: pnpm
- **Routing**: react-router-dom
- **Styling**: Tailwind CSS + custom CSS with glass-morphism utilities
- **UI components**: shadcn/ui (Radix UI primitives) — see `src/components/ui/`
- **State/queries**: @tanstack/react-query
- **HTTP client**: Axios
- **Charts**: Recharts
- **Forms**: react-hook-form + zod
- **Toast**: sonner + shadcn Toaster
- **Animation**: CSS keyframes (ambient glow, particle float, glass hover effects)

## Project Architecture

### Pages (routes)
| Route | Page | Features |
|-------|------|----------|
| `/` | Index (Dashboard) | Hero card, stat cards, revenue chart, stock chart, weather, visitor counter, Weibo hot search, performance widgets, music player |
| `/chat` | ChatPage | WebSocket real-time chat, contact list, emoji/file/image send |
| `/docs` | DocsPage | Documentation hub with tabs (Docs grid, Timeline, Profile, FAQ), markdown rendering with `renderMarkdown()`, comments system, article CRUD via `NewDocEditor` |
| `/user` | UserPage | User table, visitor table, daily visitor stats |
| `/analytics` | AnalyticsPage | Transactions table, expense pie chart, monthly expense line chart, CSV import, month filter |
| `*` | NotFound | 404 page |

### API Layer (`src/api/`)
- `request.js` — Shared Axios instance with `VITE_API_BASE_URL` as base URL, JWT Bearer token interceptor, 401 auto-logout
- One module per domain: `auth.js`, `chat.js`, `comment.js`, `doc.js`, `faq.js`, `hotSearch.js`, `timeline.js`, `transactions.js`, `user.js`, `visitor.js`
- Dev mode proxies `/api/*` to `http://localhost:8000` via Vite config

### Key Architecture Patterns
- **Sidebar**: Desktop vertical rail + iOS-style frosted glass mobile bottom nav — persistent across all pages
- **AuthProvider**: React context wrapping all routes, exposes `user`, `openAuth()`, `logout()`, `refreshUser()`. Shows `AuthModal` (login/signup) on demand
- **NotificationProvider**: Context for in-app notifications (sign-in/out events, likes)
- **VisitorTracker**: Auto-records visits and sends periodic heartbeats
- **Data hooks**: `useArticles()` (fetch docs, fallback to local data), `useTimeline()` (fetch timeline, fallback to articles), `useTilt()` (3D tilt card effect)
- **Markdown**: Custom inline renderer `renderMarkdown()` in `src/components/doc/DocRenderer.tsx` (no external MD library — supports headings, codeblocks, tables, lists, inline formatting)
- **WebSocket**: Chat page uses raw WebSocket at `ws[s]://<host>/api/v1/chat/ws?username=...&avatar=...`

### CSS Architecture
- **Tailwind** for utility classes
- **`src/index.css`** — CSS custom properties (neon purple/cyan theme colors), glass utility classes (`.glass`, `.glass-strong`, `.glass-hover`), 20+ custom keyframe animations
- **shadcn/ui components** in `src/components/ui/` (button, card, dialog, table, tabs, tooltip, etc.)
- **Custom components** in `src/components/dashboard/` (Particles, MusicPlayer, Sidebar, etc.)
- **Doc components** in `src/components/doc/` (DocGrid, ArticleView, DocsSidebar, DocRenderer, Comments, NewDocEditor, FaqTab, etc.)

### Environment
- `.env.development` — `VITE_API_BASE_URL=/api/v1` (proxied through Vite dev server)
- `.env.production` — `VITE_API_BASE_URL=https://alpha.coulsonzero.shop:5000/api/v1`
- `@` path alias resolves to `src/`
