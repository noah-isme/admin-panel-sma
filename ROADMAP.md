# Product & Engineering Roadmap (ROADMAP.md)

## SMA Academic & Administrative Management Platform

---

## 1. Roadmap Overview & Strategic Horizon

```mermaid
gantt
    title Platform Engineering Roadmap
    dateFormat  YYYY-MM-DD
    section Core Foundations
    Phase 0: Infrastructure & ESM Monorepo :done, p0, 2026-06-01, 2026-06-15
    Phase 1: Auth, Session Cookies & RBAC  :done, p1, 2026-06-16, 2026-06-30
    section Academic Workflows
    Phase 2: Academic Master Data & Timetable :done, p2, 2026-07-01, 2026-07-20
    Phase 3: Student Grading & Report Engine :done, p3, 2026-07-21, 2026-08-05
    Phase 4: Attendance, Calendar & Notes  :done, p4, 2026-08-06, 2026-08-18
    section Optimization & Scale
    Phase 5: Analytics Drilldowns & Optimizer:active, p5, 2026-08-19, 2026-09-10
    Phase 6: Production Cutover & Hardening  :crit, p6, 2026-09-11, 2026-09-30
```

---

## 2. Milestone Breakdown by Phase

### Phase 0: Infrastructure, Monorepo & Tooling (Completed ✅)

- [x] Monorepo restructuring using `pnpm` workspaces (`@apps/admin`, `@apps/landing`, `@apps/shared`, `@apps/worker`).
- [x] Pure ESM packaging and build pipeline for `@apps/shared`.
- [x] ESLint v9 flat config, Prettier, and Husky pre-commit hooks.
- [x] Unified Vercel deployment model (`vercel.json`) serving landing at `/` and admin at `/admin`.
- [x] Vitest integration with MSW Node server setup.

### Phase 1: Authentication, Session Security & RBAC (Completed ✅)

- [x] In-memory access token storage with Axios authorization header interceptor.
- [x] HttpOnly, SameSite=Lax refresh token cookie lifecycle with server-side JTI rotation and Redis revocation.
- [x] Role-Based Access Control mapping for 7 roles (`SUPERADMIN`, `ADMIN_TU`, `WALI_KELAS`, `GURU_MAPEL`, `KEPALA_SEKOLAH`, `SISWA`, `ORTU`).
- [x] Password reset workflow with secure token verification.

### Phase 2: Academic Master Data & Timetable (Completed ✅)

- [x] Academic Years and Terms management with single active term enforcement.
- [x] Master data CRUD for Students, Teachers, Classrooms, and Subjects.
- [x] Pre-Semester Setup Wizard with bulk CSV validation against Zod schemas.
- [x] Class-Subject allocations and Homeroom teacher assignment interface.
- [x] Master Timetable weekly visual matrix with conflict detection.

### Phase 3: Assessment, Gradebook & Report Card Engine (Completed ✅)

- [x] Configurable grading schemes supporting Kurikulum Merdeka and K13 passing standards (KKM).
- [x] Formative and Summative grade component configuration.
- [x] High-density spreadsheet grade entry with soft-deletion and recovery support.
- [x] Asynchronous PDF report card (Buku Rapor) generation using BullMQ worker (`@apps/worker`).
- [x] Real-time batch report generation status polling and ZIP export.

### Phase 4: Attendance Management, Calendar & Communication (Completed ✅)

- [x] Daily homeroom attendance roll-call interface with multi-status toggles.
- [x] Per-lesson attendance tracking for subject teachers.
- [x] Dynamic QR code session generation for rapid student check-in.
- [x] Student behavior notes (Catatan Perilaku) for pastoral tracking.
- [x] School-wide announcements and academic calendar events.

---

### Phase 5: Advanced Analytics, Optimization & Automation (Active 🔶)

- [x] Executive dashboard with KPI summary cards and 14-day attendance charts.
- [x] Dynamic Authoritative Runtime Feature Discovery (`GET /api/v1/features`).
- [x] Mobile responsive UI refactoring (`ResponsiveList`, `MobileCardList`, `FiltersBottomSheet`, `StickyActionBar`).
- [ ] **In Progress**: Deep-dive academic analytics drilldown (subject difficulty heatmaps and KKM failure risk alerts).
- [ ] **In Progress**: Automated constraint-satisfaction schedule generator fine-tuning for teacher preferences.
- [ ] **Planned**: Redis cache warming for complex aggregated queries.

---

### Phase 6: Production Cutover, Hardening & Decommissioning (Upcoming 🚀)

- [ ] Production load testing simulating concurrent morning roll-call across 100+ classrooms.
- [ ] End-to-End Playwright test suite execution on production preview environments.
- [ ] Security penetration audit: CORS origin locking, rate limiting on auth endpoints, and WAF configuration.
- [ ] S3/Supabase storage lifecycle rules for automatic document archival retention.
- [ ] Final decommission of legacy artifacts and cutover sign-off.

---

## 3. Future Horizons & Long-Term Enhancements

1. **Automated Parent Messaging Gateway**: Direct WhatsApp / SMS integration via webhook for unexcused student absence notifications and report card releases.
2. **Kurikulum Merdeka P5 Portfolio**: Specialized assessment module for Proyek Penguatan Profil Pelajar Pancasila (P5) with qualitative rubrics and digital student portfolios.
3. **Multi-Campus Tenant Partitioning**: Architecture support for multi-campus high school networks sharing a centralized administrative cluster.
