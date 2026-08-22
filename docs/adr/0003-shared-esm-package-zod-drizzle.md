# ADR 0003: Shared Pure ESM Package for Validation Schemas, Drizzle DB Models, and Constants

## Status

Accepted (Implemented)

## Context

Multiple consumers within the ecosystem require identical domain entity schemas:

- `@apps/admin` needs client-side validation rules for forms and CSV batch imports.
- `@apps/worker` requires TypeScript entity definitions and database table models to query PostgreSQL directly.
- Maintaining independent schema definitions across packages caused schema drift and subtle validation bugs.

## Decision

Create `@apps/shared` as a centralized, pure **ES Modules (ESM)** package:

1. Define all runtime entity schemas using **Zod** (`src/schemas/*`).
2. Define PostgreSQL relational schemas using **Drizzle ORM** (`src/db/schema.ts`).
3. Maintain domain constants (User roles, Queue names, Session timeouts) in `src/constants/*`.
4. Compile the package to `output/` using TypeScript before dependent packages are built.
5. Enforce strict ESM module resolution: relative imports must explicitly specify the `.js` extension.

## Consequences

- **Positive**:
  - Single source of truth for runtime validation and static TypeScript types.
  - Zero schema drift between frontend forms, worker jobs, and database migrations.
  - Modern, bundle-efficient ESM module distribution compatible with Vite and Node 20+.
- **Negative / Constraints**:
  - Any change to `@apps/shared` requires running `pnpm --filter @apps/shared build` before dependent packages or typechecks can succeed.
  - ESM imports in Node require `.js` extensions in source files, which requires developer discipline.
