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
- **Charts**: echarts
- **map**: maplibre-gl + CartoDB


### Environment
- `.env.development` — `VITE_API_BASE_URL=/api/v1` (proxied through Vite dev server)
- `.env.production` — `VITE_API_BASE_URL=https://alpha.coulsonzero.shop:5000/api/v1`
- `@` path alias resolves to `src/`
