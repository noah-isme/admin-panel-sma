# Copilot Instructions for admin-panel-sma

## Architecture snapshot

- pnpm workspace. The backend was migrated from NestJS to **Go** and now lives in a separate repo at `../sma-adp-api` (Gin, `pgx`, Redis). This repo no longer contains a backend app — there is **no `apps/api`**.
- Workspaces: `apps/admin` (React + Vite + Refine/AntD), `apps/shared` (Zod schemas, Drizzle schema, constants), `apps/worker` (BullMQ `REPORT_PDF_QUEUE`), `apps/landing` (public site). Type aliases live in `tsconfig.base.json` + each app's `tsconfig.json`.
- Admin app uses Refine (`@refinedev/core` + `@refinedev/react-router-v6` + `@refinedev/antd`). Data/auth/access-control providers are in `apps/admin/src/providers/`. API base comes from `VITE_API_URL` (default `http://localhost:8081/api/v1`); axios client with `withCredentials` + Bearer token from `localStorage`.
- Shared validation contracts live in `apps/shared/src/schemas/` (Zod). The admin imports them as `@shared/schemas` (alias `@shared/*` → `../shared/src/*`). Reuse these instead of redefining DTOs.
- Authorization is client-side RBAC via `accessControlProvider.ts` (roles: SUPERADMIN, ADMIN_TU, WALI_KELAS, GURU_MAPEL, KEPALA_SEKOLAH, SISWA, ORTU) **plus** server-side JWT/RBAC enforced in the Go API. Never rely on the client check alone for security.

## Coding patterns to follow

- Frontend pages are React components under `apps/admin/src/pages/` and registered as Refine resources in `apps/admin/src/main.tsx` (`resources` array). Add new CRUD pages there and wire their routes in the resource loop.
- Data access goes through the Refine `dataProvider` (axios → Go API). Use `useList`/`useOne`/`useCreate`/`useUpdate`/`useDelete` from Refine; do not hand-roll fetch calls in components.
- Use `nanoid()` for client-generated IDs where needed. Shared constants (roles, queue names) come from `@apps/shared` (`@shared/constants`).
- The Go API returns **snake_case** JSON wrapped in `{ "data": ... }` (envelope in `pkg/response/response.go` in the API repo). The auth provider already unwraps the envelope and tolerates snake_case/camelCase token fields.
- When adding a domain contract: add the Zod schema under `apps/shared/src/schemas/`, export it from `schemas/index.ts`, and keep the Drizzle schema in `apps/shared/src/db/schema.ts` consistent.

## Commands & workflows

- Install: `pnpm install`. Use filters for subprojects: `pnpm --filter @apps/admin dev|build|test`, `pnpm --filter @apps/worker dev|build`, `pnpm --filter @apps/shared build`.
- Tests: `pnpm --filter @apps/admin test` (Vitest), `pnpm --filter @apps/admin test:e2e` (Playwright); shared uses Vitest via `pnpm --filter @apps/shared test`.
- Root scripts: `pnpm dev` (admin+landing), `pnpm build` (`pnpm -r build`), `pnpm test`, `pnpm lint` (ESLint v9 flat), `pnpm typecheck` (`tsc -b`), `pnpm format` (Prettier).
- Lint uses ESLint v9 flat config (`eslint.config.js`). Husky `pre-commit` runs `lint-staged` → `prettier --write`.
- The shared package is ESM and must be built (`output/`) before the worker compiles: run `pnpm --filter @apps/shared build` first if the worker build fails with "cannot find @apps/shared".

## Environment & external services

- Root `.env` (read by the worker via `tsx --env-file`): `DATABASE_URL`, `REDIS_URL`, storage driver (`supabase` or `r2`) + keys. JWT/secrets/argon2 now live in **`../sma-adp-api/.env`** (the Go repo), not here.
- Admin env goes in `apps/admin/.env`: `VITE_API_URL` (Go API base), `VITE_USE_MSW` (enable MSW mocks). See root `README.md` for the full table.
- Worker storage uses Supabase signed uploads or Cloudflare R2 presigned PUTs; report generation enqueues on `REPORT_PDF_QUEUE` (see `@shared/constants/queues`).

## Common gotchas

- This repo is fully **ESM** (`"type": "module"`). Relative imports must include `.js` extensions; barrel `index.ts` re-exports need `.js` too.
- `pg` is CommonJS: `import pkg from "pg"; const { Pool } = pkg;` (not `import { Pool }`). Use `InstanceType<typeof Pool>` for types.
- Import the shared package as `@shared/*` (admin alias) — not `@api/*` (that NestJS app was removed).
- The Go backend is the source of truth for endpoints/contract: check `../sma-adp-api/cmd/api-gateway/main.go` (routes), `../sma-adp-api/api/swagger` (public contract), and `../sma-adp-api/docs/FE_BE_MAPPING.md` (FE↔BE map) before adding API calls.

If anything here is unclear or missing, let me know so we can refine this guide.
