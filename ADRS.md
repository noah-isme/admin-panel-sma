# Architecture Decision Records (ADRs)

The architectural decisions and architectural constraints governing this platform are documented in [`docs/adr/`](docs/adr/):

- [**ADR 0001: Backend Migration to Go API**](docs/adr/0001-backend-migration-to-go.md) — Decoupling the NestJS backend into a dedicated Go (`sma-adp-api`) service.
- [**ADR 0002: Frontend Framework Selection (Refine + Ant Design + Vite)**](docs/adr/0002-frontend-framework-refine-antd.md) — Adopting Refine v4 and AntD v5 for rapid, standardized enterprise data management.
- [**ADR 0003: Shared ESM Package for Contracts & Schemas**](docs/adr/0003-shared-esm-package-zod-drizzle.md) — Isomorphic Zod validation, Drizzle ORM models, and constants in `@apps/shared`.
- [**ADR 0004: Dual-Layer Authentication & Secure Cookie Lifecycle**](docs/adr/0004-secure-httponly-cookie-auth-lifecycle.md) — In-memory access tokens and HttpOnly refresh token cookie rotation.
- [**ADR 0005: Asynchronous PDF Report Card Generation with BullMQ**](docs/adr/0005-asynchronous-pdf-generation-bullmq.md) — Offloading heavy PDF rendering to a dedicated background worker.
- [**ADR 0006: Runtime Feature Discovery with Build-Time Fallbacks**](docs/adr/0006-authoritative-runtime-feature-discovery.md) — Authoritative discovery via `GET /api/v1/features`.
- [**ADR 0007: MSW for Isolated Development and Vercel Previews**](docs/adr/0007-msw-for-isolated-development-and-preview.md) — Zero-backend frontend velocity and safe preview environments.
- [**ADR 0008: Unified Vercel Monorepo Deployment Topology**](docs/adr/0008-monorepo-deployment-topology.md) — Single merged `deploy/` artifact serving landing at `/` and admin at `/admin`.

Refer to the [ADR Index](docs/adr/README.md) for full details.
