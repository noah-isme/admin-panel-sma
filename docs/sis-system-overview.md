> ⚠️ **Historical document — superseded by the Go backend migration.**
>
> This blueprint was written **before** the backend was migrated from **NestJS → Go**. It still references NestJS, Prisma, BullMQ-in-API, and an `apps/api` workspace that have since been **removed**. The backend now lives in the separate repository **`sma-adp-api`** (Go/Gin).
>
> For the current, authoritative documentation use:
>
> - `../sma-adp-api/docs/PROJECT_STATUS.md` — per-phase progress & active blockers
> - `../sma-adp-api/docs/FE_BE_MAPPING.md` — frontend ↔ backend endpoint map
> - `../sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md` — API specification
> - `../sma-adp-api/docs/operations.md` & `decommission.md` — cutover/rollback runbooks
> - Root `README.md` — current setup & architecture
>
> Keep this file only as historical design context. Do **not** follow its NestJS-specific instructions.

---

# Admin Panel Sekolah – Gambaran Umum

## 1. Konteks & Batasan Sistem

- **Tujuan**: Mendukung siklus akademik SMA meliputi pra-semester, operasional harian, penilaian tengah/akhir, serta mutasi & arsip dengan tiga kanal utama: API (NestJS), UI (React), dan worker (BullMQ).
- **Lingkup**:
  - _Frontend_: Panel Admin TU, Guru Mapel, Wali Kelas, Dashboard Kepala Sekolah.
  - _Backend API_: CRUD master data, import CSV, absensi, nilai, jadwal, pengumuman, mutasi, arsip, audit log.
  - _Worker_: Batch rapor PDF, notifikasi absen, pengiriman kredensial, schedule generator opsional.
  - _Storage_: PostgreSQL (data transaksional), object storage (rapor/arsip), Redis (queue, cache).
- **Batasan/Non Tujuan**: Tidak mencakup SSO eksternal, pembayaran, konten e-learning.
- **Asumsi Teknis**: Node.js 20+, NestJS + Prisma, PostgreSQL 15+, Redis, React + Vite + Tailwind, Puppeteer untuk PDF, adapter email/WA dummy.

## 2. Persona & Peran

| Persona                    | Tujuan Utama                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| **Superadmin**             | Setup awal sistem, pengaturan global, audit, provisioning user.       |
| **Admin TU**               | Mengelola tahun ajaran, term, import data, penjadwalan, pengumuman.   |
| **Wali Kelas**             | Absensi harian, verifikasi nilai, catatan perilaku, monitoring absen. |
| **Guru Mapel**             | Absensi per jam, input nilai, finalisasi nilai.                       |
| **Kepala Sekolah**         | Memantau dashboard nilai, outlier, remedial, pengumuman final.        |
| **Siswa/Ortu (read-only)** | Akses jadwal, nilai, kehadiran, pengumuman (portal opsional).         |

## 3. Alur Data Utama

1. **Pra-semester**

   - Admin TU membuat `AcademicYear` + `Term` → status `draft` → `active`.
   - Import siswa/guru via CSV → validasi unik NIS/NIP → data masuk DB + audit log.
   - Bentuk kelas (`Classroom`) dan mapel (`ClassSubject`).
   - Jadwal dibuat manual / generator → konflik disimpan & ditampilkan.
   - User akun dibuat → worker kirim kredensial (email/WA) → catat log.

2. **Operasional Harian**

   - Wali Kelas input `AttendanceDaily`; Guru Mapel input `AttendanceLesson`.
   - Worker memeriksa absen A>X/minggu → kirim notifikasi ortu.
   - Guru Mapel membuat `GradeItem` + `GradeScore`, backend hitung nilai akhir per `GradeConfig`.
   - Pengumuman & catatan perilaku tersimpan dan tampil sesuai peran.

3. **Penilaian Tengah/Akhir**

   - Admin TU set `GradeConfig` (KKM, scheme).
   - Guru finalisasi (lock) → Wali verifikasi (status naik).
   - Worker render rapor (Puppeteer) → simpan ke storage → update `ReportJob`.
   - Dashboard Kepsek menarik agregasi (materialized view / query builder).

4. **Mutasi & Arsip**
   - Mutasi siswa → update status, relasi kelas, audit before/after.
   - Arsip rapor & absensi (PDF+CSV) versi timestamp disimpan ke storage, endpoint download.
   - Backup berkala & restore diuji.

## 4. Integrasi & Observability

- **Auth**: JWT + RBAC guard per endpoint and refresh-token rotation. Login
  throttling and lockout are deployment gateway/WAF controls; the current Go
  application does not enforce them itself.
- **Audit Log**: Interceptor menyimpan `actorId`, `entity`, perubahan (before/after), timestamp.
- **Logging**: JSON format, correlation ID per request (middleware).
- **Tracing**: Minimal request ID; optional OpenTelemetry.
- **Health Checks**: `/health` per aplikasi (API, worker) memeriksa DB, Redis, storage.
- **Notifications**: Email via SMTP dev/test server (Mailhog), WA dummy (webhook log).
- **Storage**: S3-compatible (MinIO lokal) untuk rapor/arsip.

## 5. Ketergantungan & Risiko

- **Ketergantungan utama**: PostgreSQL, Redis, SMTP/WA provider, storage S3.
- **Risiko**:
  - File import besar → gunakan streaming + job queue.
  - Batch rapor → butuh scale worker & idempotensi.
  - Jadwal generator konflik → definisi data ruangan & ketersediaan akurat.
  - Coverage tests minimal 70% modul kritikal (import, jadwal, nilai, notifikasi, rapor).

## 6. Deliverables

- Schema DB & migrasi (Prisma).
- API NestJS dengan Swagger, Postman collection.
- Worker BullMQ untuk rapor, notifikasi, kredensial.
- UI React (Admin TU, Wali Kelas, Guru Mapel, Dashboard Kepsek).
- CSV template contoh.
- Test suite (unit+integration).
- Dokumentasi dev (README) & SOP pengguna (PDF).
- Infrastruktur dev (docker-compose: api, web, worker, postgres, redis, mailhog, minio).

Dokumen ini menjadi dasar rancangan detail (API, DB, worker, UI) yang akan disusun pada langkah berikutnya.
