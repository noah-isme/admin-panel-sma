# Architecture Decision Records (ADRs)

This directory contains the formal Architectural Decision Records for the **SMA Academic & Administrative Management Platform**.

## Index of Decisions

| ADR                                                              | Title                                                                            | Status   | Date    |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------- | :------- | :------ |
| [**ADR 0001**](0001-backend-migration-to-go.md)                  | Backend Migration from NestJS to Standalone Go (Gin) API                         | Accepted | 2026-08 |
| [**ADR 0002**](0002-frontend-framework-refine-antd.md)           | Frontend Architecture using Refine v4, Ant Design v5, and Vite                   | Accepted | 2026-08 |
| [**ADR 0003**](0003-shared-esm-package-zod-drizzle.md)           | Shared Pure ESM Package for Validation Schemas, Drizzle DB Models, and Constants | Accepted | 2026-08 |
| [**ADR 0004**](0004-secure-httponly-cookie-auth-lifecycle.md)    | Dual-Layer Authentication with In-Memory Access Tokens & HttpOnly Refresh Cookie | Accepted | 2026-08 |
| [**ADR 0005**](0005-asynchronous-pdf-generation-bullmq.md)       | Asynchronous PDF Report Card Generation using BullMQ Worker                      | Accepted | 2026-08 |
| [**ADR 0006**](0006-authoritative-runtime-feature-discovery.md)  | Authoritative Runtime Feature Discovery with Build-Time Vite Fallbacks           | Accepted | 2026-08 |
| [**ADR 0007**](0007-msw-for-isolated-development-and-preview.md) | Mock Service Worker (MSW) for Isolated Development, Testing, and Vercel Previews | Accepted | 2026-08 |
| [**ADR 0008**](0008-monorepo-deployment-topology.md)             | Unified Vercel Frontend Monorepo Deployment Topology                             | Accepted | 2026-08 |

---

## Contributing New ADRs

When introducing major architectural changes (e.g. changing state management libraries, altering backend communication protocols, or restructuring deployment infrastructure), create a new markdown file named `XXXX-brief-title.md` following standard ADR structure (Status, Context, Decision, Consequences) and update this index.
