# Portal browser acceptance

The portal browser suite has two intentionally separate targets:

- `pnpm --filter @apps/portal test:e2e` runs deterministic API fixtures against
  a local Vite server. It is safe for pull requests and covers parent login,
  child switching, all read-only views, cross-family scope rejection, and
  logout.
- `pnpm --filter @apps/portal test:e2e:staged` runs the staging smoke test when
  `PORTAL_STAGED=1`, `PORTAL_STAGING_URL`, `PORTAL_E2E_EMAIL`, and
  `PORTAL_E2E_PASSWORD` are provided. It must use a non-production pilot
  account and a staging API with representative linked-student data.

The scheduled/manual `Portal E2E` workflow runs both targets as appropriate and
uploads the Playwright HTML report. A passing fixture run is a regression gate,
not staging acceptance. The pilot owner must review the staging report and
record the run URL, commit, target URL, account scope, screenshots/traces when
needed, and acceptance date in the release checklist.

## Acceptance checklist

- [ ] Parent login, refresh/reload, child switch, and logout work in staging.
- [ ] A student account can see only its own records.
- [ ] A parent cannot access a student outside its linked family (403).
- [ ] Grades, report card, attendance, announcements, behavior, calendar, and
      homeroom views show their loading, empty, error, and read-only states.
- [ ] Forgot-password responses remain generic and reset links point to the
      deployed portal origin (`PORTAL_PASSWORD_RESET_URL`).
- [ ] Desktop and mobile smoke checks pass.
- [ ] Pilot owner signs off with evidence before release.
