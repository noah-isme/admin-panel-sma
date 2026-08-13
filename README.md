# admin-panel-sma

Platform pengelolaan absensi dan nilai siswa berbasis **Go (sma-adp-api) + React Admin**. Monorepo ini memuat frontend admin berbasis Vite, shared package untuk schemas/types, dan worker BullMQ untuk background jobs. Backend API telah dimigrasikan ke Go (sma-adp-api repository).

## Cuplikan Dashboard Terbaru

![Dashboard Akademik terbaru](docs/dashboard-preview.svg)

## Struktur Monorepo

```
admin-panel-sma/
├── apps/
│   ├── admin/        # React Admin frontend (Vite)
│   ├── landing/      # Public landing page (React + Vite + Tailwind)
│   ├── shared/       # Shared schemas, types, dan constants (ESM)
│   └── worker/       # BullMQ worker untuk background jobs
├── docs/             # Dokumentasi deployment dan fixes
├── vercel.json       # Konfigurasi deployment Vercel
└── pnpm-workspace.yaml
```

Backend API (Go): `../sma-adp-api` (repository terpisah)

Package `@apps/shared` berisi:

- Zod schemas untuk validasi (auth, users, students, dll)
- TypeScript types dan interfaces
- Database schema definitions (Drizzle ORM)
- Shared constants (roles, queue names, dll)

Package ini di-build sebagai ES Modules (ESM) agar kompatibel dengan Vite dan bundler modern.

## Daftar isi

1. [Prasyarat](#prasyarat)
2. [Langkah setup](#langkah-setup)
3. [Konfigurasi environment](#konfigurasi-environment)
4. [Menjalankan secara lokal](#menjalankan-secara-lokal)
5. [Alur deploy](#alur-deploy)
6. [Contoh curl endpoint utama](#contoh-curl-endpoint-utama)

## Prasyarat

- Node.js 20+ dan [pnpm](https://pnpm.io/) 9+
- Docker Desktop (opsional tetapi direkomendasikan untuk Postgres & Redis)
- Akun layanan eksternal untuk produksi: Supabase atau Neon (Postgres), Upstash (Redis), Vercel, Railway
- Go 1.21+ (untuk backend API di sma-adp-api)

## Langkah setup

1. **Clone repo & install dependency**

   ```bash
   git clone https://github.com/Noorwahid717/admin-panel-sma.git
   cd admin-panel-sma
   pnpm install
   ```

2. **Siapkan environment file**

   - Salin `.env.example` menjadi `.env` di root.
   - (Opsional) Tambahkan override spesifik service di `apps/admin/.env` jika perlu.

3. **Setup Go API (sma-adp-api)** - repository terpisah

   ```bash
   cd ../sma-adp-api
   # Start database
   make docker-up
   # Run migrations
   migrate -path migrations -database "postgresql://postgres:postgres@localhost:5432/admin_panel_sma?sslmode=disable" up
   # Seed data
   psql "postgresql://postgres:postgres@localhost:5432/admin_panel_sma?sslmode=disable" -f scripts/seed.sql
   # Start Go API server
   make dev
   ```

4. **Mulai pengembangan frontend** `pnpm dev`.

## MSW (Mock Service Worker) — Development & Tests

Untuk mempercepat pengembangan frontend tanpa tergantung backend, repo ini mengintegrasikan MSW (Mock Service Worker) di aplikasi `@apps/admin`.

- Service worker sudah di-generate dan disimpan di: `apps/admin/public/mockServiceWorker.js` (committed). Aplikasi admin mendaftarkan worker tersebut otomatis hanya saat development — tidak perlu mengubah kode untuk memulai mocks.
- Jika Anda ingin meregenerasi worker lokal (misalnya setelah upgrade msw): jalankan dari root repo:

```bash
# gunakan bin msw dari workspace admin
pnpm --filter @apps/admin exec msw init ./apps/admin/public --save
```

- Catatan: jika Anda menggunakan `npx msw init`, jalankan dari root repo agar file ditempatkan di `apps/admin/public`.

- Mock handlers berada di `apps/admin/src/mocks/handlers.ts` dan worker bootstrap ada di `apps/admin/src/mocks/browser.ts`.

- Untuk testing unit/integration, Vitest sudah dikonfigurasi untuk memuat setup file yang men-start MSW server (node):

  - Setup file: `apps/admin/test/setupTests.ts` (menggunakan `msw/node` dengan lifecycle hooks `beforeAll/afterEach/afterAll`).
  - Jalankan tests untuk paket admin:

  ```bash
  pnpm --filter @apps/admin test
  # atau dengan vitest langsung
  pnpm --filter @apps/admin exec vitest --run
  ```

- Jika tim ingin menghindari commit file worker biner, Anda dapat menghapus `apps/admin/public/mockServiceWorker.js` dari repo dan minta tiap developer menjalankan perintah `msw init` lokal saat cloning. Keduanya valid; repo saat ini menyertakan worker agar developer tidak perlu langkah tambahan.

## Konfigurasi environment

### Root `.env` (untuk frontend & worker)

| Variabel               | Deskripsi                                           | Contoh                                                        |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `NODE_ENV`             | Mode runtime (`development` / `production`)         | `development`                                                 |
| `TZ`                   | Zona waktu default                                  | `Asia/Jakarta`                                                |
| `DATABASE_URL`         | URL Postgres (Drizzle + worker)                     | `postgres://postgres:postgres@localhost:5432/admin_panel_sma` |
| `REDIS_URL`            | URL Redis (BullMQ)                                  | `redis://localhost:6379`                                      |
| `STORAGE_DRIVER`       | `supabase` atau `r2`                                | `supabase`                                                    |
| `SUPABASE_URL`         | URL project Supabase                                | `https://xyzcompany.supabase.co`                              |
| `SUPABASE_ANON_KEY`    | Public anon key                                     | `sb-anon-...`                                                 |
| `SUPABASE_SERVICE_KEY` | Service role key untuk worker                       | `sb-service-...`                                              |
| `SUPABASE_BUCKET`      | Bucket penyimpanan                                  | `public-assets`                                               |
| `R2_*`                 | Kredensial Cloudflare R2 (jika `STORAGE_DRIVER=r2`) | `...`                                                         |
| `APP_BASE_URL`         | Origin aplikasi admin                               | `http://localhost:5173`                                       |
| `EMAIL_FROM`           | Email pengirim default                              | `no-reply@example.local`                                      |

> Worker membaca environment dari root `.env` melalui `tsx --env-file`, jadi pastikan kredensial DB & Redis tersedia.

### `apps/admin/.env`

| Variabel       | Deskripsi                                                          | Contoh                         |
| -------------- | ------------------------------------------------------------------ | ------------------------------ |
| `VITE_API_URL` | Base URL Go API (termasuk prefix `/api/v1`)                        | `http://localhost:8081/api/v1` |
| `VITE_USE_MSW` | Aktifkan Mock Service Worker (`true`/`false`) untuk dashboard baru | `true`                         |

#### Feature flags admin/API

Resource dan route opsional di admin harus mengikuti feature flag API yang sama. Nilai default semua flag adalah `false`; aktifkan pasangan berikut bersama-sama agar halaman tidak memanggil endpoint yang tidak terdaftar:

| Go API (`sma-adp-api/.env`)                    | Admin (`apps/admin/.env`)                                | Cakupan                                                      |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| `ENABLE_ALL_FEATURES`                          | `VITE_ENABLE_ALL_FEATURES`                               | **All-on mode**: enables all feature-flagged modules at once |
| `ENABLE_DASHBOARD` + `ENABLE_ANALYTICS`        | `VITE_ENABLE_DASHBOARD` + `VITE_ENABLE_ANALYTICS`        | Dashboard (requires analytics backend)                       |
| `ENABLE_ANALYTICS`                             | `VITE_ENABLE_ANALYTICS`                                  | Analytics API (`/analytics/*`)                               |
| `ENABLE_SCHEDULER`                             | `VITE_ENABLE_SCHEDULER`                                  | Generator jadwal dan preferensi guru                         |
| `ENABLE_REPORTS`                               | `VITE_ENABLE_REPORTS`                                    | Pembuatan dan unduhan laporan                                |
| `ENABLE_MUTATIONS`                             | `VITE_ENABLE_MUTATIONS`                                  | Alur mutasi siswa                                            |
| `ENABLE_ARCHIVES`                              | `VITE_ENABLE_ARCHIVES`                                   | Arsip dan unduhan berkas                                     |
| `ENABLE_HOMEROOMS`                             | `VITE_ENABLE_HOMEROOMS`                                  | Data wali kelas                                              |
| `ENABLE_CONFIGURATION_API`                     | `VITE_ENABLE_CONFIGURATION_API`                          | Konfigurasi aplikasi                                         |
| `ENABLE_CALENDAR_ALIAS`                        | `VITE_ENABLE_CALENDAR_ALIAS`                             | Alias `/calendar`                                            |
| `ENABLE_ATTENDANCE_ALIAS`                      | `VITE_ENABLE_ATTENDANCE_ALIAS`                           | Rute attendance daily, lesson, generic writes, summary       |
| `ENABLE_ATTENDANCE_ALIAS` + `ENABLE_ANALYTICS` | `VITE_ENABLE_ATTENDANCE_ALIAS` + `VITE_ENABLE_ANALYTICS` | Attendance analytics page                                    |

`ENABLE_ANALYTICS` kini memiliki flag Vite terpisah: `VITE_ENABLE_ANALYTICS`. Dashboard memerlukan keduanya (`ENABLE_DASHBOARD` + `ENABLE_ANALYTICS` / `VITE_ENABLE_DASHBOARD` + `VITE_ENABLE_ANALYTICS`). Layar analytics kehadiran memerlukan `ENABLE_ATTENDANCE_ALIAS` + `ENABLE_ANALYTICS` / `VITE_ENABLE_ATTENDANCE_ALIAS` + `VITE_ENABLE_ANALYTICS`.

Flag API dan Vite dibaca saat proses masing-masing dijalankan. Setelah mengubahnya, restart Go API dan dev server/build admin. Resource inti seperti `/schedules` tetap tersedia terlepas dari flag opsional.

**All-On Mode:** Set `ENABLE_ALL_FEATURES=true` (backend) and `VITE_ENABLE_ALL_FEATURES=true` (frontend) to enable all feature-flagged modules at once. In an offline/MSW build, an explicit individual `VITE_ENABLE_<MODULE>` value takes precedence (both `true` and `false`); an unset individual flag falls back to `VITE_ENABLE_ALL_FEATURES`. When reachable, unauthenticated `GET /features` is authoritative and replaces the build-time fallback.

Detail envelope response, alias backward-compatible (`/exam-events`, `/attendance`, `/teacher-preferences`, dan `PUT /enrollments/:id`), serta kontrak role/user relation ada di [`sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md`](../sma-adp-api/docs/GO_BACKEND_API_SPECIFICATION.md).

Compatibility routes and their frontend readiness are tracked in [`sma-adp-api/docs/COMPATIBILITY_CONTRACT_MATRIX.md`](../sma-adp-api/docs/COMPATIBILITY_CONTRACT_MATRIX.md); core-resource CRUD coverage remains in the canonical specification and generated Swagger.

Nilai mendukung update melalui `PUT/PATCH /grades/:id` dan soft-delete melalui `DELETE /grades/:id`. Nilai yang di-soft-delete tidak muncul pada daftar dan dapat dipulihkan dengan memasukkan nilai untuk enrollment, subject, dan component yang sama.

### Go API Environment (sma-adp-api)

Go API menggunakan file `.env` di repository `sma-adp-api` dengan variabel seperti:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`, `JWT_EXPIRATION`, `REFRESH_TOKEN_EXPIRATION`
- `ALLOWED_ORIGINS` (CORS)
- Feature flags: `ENABLE_ALL_FEATURES`, `ENABLE_ANALYTICS`, `ENABLE_DASHBOARD`, `ENABLE_SCHEDULER`, `ENABLE_REPORTS`, `ENABLE_MUTATIONS`, `ENABLE_ARCHIVES`, `ENABLE_HOMEROOMS`, `ENABLE_CALENDAR_ALIAS`, `ENABLE_ATTENDANCE_ALIAS`, `ENABLE_CONFIGURATION_API`

Lihat `sma-adp-api/.env.example` untuk daftar lengkap.

### Catatan keamanan

- **Rotasi refresh token** – setiap permintaan refresh menerbitkan token dengan JTI baru dan otomatis menandai token lama sebagai revoked lengkap dengan catatan IP serta User-Agent.
- **Logout** – endpoint `/auth/logout` mencabut refresh token yang dikirim di body dan mengharuskan access token milik pengguna yang sama.
- **Hashing password** – service saat ini menggunakan bcrypt dengan kebijakan minimum enam karakter pada payload perubahan/reset password.
- **Rate limiting dan lockout** – belum diimplementasikan oleh Go API. Deployment production wajib menempatkan login, refresh, reset password, dan endpoint sensitif di gateway/WAF yang memiliki throttling dan lockout yang terukur.
- **Argon2** – belum digunakan dan tidak memiliki konfigurasi runtime. Dokumentasi tidak boleh menyebut `ARGON2_*` sebagai kontrol aktif sampai migrasi benar-benar diimplementasikan.

## Menjalankan secara lokal

### Mode pnpm dev (frontend + worker)

Perintah berikut menyalakan worker BullMQ dan aplikasi admin Vite secara paralel:

```bash
pnpm dev
```

Endpoint default:

- Go API: http://localhost:8081/api/v1
- Admin: http://localhost:5173

### Docker Compose untuk dependency (Postgres + Redis)

File `docker-compose.dev.yml` menyiapkan Postgres dan Redis siap pakai. Jalankan:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Atau gunakan Makefile di `sma-adp-api` yang sudah mengelola database untuk Go API:

```bash
cd ../sma-adp-api && make docker-up
```

Gunakan `docker compose -f docker-compose.dev.yml down` untuk mematikannya. Data tersimpan di volume `postgres-data` dan `redis-data`.

### Docker development helpers (quick)

Saya menambahkan beberapa helper untuk memudahkan development lokal:

- `docker-compose.seed.yml` — menjalankan seeder di dalam container tanpa perlu menginstall pnpm secara lokal.
- `docker-compose.dev.override.yml` — mengandung service untuk menjalankan Admin (Vite) yang terhubung ke Postgres+Redis dari `docker-compose.dev.yml`.

Contoh perintah cepat:

```bash
# Start Postgres + Redis
pnpm compose:up

# Run the repository seed (runs once and exits)
pnpm compose:seed

# Start API dev + Admin dev (builds API Dockerfile if present)
pnpm compose:dev

# Stop the compose stack
pnpm compose:down
```

Catatan: scripts `compose:*` tersedia di `package.json` pada root.

## Alur deploy

### Frontend gabungan (Vercel)

Konfigurasi produksi menggunakan `admin-panel-sma/vercel.json` dari root proyek
Vercel. Satu deployment menerbitkan landing page pada `/` dan admin pada `/admin`.

1. Hubungkan repository ke Vercel dan set **Root Directory** ke `admin-panel-sma`.
2. Gunakan **Framework Preset** `Other`, **Production Branch** `main`, dan
   **Node.js Version** `20.x`.
3. Jangan mengganti perintah dari `vercel.json`:
   - **Install Command**: `pnpm install --frozen-lockfile`
   - Build menjalankan `@apps/shared`, `@apps/landing`, dan `@apps/admin`, lalu
     menggabungkan hasilnya menjadi `deploy/` (`/` dan `/admin/`).
   - Output directory: `deploy`.
4. Atur Environment Variables di **Project Settings** (jangan commit URL API):

   | Environment | `VITE_API_URL`                      | `VITE_BASE_PATH` | `VITE_USE_MSW` | `VITE_ENABLE_MSW` | `VITE_VERCEL_ENV` |
   | ----------- | ----------------------------------- | ---------------- | -------------- | ----------------- | ----------------- |
   | Production  | `https://api.example.sch.id/api/v1` | `/admin/`        | `false`        | `false`           | `production`      |
   | Preview     | `/api`                              | `/admin/`        | `true`         | `true`            | `preview`         |

   Preview wajib menggunakan `/api` dan MSW, sehingga tidak pernah membawa URL
   API produksi ke bundle preview. `apps/admin/vite.config.ts` juga memaksa
   nilai aman berdasarkan `VERCEL_ENV` sebagai guardrail build-time.

5. Setelah deploy, verifikasi `/`, `/admin/`, `/admin/login`, dan satu route
   admin langsung (misalnya `/admin/students`) setelah refresh.

Panduan lengkap, termasuk perintah audit environment variable dan rollback
Vercel, tersedia di [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md).

### Go API & Worker (Railway/Production)

Backend API sekarang menggunakan Go (sma-adp-api repository terpisah). Deploy mengikuti dokumentasi sma-adp-api.

1. Deploy Go API dari repository `sma-adp-api` ke platform pilihan (Railway, Render, Fly.io, VPS, dll)
   - Build: `go build -o api-gateway ./cmd/api-gateway`
   - Start: `./api-gateway`
   - Tambahkan semua variabel environment dari `sma-adp-api/.env.example`
2. Worker BullMQ tetap berada di monorepo ini (`apps/worker`):
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @apps/worker build:railway`
   - Start command: `pnpm --filter @apps/worker start:prod`
   - Gunakan variabel environment yang sama (DB, Redis, storage)
   - **Penting**: Script `build:railway` otomatis build shared package terlebih dahulu
3. Hubungkan Database (Postgres/Neon/Supabase) dan Redis (Upstash) menggunakan `DATABASE_URL` & `REDIS_URL`.

### Database (Supabase atau Neon)

- **Supabase**: buat project, aktifkan storage bucket & dapatkan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`. String koneksi Postgres tersedia di pengaturan database.
- **Neon**: buat branch produksi, ambil connection string Postgres, pastikan opsi `sslmode=require` untuk penggunaan produksi.
- Jalankan migrasi via Go migrate tool di repository `sma-adp-api`.

### Redis (Upstash)

1. Buat database baru (mode REST atau TLS) di Upstash.
2. Catat URL `rediss://` beserta token.
3. Set `REDIS_URL` pada Go API dan worker.

## Troubleshooting

### Error: "No Output Directory named 'deploy' found" di Vercel

**Masalah**: Vercel tidak menemukan output directory setelah build selesai.

**Solusi**:

1. Pastikan **Root Directory** di-set ke `admin-panel-sma` di Project Settings → General.
2. Output Directory harus `deploy` dan install command harus menggunakan `--frozen-lockfile`.
3. Pastikan build menghasilkan `deploy/index.html`, `deploy/admin/index.html`, dan
   `deploy/mockServiceWorker.js`.
4. Vercel hanya membaca konfigurasi gabungan dari `admin-panel-sma/vercel.json`.

### Build Error: "is not exported by" saat deploy ke Vercel

**Masalah**: Rollup/Vite tidak dapat menemukan export dari `@shared/schemas` atau package shared lainnya.

**Solusi**:

1. Pastikan `@apps/shared` terdaftar sebagai dependency di `apps/admin/package.json`:
   ```json
   "dependencies": {
     "@apps/shared": "workspace:*"
   }
   ```
2. Shared package harus di-build terlebih dahulu menjadi ESM sebelum build admin
3. Vercel akan otomatis menjalankan build sequence yang benar via `vercel.json`

### Halaman Admin Kosong atau Cannot Connect to API

**Masalah**: Aplikasi admin berhasil deploy tapi halaman kosong atau tidak bisa koneksi ke API.

**Diagnosis**:

1. **Test Go API Health Check**:

   ```bash
   # Endpoint yang benar
   curl https://your-go-api.example.com/api/v1/health

   # Should return: {"status":"ok"}
   ```

2. **Cek Console Browser** (F12 → Console):

   - ❌ **CORS Error**: Go API belum include domain Vercel di `ALLOWED_ORIGINS`
   - ❌ **404 Not Found**: `VITE_API_URL` salah atau Go API belum deploy
   - ❌ **Network Error**: Go API down atau URL tidak valid

3. **Verifikasi Environment Variables**:

   **Di Vercel** (Admin):

   ```bash
   VITE_API_URL=https://your-go-api.example.com/api/v1
   ```

   ⚠️ Tanpa trailing slash! Setelah set, **REDEPLOY** aplikasi.

   **Di Go API** (sma-adp-api):

   ```bash
   ALLOWED_ORIGINS=https://your-admin.vercel.app
   ```

   Setelah set, **RESTART** Go API service.

4. **Test Login API**:

   ```bash
   curl -X POST https://your-go-api.example.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@sma.test","password":"admin123"}'
   ```

   Jika berhasil, Anda akan dapat `access_token`. Jika gagal:

   - **401**: Password salah atau user tidak ada (perlu seed database)
   - **404**: Endpoint tidak ditemukan (Go API belum deploy dengan benar)
   - **500**: Database error (check logs)

5. **Cek Database Seed**:

   ```bash
   # Via SQL query di database
   SELECT email, role FROM users WHERE role = 'SUPERADMIN';
   ```

**Solusi**:

- Pastikan Go API deployed dan accessible
- Set environment variables dengan benar
- Redeploy Vercel setelah set `VITE_API_URL`
- Restart Go API setelah set `ALLOWED_ORIGINS`
- Seed database jika belum ada user

### Development vs Production Build

- **Development**: Vite menggunakan source files langsung dari `apps/shared/src` untuk HMR (Hot Module Replacement) yang cepat
- **Production**: Vite menggunakan compiled files dari `apps/shared/dist` untuk module resolution yang proper

Konfigurasi ini diatur di `apps/admin/vite.config.ts` dengan conditional alias berdasarkan mode.

### Shared Package Changes

Jika Anda melakukan perubahan pada `apps/shared`, rebuild package tersebut:

```bash
pnpm --filter @apps/shared build
```

Atau gunakan watch mode saat development:

```bash
pnpm --filter @apps/shared dev
```

### Worker Error: "Cannot find module '@apps/shared/...' "

**Masalah**: TypeScript compilation gagal karena tidak menemukan module `@apps/shared`.

**Solusi**:

1. **Railway/Production**: Gunakan script `build:railway` yang otomatis build shared terlebih dahulu:

   ```bash
   pnpm install --frozen-lockfile && pnpm --filter @apps/worker build:railway
   ```

2. **Local Development**: Build shared terlebih dahulu atau gunakan script build biasa:

   ```bash
   pnpm --filter @apps/shared build
   pnpm --filter @apps/worker build
   ```

3. **Root cause**: Worker depends on `@apps/shared` package yang harus di-compile menjadi ESM modules di `apps/shared/dist/` sebelum worker bisa di-compile.

### Worker Error: "exports is not defined in ES module scope"

**Masalah**: Worker runtime gagal dengan error tentang `exports` tidak terdefinisi di ESM scope.

**Solusi**:

1. Pastikan semua packages (shared, worker) menggunakan `"type": "module"` di package.json
2. Semua relative imports harus include `.js` extension (ESM requirement)
3. Import dari shared package menggunakan `@apps/shared/*` bukan `@shared/*`
4. Semua barrel exports (index.ts) harus include `.js` di re-exports

**Catatan**: Monorepo ini sepenuhnya menggunakan ES Modules (ESM) untuk kompatibilitas dengan modern tooling (Vite, Node.js 22+).

### Worker Error: "Named export 'Pool' not found" dari pg module

**Masalah**: Error saat runtime `SyntaxError: Named export 'Pool' not found. The requested module 'pg' is a CommonJS module`.

**Solusi**:

`pg` adalah CommonJS module yang tidak support named exports di ESM. Gunakan default import:

```typescript
// ❌ Salah - tidak akan bekerja di ESM
import { Pool } from "pg";

// ✅ Benar - import default lalu destructure
import pkg from "pg";
const { Pool } = pkg;
```

Untuk types, gunakan `InstanceType<typeof Pool>` alih-alih `Pool` type langsung.

**Catatan**: Package CommonJS lain (seperti `ioredis`, `bullmq`) sudah support ESM named exports dengan baik.

## Contoh curl endpoint utama

Set variabel bantu:

```bash
API_BASE=http://localhost:8081/api/v1
COOKIE_JAR="$(mktemp)"
TOKEN="$(curl -s -c "$COOKIE_JAR" -X POST "$API_BASE/auth/login" \
	-H "Content-Type: application/json" \
	-d '{"email":"superadmin@sma.test","password":"admin123"}' | jq -r '.data.access_token')"
```

> Ganti email/password sesuai data seed Anda. Semua permintaan terproteksi butuh header `Authorization: Bearer $TOKEN`.

### 1. Login

```bash
curl -X POST "$API_BASE/auth/login" \
	-H "Content-Type: application/json" \
	-d '{"email":"superadmin@sma.test","password":"admin123"}'
```

### Auth session lifecycle

The Go API returns the access token inside `data` and sets an HttpOnly
`refresh_token` cookie. The admin provider keeps the access token in memory and
sends browser credentials for refresh/logout; neither endpoint accepts a token
JSON body, and logout is idempotent with a `204 No Content` response.

```bash
curl -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_BASE/auth/refresh"

curl -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_BASE/auth/logout"
```

The refresh cookie is browser-managed and never exposed to frontend JavaScript.

### 2. CRUD siswa (contoh: create)

```bash
curl -X POST "$API_BASE/students" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $TOKEN" \
	-d '{
		"nis": "2025-0001",
		"full_name": "Aisyah Pratama",
		"birth_date": "2010-05-15",
		"gender": "F",
		"address": "Jl. Contoh No. 1",
		"phone": "08123456789"
	}'
```

> **Catatan**: `gender` menggunakan `"M"` (Male) atau `"F"` (Female). Field `address` dan `phone` opsional.

Untuk read/update/delete gunakan metode `GET /students/:id`, `PUT /students/:id`, dan `DELETE /students/:id` dengan header yang sama.

### 3. Attendance routes and compatibility aliases

```bash
curl -X GET "$API_BASE/attendance?termId=term-001&classId=cls-001" \
	-H "Authorization: Bearer $TOKEN"
```

> **Parameter**: `termId` (required), `classId` (required untuk role TEACHER)  
> **Response**: Ringkasan kehadiran per siswa. Endpoint ini dan rute attendance daily/subject serta compatibility writes (`POST /attendance`, `PUT/PATCH /attendance/:id`) memerlukan `ENABLE_ATTENDANCE_ALIAS=true`.

### 4. Query nilai

```bash
curl "$API_BASE/grades?classId=cls-001&termId=term-001" \
	-H "Authorization: Bearer $TOKEN"
```

### 5. Request report rapor (async)

```bash
curl -X POST "$API_BASE/reports/generate" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $TOKEN" \
	-d '{
		"enrollment_id": "enr_456",
		"template": "STANDARD"
	}'
```

Permintaan ini akan menambahkan job ke report queue. Pantau log worker atau endpoint `GET /reports/status/:id` untuk memeriksa statusnya. Worker akan generate PDF rapor berdasarkan data enrollment (siswa, kelas, term, nilai, dan kehadiran).

> **Catatan ekspor:** halaman **Laporan** menggunakan server-side report jobs (`/reports/generate` → `/reports/status/:id` → `/export/:token`). Tombol **Export CSV** pada analytics kehadiran berbeda: browser membuat CSV dari baris yang sudah dimuat dan tidak membuat request report job atau export API.
