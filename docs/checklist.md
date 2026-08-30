# Admin/API Release Checklist

> **Reviewed:** 2026-08-27
> **Scope:** admin-panel-sma and sma-adp-api

## Contract changes

- [x] Auth refresh includes credentials, unwraps the Go envelope, and rotates the HttpOnly cookie.
- [x] Auth logout includes credentials, clears/revokes the cookie, and remains callable after access expiry.
- [x] Individual Vite feature flags and explicit false overrides are tested.
- [x] Student/teacher roster status and sort aliases match the admin pages.
- [x] Grade report filters, status predicates, joins, sort aliases, and totals are implemented.
- [x] Browser CSV grade status filtering uses the same PASS/REMEDIAL/FAIL thresholds.
- [x] Swagger regenerated after handler contract changes.

## Verification

- [x] Focused Go tests: internal/handler, internal/repository, internal/service.
- [x] Frontend feature/auth contract tests.
- [x] Swagger route validator.
- [x] Static compatibility smoke.
- [ ] Seeded login → refresh → logout → refresh rejection smoke.
- [x] Full Go test/vet/build run in a configured environment.
- [x] Full admin typecheck/build run in a configured environment.

## Security and production gates

- [ ] Name and verify the gateway/WAF owner for rate limiting and login lockout.
- [ ] Keep password-hashing documentation aligned with the bcrypt implementation.
- [ ] Complete portal password-reset token/email delivery.
- [ ] Complete parent-student authorization checks for portal data routes.
- [ ] Complete and test portal announcement pagination parsing.
- [ ] Run the production rollback drill and record the result.

## Staging-only dependency exception

The previous React Router v6 exception is resolved by the coordinated Refine
and router migration. The admin panel now uses the supported v5/v7 combination:

- `@refinedev/core@5.0.12`
- `@refinedev/antd@6.0.3`
- `@refinedev/react-router@2.0.4`
- `@tanstack/react-query@5.81.5`
- `react-router@7.18.2`

- [x] `pnpm audit --prod --audit-level=moderate` reports **No known
      vulnerabilities found** for the admin workspace.
- [x] Refine v5 compatibility was revalidated with the frontend typecheck,
      lint, build, and contract/unit test suite.

Continue to run the audit before each staging promotion and attach its output
to the release record. High and critical findings remain hard release gates.

## Regeneration commands

```bash
cd ../sma-adp-api
swag init -g cmd/api-gateway/main.go -o api/swagger --parseDependency --parseInternal
python3 scripts/validate_swagger_routes.py
python3 scripts/compatibility_smoke.py
```
