# Actionable Engineering Checklist (TODO.md)

## Active Tasks & Backlog

---

## 🔥 High Priority (Phase 5 Completion & Pre-Cutover)

- [ ] **Analytics Drilldown Enhancements (`apps/admin/src/pages/analytics-drilldown.tsx`)**

  - [ ] Implement student-level attendance risk drilldowns with historical trend charts.
  - [ ] Connect subject score distribution heatmaps to live backend analytics API.
  - [ ] Add CSV export for aggregated analytics metrics.

- [ ] **Schedule Generator Optimization (`apps/admin/src/pages/schedule-generator.tsx`)**

  - [ ] Test constraint solver against edge cases (teachers with strict availability windows, shared lab rooms).
  - [ ] Display visual conflict resolution badges in generated timetable previews.

- [ ] **Automated Testing & Coverage**
  - [ ] Expand Playwright E2E scenarios covering the full report card generation lifecycle (Teacher input -> Homeroom verify -> PDF generation).
  - [ ] Verify Vitest test suite maintains >90% coverage on shared schemas and data providers.

---

## 🛡️ Security & Performance Hardening (Phase 6)

- [ ] **Production Infrastructure Lockdown**

  - [ ] Verify `ALLOWED_ORIGINS` in Go API strictly matches production Vercel domains.
  - [ ] Confirm no authentication tokens are leaked into browser `localStorage` or `sessionStorage`.
  - [ ] Validate rate limiting and brute-force lockout rules on API gateway / Cloudflare WAF.

- [ ] **Storage & Worker Optimization**
  - [ ] Configure Supabase / Cloudflare R2 bucket lifecycle rules for automated PDF archiving.
  - [ ] Benchmark BullMQ concurrency settings under simulated load of 50 simultaneous class rapor batches.

---

## 🧹 Technical Debt & Documentation Maintenance

- [ ] Re-run `python3 scripts/compatibility_smoke.py` in `../sma-adp-api` with seeded test database.
- [ ] Ensure all new React components in `@apps/admin` utilize `ResponsiveList` for mobile parity.
- [ ] Verify that every relative TypeScript import across `@apps/shared` and `@apps/worker` includes `.js` extensions.
