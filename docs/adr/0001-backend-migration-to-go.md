# ADR 0001: Backend Migration from NestJS to Standalone Go (Gin) API

## Status

Accepted (Implemented)

## Context

The platform originally started as a full-stack Node.js monorepo containing a NestJS API with Prisma ORM (`apps/api`). As data volume grew and concurrency demands increased—specifically around concurrent morning attendance check-ins, bulk grade calculations, schedule generation, and report card generation—the Node.js backend exhibited memory overhead, high cold-start latency, and CPU-bound concurrency constraints.

## Decision

1. Decommission the NestJS `apps/api` workspace within this repository.
2. Migrate all backend API services to a dedicated sibling repository (`sma-adp-api`) written in **Go (Gin framework)** with clean architecture principles.
3. Retain this repository as a frontend and background worker monorepo containing `@apps/admin`, `@apps/landing`, `@apps/shared`, and `@apps/worker`.
4. Establish clear API contracts documented in OpenAPI/Swagger and synchronized via `@apps/shared`.

## Consequences

- **Positive**:
  - Significant reduction in backend memory footprint (~15MB vs ~180MB baseline).
  - Sub-millisecond baseline response times on core master data and attendance CRUD endpoints.
  - Native concurrency model (goroutines) effortlessly handles concurrent school morning traffic.
  - Clear separation of concerns between frontend interface engineers and core backend infrastructure.
- **Negative / Constraints**:
  - Requires maintaining two sibling repositories (`admin-panel-sma` and `sma-adp-api`).
  - Cross-repo contract verification requires disciplined Swagger generation and compatibility matrix maintenance (`docs/FE_BE_MAPPING.md`).
