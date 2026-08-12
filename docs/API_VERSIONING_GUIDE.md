# API Versioning Guide

> **Status:** Current operating guide
> **Reviewed:** 2026-08-09
> **Owner:** Admin/API maintainers

## Current contract

The production API is the Go service at the /api/v1 prefix. The configured
prefix is the source of truth (APIPREFIX, default /api/v1); the admin client
uses the discovered prefix from GET /features when available.

There is currently no /api/v2 route, Accept-Version routing, API-Version
response header, deprecation header, or v2 feature flag. Do not infer a v2
release or sunset date from this document.

JSON responses use the common Go envelope:

```json
{ "data": {}, "pagination": {}, "meta": {} }
```

Resource fields are snake_case at the API boundary. The admin data provider
converts its browser-facing camelCase values where a compatibility route
requires it. Compatibility aliases and their readiness are tracked in the
backend [compatibility contract matrix](../../sma-adp-api/docs/COMPATIBILITY_CONTRACT_MATRIX.md).

## Change policy

Within v1:

- Additive endpoints and optional response fields are backward-compatible.
- New required fields, changed meanings, removed fields, changed auth behavior,
  and changed status/enum semantics require an explicit migration decision.
- Keep legacy query aliases only when they are listed in the compatibility
  matrix; do not add undocumented aliases as a substitute for a typed contract.
- When a breaking change is approved, introduce a new major prefix and migrate
  clients deliberately. No v2 work is active at the time of this review.

## Release procedure for API changes

1. Update the Go handler/model contract and the admin request/response types
   together.
2. Update handler annotations and regenerate Swagger:

   ```bash
   cd ../sma-adp-api
   swag init -g cmd/api-gateway/main.go -o api/swagger --parseDependency --parseInternal
   ```

3. Run the static contract checks:

   ```bash
   python3 scripts/validate_swagger_routes.py
   python3 scripts/compatibility_smoke.py
   ```

4. Run focused Go/frontend tests, then seeded compatibility smoke when the
   database and gateway are available.
5. Update docs/COMPATIBILITY_CONTRACT_MATRIX.md, the canonical API
   specification, and PROJECT_STATUS.md with the actual evidence and date.
6. If a field or route is deprecated, record the replacement, owner, removal
   condition, and migration test in the matrix. Do not publish a sunset date
   until the replacement is live and verified.

## Client integration rules

- Use GET /features before rendering optional navigation. Build-time Vite
  flags are an offline/MSW fallback, not a second runtime route registry.
- Use the common response envelope and the documented snake_case API payload.
- For auth, the access token is memory-only; refresh/logout send browser
  credentials so the API can rotate or clear its HttpOnly `refresh_token` cookie.
  Refresh responses are unwrapped from `data`, and logout is a public 204 route.
- Prefer canonical resource routes. Use compatibility routes only when their
  matrix row is marked integrated and the required aliases are documented.

## References

- [Canonical Go API specification](../../sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md)
- [Compatibility matrix](../../sma-adp-api/docs/COMPATIBILITY_CONTRACT_MATRIX.md)
- [Admin/API release checklist](checklist.md)
- [Swagger route validator](../../sma-adp-api/scripts/validate_swagger_routes.py)
