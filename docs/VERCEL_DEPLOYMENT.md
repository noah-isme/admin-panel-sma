# Panduan Deployment Frontend ke Vercel

Dokumen ini adalah sumber kebenaran untuk deployment frontend gabungan SMA.
Project Vercel harus menggunakan root repository (`.`) dan `vercel.json` di
directory tersebut. Jangan memilih `apps/admin` sebagai root:
deployment itu hanya menghasilkan admin dan tidak menjalankan landing page.

## Bentuk deployment

Build menghasilkan satu output statis:

```text
deploy/
├── index.html                    # landing page: /
├── assets/                       # asset landing
├── admin/
│   ├── index.html                # admin SPA: /admin/
│   ├── assets/                   # asset admin
│   └── mockServiceWorker.js      # salinan di bawah /admin untuk inspeksi
└── mockServiceWorker.js          # worker root agar dapat mengintersep /api
```

File statis disajikan langsung. `/admin`, `/admin/`, dan semua route admin yang
tidak berupa file (contoh `/admin/login` dan `/admin/students`) diarahkan ke
`admin/index.html`; route lain diarahkan ke landing `index.html`.

## Project Settings

Atur nilai berikut di Vercel **Project Settings → General**:

| Setting           | Nilai                                                         |
| ----------------- | ------------------------------------------------------------- |
| Root Directory    | `.`                                                           |
| Framework Preset  | `Vite`                                                        |
| Production Branch | `main`                                                        |
| Node.js Version   | `20.x`                                                        |
| Build Command     | `pnpm build:vercel`                                           |
| Install Command   | `pnpm install --frozen-lockfile` (sudah ada di `vercel.json`) |
| Output Directory  | `deploy` (sudah ada di `vercel.json`)                         |

`package.json` juga mendeklarasikan `engines.node = 20.x`, sehingga versi
yang dipakai lokal dan Vercel tetap konsisten.

## Environment Variables

Environment variable diatur per environment melalui **Project Settings →
Environment Variables**. Jangan memasukkan URL API produksi ke repository atau
ke environment Preview.

| Variable          | Production                          | Preview   |
| ----------------- | ----------------------------------- | --------- |
| `VITE_API_URL`    | `https://api.example.sch.id/api/v1` | `/api`    |
| `VITE_BASE_PATH`  | `/admin/`                           | `/admin/` |
| `VITE_USE_MSW`    | `false`                             | `true`    |
| `VITE_ENABLE_MSW` | `false`                             | `true`    |
| `VITE_VERCEL_ENV` | `production`                        | `preview` |
| `VITE_STAGING`    | `false`                             | `false`   |

Ganti `https://api.example.sch.id/api/v1` dengan hostname API VPS yang
sebenarnya, tanpa trailing slash. Preview sengaja memakai `/api`; provider
frontend juga mengganti base URL ke origin preview ketika MSW aktif. Selain
konfigurasi dashboard, `apps/admin/vite.config.ts` membaca system variable
`VERCEL_ENV` dan memaksa aturan berikut pada saat build:

- Preview biasa mendapat `VITE_USE_MSW=true`, `VITE_ENABLE_MSW=true`, dan
  `VITE_API_URL=/api`, sehingga tidak dapat mengirim request ke API produksi.
- Untuk membangun staging nyata yang berjalan di atas API VPS, set
  `VITE_STAGING=true` dan `VITE_API_URL` ke URL publik staging (`.../api/v1`)
  pada environment build. Guard build-time kemudian mematikan kedua flag MSW
  walaupun Vercel melaporkan `VERCEL_ENV=preview`.
- Production selalu mendapat flag MSW `false` dan menggunakan `VITE_API_URL`
  Production yang dikonfigurasi di dashboard.

Dengan demikian bundle Preview tidak dapat mengirim request ke API produksi.
Worker MSW disalin ke root output dan didaftarkan sebagai
`/mockServiceWorker.js`, sehingga worker dengan scope `/` dapat menangani
request mock `/api` dari aplikasi yang berjalan di `/admin`.

## Pemeriksaan lokal

Jalankan dari `admin-panel-sma`:

```bash
pnpm install --frozen-lockfile
pnpm build:vercel
```

Untuk memeriksa output gabungan secara manual, jalankan `pnpm build:vercel` atau
gunakan Vercel CLI setelah project terhubung. Pastikan file
berikut ada sebelum deployment diterima:

```text
deploy/index.html
deploy/admin/index.html
deploy/mockServiceWorker.js
```

Contract test frontend memvalidasi root config, frozen install, Node 20,
skrip build gabungan, rewrite deep link, output gabungan, dan keberadaan config
admin-only yang sudah dinonaktifkan.

## Smoke test deployment

Setelah Preview dan Production tersedia, cek melalui browser atau `curl`:

1. `/` menampilkan landing page.
2. `/admin/` menampilkan admin.
3. `/admin/login` tetap menampilkan login setelah refresh langsung.
4. `/admin/students` tetap menampilkan route SPA setelah refresh langsung.
5. Preview menampilkan data MSW dan network request tetap pada origin preview.
6. Production memanggil `https://api.example.sch.id/api/v1` dan tidak
   mendaftarkan service worker MSW.

Production hanya dipromosikan setelah Preview smoke test selesai. Untuk
rollback UI, promosikan deployment Vercel Production sebelumnya; variabel
Production mengikuti environment yang sama.

Referensi: [Vercel environment variables](https://vercel.com/docs/environment-variables),
[Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json),
dan [versi Node.js yang didukung](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
