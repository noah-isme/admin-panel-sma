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

React Router `6.30.4` remains reachable through the Refine v6 router adapter and
is reported by `pnpm audit --prod` for the following moderate advisories:

- `GHSA-wrjc-x8rr-h8h6` / `CVE-2025-68470`: backslash-based open redirect in
  React Router links and `useNavigate`.
- `GHSA-jjmj-jmhj-qwj2`: open redirect leading to XSS in `react-router-dom`.
- `GHSA-337j-9hxr-rhxg`: constructor injection during React Router SSR
  hydration.

The following time-bounded exception is permitted for the staging candidate
only, subject to release-owner approval:

- [ ] Exception approved for staging through **2026-09-10**, or until the
      candidate is promoted to production, whichever comes first.
- The admin bundle is a client-only SPA and does not use React Router SSR
  hydration. All dynamic setup-summary destinations go through the exact
  `/terms` and `/students` allowlist in
  `apps/admin/src/utils/navigation.ts`; backslashes, encoded path separators,
  protocol-relative paths, schemes, query strings, and fragments fail closed to
  `/`.
- Re-run `pnpm audit --prod` before every staging promotion and attach the
  output to the release record. High and critical findings remain a hard gate;
  this exception covers only the three documented moderate advisories.
- Production remains blocked until the app moves to a supported Refine/router
  combination using React Router `>=7.18.0`, or the advisories are otherwise
  resolved and re-verified.

## Regeneration commands

```bash
cd ../sma-adp-api
swag init -g cmd/api-gateway/main.go -o api/swagger --parseDependency --parseInternal
python3 scripts/validate_swagger_routes.py
python3 scripts/compatibility_smoke.py
```
