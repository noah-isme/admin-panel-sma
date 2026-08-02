> ⚠️ **Historical document — partially superseded by the Go backend migration.**
>
> This frontend plan was written **before** the backend was migrated from **NestJS → Go**. References to `@nestjs/swagger`, `/docs` on the NestJS API, and an `apps/web/` structure are outdated. The implemented frontend now lives in `apps/admin/` (React + Vite + **Refine/AntD**), the API is Go at `../sma-adp-api` (`/api/v1`, Swagger at `/docs`), and API mocking uses **MSW**.
>
> The persona UX flows and delivery roadmap below are still useful as product context. For the current technical contract, see:
>
> - `../sma-adp-api/docs/FE_BE_MAPPING.md` — frontend ↔ backend endpoint map
> - `../sma-adp-api/docs/PROJECT_STATUS.md` — per-phase progress & active blockers
> - Root `README.md` — current setup & architecture

---

# Frontend & Delivery Plan – Admin Panel Sekolah

## 1. Stack & Struktur

- **Framework**: React 18 + Vite + TypeScript.
- **UI**: TailwindCSS + Headless UI/Ant Design (pilih minimal).
- **State**: React Query untuk data fetching, Zustand (opsional) untuk state lokal.
- **Routing**: React Router v6, layout per role.
- **Auth**: JWT stored in httpOnly cookies / local storage? (Prefer httpOnly cookie via api gateway) – fallback local storage dev.
- **i18n**: `react-i18next` (default id-ID).
- **Build**: Vite `pnpm build`.
- **Testing**: Vitest + Testing Library + Playwright (smoke e2e).
- **Folder**:
  ```
  apps/web/
    src/
      app/
        routes (by persona)
        components
        hooks
        services (api clients)
        store (user/role)
      assets/
      styles/
  ```

## 2. Persona UX Flows

### Admin TU

1. **Wizard Pra-Semester**
   - Step 1: Buat Tahun Ajar & Term (draft) → validasi tanggal.
   - Step 2: Upload CSV siswa (drag-drop) → pratinjau hasil & error (baris, alasan).
   - Step 3: Upload CSV guru → pratinjau.
   - Step 4: Buat kelas (form) + assign wali.
   - Step 5: Mapel & assign guru (table editable).
   - Step 6: Jadwal (manual grid + tombol “generate” + panel konflik).
   - Step 7: Buat akun pengguna → triger kirim kredensial (tampilkan status).
2. **Dashboard Pra-Semester**: Ringkasan status term, import progress, konflik jadwal.
3. **Pengumuman**: CRUD, schedule publish.
4. **Mutasi/Arsip**: Form permohonan mutasi, tombol ekspor rapor/absensi.

### Wali Kelas

1. **Beranda**: daftar tugas (absensi harian, verifikasi nilai pending, siswa absen sering).
2. **Absensi Harian**: Table siswa + dropdown H/S/I/A, note input wajib untuk S/I.
3. **Catatan Perilaku**: Form + list histori per siswa.
4. **Verifikasi Nilai**: Tab per mapel, lihat status finalisasi guru, tombol verifikasi.
5. **Rekap Absensi**: Chart kehadiran, highlight A>X.

### Guru Mapel

1. **Beranda**: jadwal hari ini, status nilai.
2. **Absensi Per Jam**: akses schedule per pertemuan, input status.
3. **Nilai**: Kelola GradeConfig (if allowed), GradeItem, input skor (tabel inline), progress finalisasi.
4. **Finalisasi**: ringkasan per kelas, tombol finalisasi (konfirmasi).

### Kepala Sekolah (Read-only)

1. **Dashboard**:
   - Distribusi nilai (chart).
   - Outlier detection list.
   - Daftar remedial < KKM.
   - Absensi summary (top absen).
2. **Pengumuman**: Approve / publish.
3. **Akses rapor**: lihat status job, download.

### (Opsional) Siswa/Ortu

Simple portal: jadwal, nilai, absensi, pengumuman. (prioritas rendah).

## 3. Navigasi & Layout

- **App shell**: sidebar + top bar (info user, switch term).
- Role-based routes via `ProtectedRoute` + RBAC guard (reuse from admin panel).
- Multi-tenant term selection (context).
- Notification panel (toasts) untuk hasil aksi (import, finalisasi).

## 4. API Client & Hooks

- `services/apiClient.ts` (axios).
- Hooks: `useAcademicYears`, `useImportStudents`, `useAbsenceDailyMutation`, `useGradeFinalization`, etc.
- Generic `useCsvUpload` with progress.
- Student and teacher CSV imports are synchronous row-processing requests (`POST /students/import`
  and `POST /teachers/import`) and return validation summaries in the response. The admin page is
  therefore named **Pra-Semester Snapshot**: it reads current table data and does not poll an
  import-job endpoint. `GET /imports/:id` is not a registered contract. Report jobs remain
  asynchronous and may use `GET /reports/status/:jobId`.
- Uploads include an `Idempotency-Key`; the API enforces a 5 MiB/10,000-row limit,
  replays completed retries, reports duplicate rows without rolling back valid rows,
  and records the result in `import_runs` plus the audit log.

## 5. Testing Strategy (Frontend)

- **Unit**: component states, validation (Vitest).
- **Integration**: form submit flows (Testing Library).
- **E2E**: Playwright scenarios:
  1. Admin TU completes wizard (mock API).
  2. Wali Kelas input absensi S tanpa note → error.
  3. Guru finalisasi nilai → status update.
  4. Kepala Sekolah dashboard renders metrics (seed data).
- Coverage target 70% for critical routes (wizard, attendance, grades).

## 6. Delivery Roadmap (Frontend + Cross)

| Sprint | Fokus                                                   | Deliverables                                                                                  |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1      | Setup monorepo, auth shell, RBAC guard, layout skeleton | Login, navigation per role, basic dashboard placeholder.                                      |
| 2      | Wizard pra-semester (AY/Term, import CSV, kelas, mapel) | CSV upload UI + validation, schedule conflict UI, user provisioning screen.                   |
| 3      | Attendance & Notifications                              | Wali Kelas absensi harian, Guru mapel absensi, integration notifikasi status, chart absen.    |
| 4      | Grades module                                           | Grade config UI, score entry, finalisasi/verification flow, toasts.                           |
| 5      | Reports & Dashboard                                     | Trigger batch rapor, job status UI, Kepsek dashboard charts, remedial list.                   |
| 6      | Mutasi & Arsip + Polishing                              | Mutasi forms, archive download, audit log viewer, SOP link integration, accessibility review. |
| 7      | Testing & Documentation                                 | Playwright suites, coverage compliance, SOP PDF, README updates, Swagger review, final demo.  |

## 7. Documentation & Assets

- **README**: setup dev (pnpm, env, docker-compose), module map, testing, deployment.
- **SOP PDF** (docs/sop-sis.pdf) – outlines: setup pra-semester, absensi & nilai, finalisasi & rapor, mutasi.
- **CSV Templates**: `templates/students.csv`, `templates/teachers.csv`, `templates/attendance-export.csv`.
- **Postman collection**: `/docs/sis.postman_collection.json`.
- **Swagger**: generated via `@nestjs/swagger` accessible `/docs`.
- **Architecture diagrams**: optional (Mermaid).

## 8. Collaboration Notes

- Reuse existing RBAC provider; ensure consistent role naming.
- Align API pagination/filter with React Query usage.
- Use `msw` mocks for frontend dev before API ready.
- Storybook optional for shared components (forms, tables).
- Accessibility & i18n: ensure label translation, date/time formatting (WIB).

Dokumen ini melengkapi blueprint backend dan menjadi panduan implementasi UI, testing, serta deliverables lintas tim.
