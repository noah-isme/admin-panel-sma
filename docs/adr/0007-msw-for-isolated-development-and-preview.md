# ADR 0007: Mock Service Worker (MSW) for Isolated Development, Testing, and Vercel Previews

## Status

Accepted (Implemented)

## Context

Developing and testing complex academic workflows (grading, attendance, setup wizards, analytics) requires substantial seed data and running infrastructure (PostgreSQL, Redis, Go API). Requiring full local backend stacks slows down frontend feature iteration and prevents branch preview deployments on platforms like Vercel from rendering realistic interactive data without exposing staging databases.

## Decision

Integrate **Mock Service Worker (MSW v2)** across `@apps/admin`:

1. **Browser Development & Previews**: Register `mockServiceWorker.js` in `apps/admin/public/`. When `VITE_USE_MSW=true` (or in Vercel preview environments), MSW intercepts all `/api/v1/*` network requests at the Service Worker layer and returns realistic seed datasets.
2. **Node Unit & Integration Tests**: Setup Vitest with MSW Node server (`apps/admin/test/setupTests.ts`) to intercept network calls during automated test runs.
3. **Guarded Production Bundles**: In production builds (`VERCEL_ENV=production`), MSW is strictly disabled and excluded from the live execution path.

## Consequences

- **Positive**:
  - 100% frontend developer autonomy: frontend engineers can build and test complete UI workflows without spinning up Docker, PostgreSQL, or Go.
  - Rich, interactive Vercel preview environments with seeded student, class, and grade datasets.
  - Ultra-fast Vitest test suite executing in seconds with zero external network dependencies.
- **Negative / Constraints**:
  - Mock handlers (`apps/admin/src/mocks/handlers.ts`) must be updated when API contracts change.
