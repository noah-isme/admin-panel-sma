# GEMINI.md

## Project Overview

This is a **pnpm monorepo** for a student attendance & grading management platform (Admin Panel SMA). The backend was migrated from NestJS to **Go** and now lives in a separate repository, `sma-adp-api` (sibling at `../sma-adp-api`). This repo contains only the **frontend, shared types/schemas, and a BullMQ worker**.

### Workspaces

- **`@apps/admin`** — Admin panel built with **React 18 + Vite + Refine (`@refinedev/antd`)** + Ant Design + React Router v6. Data/auth/access-control providers live in `src/providers`. Data fetching via `@tanstack/react-query`. Mocks via **MSW** for frontend-only development.
- **`@apps/shared`** — Shared Zod schemas, Drizzle ORM schema (`db/schema`), typed DB client (`db/client`), and constants (roles, queue names, security). ESM package, built to `output/` (`pnpm --filter @apps/shared build`).
- **`@apps/worker`** — Node BullMQ worker. Currently implements only the `REPORT_PDF_QUEUE` (PDF rapor generation). ESM, reads the root `.env` via `tsx --env-file`.
- **`@apps/landing`** — Public marketing/landing page (React + Vite + Tailwind).

Backend API: **Go (Gin)** in `../sma-adp-api`, served at `http://localhost:8081/api/v1` (prefix `/api/v1`). Health at `/health`, Swagger at `/docs` (dev). Feature-flagged modules and endpoint availability are documented in `../sma-adp-api/docs/PROJECT_STATUS.md` and `../sma-adp-api/docs/FE_BE_MAPPING.md`.

## Building and Running

### Prerequisites

- Node.js 20+ and pnpm 10+ (`packageManager: pnpm@10.34.5`)
- The Go backend from `../sma-adp-api` (run `make dev` there)
- Postgres + Redis (Docker: `cd ../sma-adp-api && make docker-up`)

### Development

From the repo root:

```bash
pnpm install
pnpm dev          # runs @apps/admin + @apps/landing concurrently
pnpm --filter @apps/worker dev   # BullMQ worker (needs Postgres + Redis from root .env)
```

Start the Go API in a separate terminal:

```bash
cd ../sma-adp-api && make dev   # http://localhost:8081/api/v1
```

- Admin UI: `http://localhost:5173`
- API base resolved by the admin from `VITE_API_URL` (default `http://localhost:8081/api/v1`); in MSW/dev it falls back to same-origin `/api`.

### Build & Test

```bash
pnpm build        # builds all workspaces (pnpm -r build)
pnpm test         # vitest across workspaces
pnpm --filter @apps/admin test:e2e   # Playwright e2e
pnpm lint         # ESLint (v9 flat config)
pnpm typecheck    # tsc -b
pnpm format       # Prettier across workspaces
```

## Development Conventions

- **Linting/formatting**: ESLint v9 flat config (`eslint.config.js`); Prettier; Husky `pre-commit` runs `lint-staged` → `prettier --write`.
- **Shared package**: ESM (`"type": "module"`); all relative imports need `.js` extensions; build to `output/` before the worker can compile. When adding a domain contract, add a Zod schema in `apps/shared/src/schemas/` and export it from `schemas/index.ts`.
- **Path aliases** (admin): `@/*` → `src/*`, `@shared/*` → `../shared/src/*` (defined in `apps/admin/tsconfig.json` and `vite.config.ts`). Do not use `@api/*` (the NestJS app is gone).
- **Admin data flow**: `dataProvider.ts` (axios) maps Refine resources to REST endpoints (GET list/get, POST create, PATCH update, DELETE). Auth tokens stored in `localStorage` under `access_token`/`refresh_token`; a Bearer header is added by an axios interceptor. `authProvider.ts` posts to `/auth/login`, unwraps the `{ data: {...} }` envelope and accepts both snake_case and camelCase token fields. RBAC is client-side via `accessControlProvider.ts` (roles: SUPERADMIN, ADMIN_TU, WALI_KELAS, GURU_MAPEL, KEPALA_SEKOLAH, SISWA, ORTU).
- **API contract**: the Go backend returns **snake_case** JSON wrapped in `{ "data": ... }` (see `pkg/response/response.go` in the API repo). Login returns `access_token`, `refresh_token`, `expires_in`, `user`, `issued_at`.
- **Worker (ESM gotchas)**: `pg` is CommonJS — import default then destructure (`import pkg from "pg"; const { Pool } = pkg`); use `InstanceType<typeof Pool>` for types. `bullmq`/`ioredis` support named ESM imports.

> Source of truth for the backend is `../sma-adp-api/docs/PROJECT_STATUS.md`. For the frontend↔backend endpoint map, see `../sma-adp-api/docs/FE_BE_MAPPING.md`.
