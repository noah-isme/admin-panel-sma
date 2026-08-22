# ADR 0008: Unified Vercel Frontend Monorepo Deployment Topology

## Status

Accepted (Implemented)

## Context

The repository houses both a marketing landing page (`@apps/landing`) and an administrative single-page application (`@apps/admin`). Deploying these as separate Vercel projects increases DNS configuration complexity, adds CORS overhead, and duplicates CI/CD pipeline costs.

## Decision

Adopt a unified single-project deployment model configured via root `vercel.json`:

1. The build pipeline compiles `@apps/shared`, `@apps/landing`, and `@apps/admin` in sequence.
2. The outputs are merged into a root `deploy/` directory:
   - Root path `/` serves `@apps/landing` (`deploy/index.html`).
   - Subpath `/admin/*` serves `@apps/admin` (`deploy/admin/index.html`).
3. Vercel rewrite rules in `vercel.json` route all SPA navigation under `/admin/*` to `deploy/admin/index.html` with HTML5 history pushState support.
4. Independent background services (Go API and `@apps/worker`) are deployed to Railway / VPS container environments.

## Consequences

- **Positive**:
  - Single Vercel project and single custom domain (e.g. `school.sch.id` for landing and `school.sch.id/admin` for portal).
  - Simplified preview deployments: every pull request gets a single preview URL containing both landing and admin applications.
  - Clear separation between static edge hosting (Vercel) and long-running backend compute (Railway/VPS).
- **Negative / Constraints**:
  - Vite base path in `@apps/admin` must be configured to `/admin/` in production mode.
