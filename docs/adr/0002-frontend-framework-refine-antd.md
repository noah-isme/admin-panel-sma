# ADR 0002: Frontend Architecture using Refine v4, Ant Design v5, and Vite

## Status

Accepted (Implemented)

## Context

The administrative portal requires deep support for enterprise data operations: extensive data tables (hundreds of students, teachers, grades, schedules), inline editing, complex filtering, multi-level form wizards, role-based navigation guards, and real-time query invalidation. Building these boilerplate structures manually in standard React causes significant developer overhead.

## Decision

Adopt **Refine v4 (`@refinedev/antd`)** paired with **Ant Design v5**, **React 18**, and **Vite** as the core foundation for `@apps/admin`:

1. Use Refine's resource-driven model (`<Refine resources={[...]} />`) for declarative routing, breadcrumbs, and permission checks.
2. Implement custom providers (`dataProvider.ts`, `authProvider.ts`, `accessControlProvider.ts`) to adapt Refine to our Go backend and RBAC specifications.
3. Leverage TanStack Query (`@tanstack/react-query`) for automatic server-state caching, background revalidation, and mutation invalidation.
4. Utilize Ant Design v5 design tokens for consistent academic visual hierarchy and theme customization.

## Consequences

- **Positive**:
  - Out-of-the-box data hooks (`useTable`, `useForm`, `useShow`, `useList`, `useCreate`, `useUpdate`) reducing standard CRUD development time by >60%.
  - Consistent layout and UX across 20+ resource management pages.
  - Sub-second hot module reloading (HMR) powered by Vite.
  - Native integration of role-based access control via `canAccess` hooks.
- **Negative / Constraints**:
  - Tight coupling to Refine framework idioms and Ant Design component hierarchy.
  - Mobile responsiveness requires custom responsive adapter components (`ResponsiveList`, `MobileCardList`, `FiltersBottomSheet`) to supplement standard desktop AntD tables.
