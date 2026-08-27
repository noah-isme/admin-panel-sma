# ADR 0006: Authoritative Runtime Feature Discovery with Build-Time Vite Fallbacks

## Status

Accepted (Implemented)

## Context

The Go backend allows modular deployment where specific capabilities (e.g. `analytics`, `scheduler`, `reports`, `mutations`, `archives`, `homerooms`) can be enabled or disabled via environment variables. If the frontend hardcodes enabled modules at build time via static environment variables, frontend deployments become tightly coupled to specific backend configurations, causing broken navigation links or 404 errors when pointing to a backend with differing active modules.

## Decision

Implement a hybrid **Authoritative Runtime Feature Discovery** mechanism:

1. **Primary Source of Truth**: `@apps/admin` queries `GET /api/v1/features` (an unauthenticated endpoint) during application startup.
2. The dynamic response dictates which Refine resources, routes, and navigation items are registered in the UI.
3. **Build-Time Fallback**: If the runtime endpoint cannot be reached (e.g. offline development, MSW mock environments, or network outages), the UI falls back to `VITE_ENABLE_*` variables defined in `apps/admin/.env`.
4. An `ENABLE_ALL_FEATURES` / `VITE_ENABLE_ALL_FEATURES` master switch is supported for full local development.

## Consequences

- **Positive**:
  - Zero redeployment required for the frontend when backend modules are toggled.
  - Pristine user experience: navigation items for disabled backend services are automatically hidden.
  - Seamless offline and mock development using fallback flags.
- **Negative / Constraints**:
  - Requires an initial asynchronous feature fetch before final route tree registration.
