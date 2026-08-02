> ⚠️ **Historical document — superseded by the Go backend migration.**
>
> This blueprint was written **before** the backend was migrated from **NestJS → Go**. It describes a NestJS + Fastify + Prisma + BullMQ architecture under `apps/api/` that has since been **removed**. The backend now lives in the separate repository **`sma-adp-api`** (Go/Gin + pgx + Redis). The BullMQ worker that remains in this monorepo (`apps/worker`) only implements the `REPORT_PDF_QUEUE`.
>
> For the current, authoritative documentation use:
>
> - `../sma-adp-api/docs/PROJECT_STATUS.md` — per-phase progress & active blockers
> - `../sma-adp-api/docs/FE_BE_MAPPING.md` — frontend ↔ backend endpoint map
> - `../sma-adp-api/docs/BACKEND_MIGRATION_PLAN.md` — migration strategy
> - `../sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md` — Go API contract
> - Root `README.md` — current setup & architecture
>
> Keep this file only as historical design context. Do **not** follow its NestJS-specific instructions.

---

# Backend Architecture – Admin Panel Sekolah

## 1. Stack & Modul

- **Framework**: NestJS + Fastify adapter.
- **ORM**: Prisma (`/prisma/schema.prisma`) terhubung PostgreSQL.
- **Queue**: BullMQ (Redis) dengan `@nestjs/bullmq`.
- **Storage**: S3-compatible (MinIO) via `@aws-sdk/client-s3`.
- **PDF Rendering**: Puppeteer (headless Chromium).
- **Auth**: JWT (access+refresh) + RBAC guard.
- **Validation**: Zod / class-validator; CSV parsing pakai `fast-csv`.
- **Observability**: Pino logger (JSON) + interceptors (audit, correlation ID).

```
apps/
 └ api/
    ├ src/
    │  ├ main.ts (bootstrap Nest)
    │  ├ app.module.ts
    │  ├ config/ (env, database, queue, mail, storage)
    │  ├ common/ (guards, interceptors, filters, pipes)
    │  ├ auth/
    │  ├ academic/        (AcademicYear, Term)
    │  ├ roster/          (Student, Teacher, Classroom, ClassSubject)
    │  ├ schedule/        (Schedule, generator, conflict)
    │  ├ import/          (CSV upload + job)
    │  ├ attendance/
    │  ├ grades/
    │  ├ communication/   (Announcement, BehaviorNote)
    │  ├ reports/
    │  ├ dashboard/
    │  ├ mutation/
    │  ├ audit/
    │  └ notifications/   (email/wa adapter)
    └ test/
```

## 2. Skema Database

Prisma model ringkas sesuai spesifikasi (timestamps otomatis `createdAt`, `updatedAt`). Semua tanggal/timestamp disimpan UTC (TIMESTAMP WITH TIME ZONE). Contoh potongan:

```prisma
model AcademicYear {
  id        String   @id @default(cuid())
  name      String
  startDate DateTime
  endDate   DateTime
  status    AcademicYearStatus
  terms     Term[]
  auditLogs AuditLog[]
}

model Term {
  id             String   @id @default(cuid())
  academicYearId String
  name           String
  startDate      DateTime
  endDate        DateTime
  status         TermStatus
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  classrooms     Classroom[]
  reportJobs     ReportJob[]
  auditLogs      AuditLog[]
}

model Student {
  id              String   @id @default(cuid())
  nis             String   @unique
  fullName        String
  gender          String
  birthDate       DateTime
  guardianName    String?
  guardianPhone   String?
  status          StudentStatus @default(ACTIVE)
  classrooms      Enrollment[]
  attendanceDaily AttendanceDaily[]
  attendanceLesson AttendanceLesson[]
  gradeScores     GradeScore[]
  behaviorNotes   BehaviorNote[]
  auditLogs       AuditLog[]
}

model Teacher {
  id      String @id @default(cuid())
  nip     String @unique
  fullName String
  email    String @unique
  phone    String?
  subjects ClassSubject[]
  classrooms Classroom[] @relation("HomeroomTeacher")
  attendanceLesson AttendanceLesson[]
  auditLogs AuditLog[]
}

model Classroom {
  id                String @id @default(cuid())
  name              String
  grade             Int
  termId            String
  homeroomTeacherId String? @unique
  homeroomTeacher   Teacher? @relation("HomeroomTeacher", fields: [homeroomTeacherId], references: [id])
  term              Term     @relation(fields: [termId], references: [id])
  enrollments       Enrollment[]
  classSubjects     ClassSubject[]
  attendanceDaily   AttendanceDaily[]
  behaviorNotes     BehaviorNote[]
  auditLogs         AuditLog[]
}

model Enrollment {
  id          String   @id @default(cuid())
  classroomId String
  studentId   String
  joinedAt    DateTime @default(now())
  leftAt      DateTime?
  classroom   Classroom @relation(fields: [classroomId], references: [id])
  student     Student   @relation(fields: [studentId], references: [id])
}

// ... (Subject, ClassSubject, Schedule, AttendanceDaily, AttendanceLesson, GradeConfig, GradeItem, GradeScore, Announcement, BehaviorNote, ReportJob, AuditLog)
```

Constraints kunci:

- Unique NIS/NIP/email.
- Unique `ClassSubject(classroomId, subjectId)`.
- Unique `Schedule` overlap dicegah via constraint + cek aplikasi (trigger optional).
- `AttendanceDaily` unique (`date`, `classroomId`, `studentId`).
- `AttendanceLesson` unique (`scheduleId`, `date`, `studentId`).
- `GradeScore` unique (`gradeItemId`, `studentId`).
- `AuditLog` terhubung ke banyak entitas via `entity` & `entityId`.

## 3. Modul & Service

### Auth & RBAC

- JWT Access (15m) + Refresh (7d).
- `RolesGuard` memeriksa role vs endpoint metadata.
- `Abilities` per resource (casl-like) memanfaatkan matrix (serupa di frontend).
- Password policy: min 12 char, hashed bcrypt.
- Login rate limit (redis sliding window).

### Academic (Tahun Ajar/Term)

- CRUD `AcademicYear`, `Term`.
- Status: `draft | active | archived`.
- Transisi valid: draft→active (butuh set tanggal), active→archived.
- Audit log tiap perubahan.

### Import Service

- Endpoint upload CSV (multipart).
- Simpan file ke storage sementara (MinIO) + metadata (hash).
- Create job `ImportStudentsJob` / `ImportTeachersJob`.
- Worker parse streaming (fast-csv) → validasi kolom → staging table (temp) → upsert Student/Teacher.
- Simpan report (total, sukses, gagal per baris).
- Endpoint GET status.
- Idempotensi: hash file + term/ay; duplikat → refer report lama.

### Roster & Wali Kelas

- CRUD `Classroom`, assign homeroom (cek 1:1).
- Endpoint `PATCH /classrooms/:id/homeroom` validasi teacher tidak memegang kelas lain jika kebijakan.
- Manage `ClassSubject`: assign subject+teacher.
- Enrollment API (assign student ke kelas).

### Schedule

- Manual CRUD schedule.
- Conflict detection service: query by teacher, classroom, room pada day/time.
- Generator (opsional): input preferensi, avail guru/ruang → heuristics (Greedy + backtracking) → simpan conflicts.

### Attendance

- `POST /attendance/daily`: per kelas, role guard Wali Kelas; S/I must include note.
- `POST /attendance/lesson`: guard Guru Mapel; schedule validation.
- Query endpoints: list per student, per kelas, aggregated.
- Worker `AttendanceMonitorJob`: harian jam 18:00 WIB, cek `A` count 7 hari rolling per student + config `absentThreshold` (per kelas/sekolah). Trigger notifikasi.

### Grades

- `GradeConfig`: scheme `WEIGHTED | AVERAGE`, weights JSON, `kkm`.
- `GradeItem`: type `HARIAN | ULANGAN | TUGAS`, optional rubric (JSON schema).
- `GradeScore`: input 0–100 (# configurable).
- Calculation service:
  - Weighted: Σ(score_i \* weight_i).
  - Average: mean.
- Finalization workflow:
  - Guru POST `/grades/finalize` (set status `FINALIZED` per classSubject per term).
  - After finalization, scores locked (transaction check).
  - Wali Kelas POST `/grades/verify` (status `VERIFIED`).
  - Dashboard/rapor uses verified data.

### Communication

- Announcements: CRUD (role Admin TU/Kepsek).
- Behavior notes: Wali Kelas/Guru.
- Visibility: query filter by audience/role.
- `publishAt` scheduling support (worker to toggle status).

### Reports & Dashboard

- `ReportJob`: queue `report-batch`.
- Worker fetch students per class → compile context (nilai, absensi, catatan) → render template HTML (Handlebars) → Puppeteer to PDF.
- Output zipped per kelas/term, store di S3; update `completedAt`, `fileUrl`.
- Idempotensi: job key `termId+type`.
- Dashboard data: service aggregator (SQL window functions / materialized view).
- Metrics: nilai distribution, outliers (z-score), remedial list (<KKM), attendance summary.
- Endpoint `GET /dashboard/academics` (role Kepsek).

### Mutation & Archive

- Mutasi student: update `Enrollment`, `Student.status`, log audit.
- Transfer kelas: close old enrollment (`leftAt`), open new.
- Archive service: `POST /archives/export` produce CSV/PDF, store S3.
- Endpoint download (guarded, signed URL).
- Backup script (cron) optional.

### Notifications Service

- `NotificationService` (email/WA).
- Template: credentials onboarding, absentee alert, rapor ready.
- Use adapter pattern: `EmailProvider` (SMTP), `WhatsAppProvider` (stub).
- All sends logged ke `NotificationLog`.

### Audit Log

- Global interceptor captures `actorId`, `action`, `entity`, `entityId`, `before`, `after`.
- Sensitive fields masked.
- Exposed endpoint `GET /audit` (Superadmin).

## 4. API Surface (Ringkasan)

> **Dokumen historis:** daftar di bawah adalah rancangan arsitektur lama, bukan
> kontrak gateway saat ini. Import yang berjalan sekarang menggunakan
> `POST /students/import` dan `POST /teachers/import` secara sinkron; tidak ada
> `GET /imports/:id` job-polling endpoint. Lihat
> [`sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md`](../../sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md)
> untuk kontrak kanonik.

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- `POST /academic-years`, `PATCH /academic-years/:id/status`, `GET /academic-years`.
- `POST /terms`, `PATCH /terms/:id/status`, `GET /terms`.
- `POST /students/import`, `POST /teachers/import` (sinkron, dengan ringkasan validasi baris).
- `POST /classrooms`, `PATCH /classrooms/:id/homeroom`, `POST /classrooms/:id/enroll`.
- `POST /subjects`, `POST /class-subjects`.
- `POST /schedules`, `GET /schedules/conflicts`, `POST /schedule/generate`.
- `POST /users` (role assignment), `POST /users/:id/send-credentials`.
- `POST /attendance/daily`, `POST /attendance/lesson`, `GET /attendance/daily`.
- `POST /grades/config`, `POST /grades/items`, `POST /grades/scores`, `POST /grades/finalize`, `POST /grades/verify`.
- `POST /announcements`, `GET /announcements`.
- `POST /behavior-notes`.
- `POST /reports/batch`, `GET /reports/:jobId`.
- `GET /dashboard/academics`.
- `POST /students/:id/mutate`, `POST /classrooms/:id/transfer`.
- `POST /archives/export`, `GET /archives/:id`.
- `GET /audit`.

Semua endpoint terdokumentasi di Swagger dengan contoh request/response.

## 5. Worker Jobs

| Queue           | Job                                      | Jadwal/Trigger                          |
| --------------- | ---------------------------------------- | --------------------------------------- |
| `imports`       | `ImportStudentsJob`, `ImportTeachersJob` | Manual (upload CSV)                     |
| `notifications` | `SendCredentialJob`                      | Saat akun dibuat                        |
| `notifications` | `AbsenceAlertJob`                        | Cron harian 18:00 WIB                   |
| `reports`       | `GenerateReportJob`                      | Manual (Admin TU) / cron akhir semester |
| `announcements` | `AnnouncementPublishJob`                 | Cron minutely (cek publishAt)           |

Worker app memuat modular consumer per queue. Concurrency diatur per job (rapor concurrency 3 agar tidak berat).

## 6. Testing Strategy

- **Unit Tests**:
  - Import parsing & validator.
  - Schedule overlap detection util.
  - Grade calculator (weighted/average).
  - Notification threshold logic.
  - Finalization state machine.
- **Integration Tests**:
  - Auth + RBAC guard.
  - CSV import end-to-end (upload → job → DB).
  - Attendance + threshold notifications.
  - Report job (mock Puppeteer).
  - Dashboard metrics (seed dataset).
- **Coverage Target**: ≥70% modul kritikal (import, schedule, grades, notifications, reports).
- **Test Utilities**: `@nestjs/testing`, Prisma test client, Redis mock (ioredis-mock).
- **CI**: lint (ESLint), format (Prettier), tests, build (nest build).

## 7. Deployment & Ops

- `docker-compose` untuk dev: api, web, worker, postgres, redis, mailhog, minio.
- Prod: container di Kubernetes / VM; environment variables dikelola via dotenv + secret manager.
- Health endpoint `/health` (checks DB, Redis, S3).
- Graceful shutdown (BullMQ, Prisma).
- Backup script (pg_dump + MinIO sync).
- Observability: log shipping ke ELK/Loki; error reporting Sentry optional.

## 8. Security Considerations

- Store password hashed (bcrypt 12+).
- Force password reset on first login (temporary cred).
- HTTPS enforcement (behind reverse proxy).
- Rate limiting & IP throttling untuk login.
- Input validation di controller + schema.
- CSRF mitigasi (API stateless JWT).
- Data privacy: catatan perilaku diakses role tertentu saja.
- Audit log untuk semua mutasi sensitif.

## 9. Roadmap Teknis (Backend)

1. Setup NestJS project + modules dasar, auth, RBAC, audit log.
2. Implement schema & migrations (Prisma), seeding.
3. Implement CRUD master (AcademicYear, Term, Subjects, Classroom, ClassSubject).
4. Build import infrastructure + worker.
5. Attendance module + notification threshold.
6. Grades module + finalization.
7. Reports (PDF) + storage + worker.
8. Dashboard metrics.
9. Mutasi & arsip endpoints.
10. Tests, coverage, documentation, Swagger polishing.

Dokumen ini menjadi acuan implementasi backend. Frontend dan worker detail dijabarkan terpisah.
