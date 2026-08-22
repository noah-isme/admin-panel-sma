# Architecture Document (ARCHITECTURE.md)

## SMA Academic & Administrative Management Platform

---

## 1. High-Level System Topology

The platform is architected as a decoupled, high-performance distributed system consisting of a **pnpm monorepo** for frontend applications, shared contracts, and background workers, alongside an independent high-throughput **Go backend API** (`sma-adp-api`).

```mermaid
graph TB
    subgraph "Client Layer"
        BrowserAdmin["Admin Panel SPA<br/>(React 18 + Vite + Refine)<br/><code>/admin</code>"]
        BrowserLanding["Marketing Site<br/>(React + Tailwind)<br/><code>/</code>"]
    end

    subgraph "Edge / CDN (Vercel)"
        VercelEdge["Vercel Edge Network<br/>Merged Monorepo Output (<code>deploy/</code>)"]
    end

    subgraph "Backend API Layer (Railway / VPS)"
        GoGateway["Go API Gateway (Gin)<br/><code>sma-adp-api</code><br/><code>/api/v1</code>"]
    end

    subgraph "Background Worker Layer (Node.js)"
        BullWorker["BullMQ Worker Process<br/><code>@apps/worker</code><br/>(PDF Generation, Notifications)"]
    end

    subgraph "Shared Contracts & Schemas"
        SharedLib["@apps/shared (ESM)<br/>Zod Schemas | Drizzle Schema | Constants"]
    end

    subgraph "Data & Infrastructure Tier"
        Postgres[(PostgreSQL 15+<br/>Neon / Supabase)]
        RedisCache[(Redis<br/>Upstash / Redis Cloud)]
        ObjectStorage[(S3 / Supabase Storage<br/>PDF Rapor & Document Archives)]
    end

    BrowserLanding -->|HTTPS| VercelEdge
    BrowserAdmin -->|HTTPS| VercelEdge
    BrowserAdmin -->|REST API / Bearer + Cookie| GoGateway

    GoGateway -->|SQL Queries| Postgres
    GoGateway -->|Cache / Push Jobs| RedisCache
    GoGateway -->|Generate Pre-signed URLs| ObjectStorage

    BullWorker -->|Pop Jobs| RedisCache
    BullWorker -->|Direct Pool Queries| Postgres
    BullWorker -->|Upload Artifacts| ObjectStorage

    BrowserAdmin -.->|Types & Validation| SharedLib
    BullWorker -.->|Types & Drizzle Models| SharedLib
```

---

## 2. Monorepo Workspace Breakdown

The repository utilizes `pnpm` workspaces (`pnpm-workspace.yaml`) with strict package boundaries:

```
admin-panel-sma/
├── apps/
│   ├── admin/         # Primary single-page application for school staff
│   ├── landing/       # High-speed static marketing & information portal
│   ├── shared/        # Isomorphic schemas, types, Drizzle models, and constants
│   └── worker/        # Node.js BullMQ asynchronous job processor
├── docs/              # Architectural guides, ADRs, runbooks, and API specs
├── deploy/            # Combined build artifact directory for Vercel deployment
├── pnpm-workspace.yaml
├── vercel.json
└── package.json
```

### 2.1 Workspace Responsibilities & Dependencies

| Workspace Package   | Technology Stack                                                                           | Build Output    | Primary Responsibilities                                                                                            |
| :------------------ | :----------------------------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------ |
| **`@apps/admin`**   | React 18, Vite 5, Refine v4 (`@refinedev/antd`), Ant Design v5, TanStack Query v4, MSW v2. | `dist/`         | Complete operational user interface for Superadmin, Admin TU, Wali Kelas, Guru Mapel, and Kepala Sekolah.           |
| **`@apps/landing`** | React 18, Vite 5, Tailwind CSS.                                                            | `dist/`         | Public-facing landing page explaining platform capabilities and directing users to `/admin`.                        |
| **`@apps/shared`**  | TypeScript 5.5, Zod 3.23, Drizzle ORM 0.33.                                                | `output/` (ESM) | Single source of truth for runtime validation schemas, database schema definitions, and shared constants.           |
| **`@apps/worker`**  | Node.js 20+, BullMQ 5, IORedis, pg, Puppeteer/PDF rendering.                               | `dist/` (ESM)   | Heavy background processing: batch report card (PDF Rapor) rendering, document compilation, external notifications. |

---

## 3. Frontend Architecture (`@apps/admin`)

The Admin application is built on top of the **Refine** enterprise framework combined with **Ant Design**, optimized for dense data tables, rapid CRUD workflows, and complex state management.

```mermaid
graph LR
    subgraph "Core Refine Context"
        RefineProvider["<Refine />"]
        AuthProvider["authProvider.ts<br/>(Login, Refresh, Logout, Check)"]
        DataProvider["dataProvider.ts<br/>(Axios REST Mapper)"]
        AccessProvider["accessControlProvider.ts<br/>(RBAC Can() Rules)"]
        NotificationProvider["notificationProvider<br/>(AntD Notifications)"]
    end

    subgraph "State & Data Fetching"
        ReactQuery["@tanstack/react-query<br/>(Caching, Background Invalidation)"]
        FeatureDiscovery["features.ts<br/>(Runtime Discovery: GET /features)"]
    end

    subgraph "UI Component Hierarchy"
        AppLayout["AppLayout<br/>(Sider, Header, Breadcrumb)"]
        ResponsiveList["ResponsiveList<br/>(Desktop Table <-> Mobile Cards)"]
        ActionGuard["ResourceActionGuard<br/>(Permission Enforcement)"]
        Pages["Resource Pages<br/>(Students, Grades, Attendance, Reports...)"]
    end

    subgraph "Mock & Network Interceptor"
        AxiosInstance["Axios Client (with Auth & Base URL Interceptors)"]
        MSW["Mock Service Worker (MSW v2)<br/>(Browser Worker / Node Setup)"]
    end

    RefineProvider --> AuthProvider
    RefineProvider --> DataProvider
    RefineProvider --> AccessProvider
    RefineProvider --> NotificationProvider

    DataProvider --> AxiosInstance
    AxiosInstance -.->|Intercepted if VITE_USE_MSW=true| MSW
    AxiosInstance -->|Direct API Call| FeatureDiscovery

    Pages --> ActionGuard
    Pages --> ResponsiveList
    AppLayout --> Pages
    RefineProvider --> ReactQuery
```

### 3.1 Data Provider & REST Envelope Handling

- The custom Refine data provider (`apps/admin/src/providers/dataProvider.ts`) communicates with the Go backend via standard REST conventions.
- All Go backend responses are wrapped in a standard JSON envelope: `{ "data": ... }`. The data provider automatically unwraps this envelope for Refine mutations and queries.
- Query parameters (pagination `_start`/`_end`, sorting `_sort`/`_order`, and filtering) are translated into backend-compliant query params (e.g. `page`, `page_size`, `sort`, `filter`).

### 3.2 Dynamic Runtime Feature Discovery

- Rather than relying solely on build-time environment variables, `@apps/admin` executes an unauthenticated runtime discovery request `GET /api/v1/features` upon initialization.
- If reachable, the backend response dictates which navigation menus, routes, and resources are registered in the UI.
- If unreachable (offline mode, development, or network error), the system gracefully falls back to `VITE_ENABLE_*` build-time environment variables.

### 3.3 Mock Service Worker (MSW) Integration

- To support 100% frontend velocity without running database or backend dependencies, `@apps/admin` embeds MSW v2.
- In preview deployments and local development with `VITE_USE_MSW=true`, MSW intercepts network traffic with a complete mock dataset (`mockServiceWorker.js`), simulating multi-role authentication, CRUD operations, and reports generation.

---

## 4. Shared Contract Layer (`@apps/shared`)

`@apps/shared` ensures end-to-end type safety between the frontend and background worker processes:

1. **Zod Validation Schemas (`src/schemas/`)**:
   - `auth.ts`: Login payloads, password reset, token validation.
   - `student.ts`, `teacher.ts`, `user.ts`: Master entity schemas and CSV import validation.
   - `attendance.ts`: Daily and lesson attendance schemas with status enumerations.
   - `grade.ts`: Grade items, score submissions, and KKM validation rules.
   - `report.ts`: Report generation job payloads and template options.
2. **Database Schema (`src/db/schema.ts`)**:
   - Drizzle ORM table models mirroring the PostgreSQL database schema for direct worker querying.
3. **Domain Constants (`src/constants/`)**:
   - `ROLES`: `SUPERADMIN`, `ADMIN_TU`, `WALI_KELAS`, `GURU_MAPEL`, `KEPALA_SEKOLAH`, `SISWA`, `ORTU`.
   - `QUEUE_NAMES`: `REPORT_PDF_QUEUE`, `ATTENDANCE_NOTIFY_QUEUE`, `NOTIFICATION_QUEUE`.
   - `SECURITY`: Password requirements, token lifetimes, and session rules.

> **Compilation Note**: `@apps/shared` is compiled to pure ES Modules in `output/` using TypeScript before dependent packages are built.

---

## 5. Background Processing Architecture (`@apps/worker`)

Asynchronous, resource-heavy operations are isolated from the synchronous API request-response cycle using BullMQ:

```mermaid
sequenceDiagram
    autonumber
    participant UI as Admin UI (/reports)
    participant API as Go Backend API
    participant Redis as Redis Queue (BullMQ)
    participant Worker as BullMQ Worker (@apps/worker)
    participant DB as PostgreSQL
    participant S3 as Object Storage (Supabase/R2)

    UI->>API: POST /api/v1/reports/generate { enrollment_id, template }
    API->>DB: INSERT report_job (status: PENDING)
    API->>Redis: Enqueue REPORT_PDF_QUEUE job
    API-->>UI: Return 202 Accepted { job_id, status: "PENDING" }

    Redis->>Worker: Dequeue Job
    Worker->>DB: UPDATE report_job (status: PROCESSING)
    Worker->>DB: Query Student, Enrollment, Grades & Attendance
    Worker->>Worker: Render PDF Template (Chromium / Puppeteer)
    Worker->>S3: Upload Generated PDF (reports/rapor_{id}.pdf)
    Worker->>DB: UPDATE report_job (status: COMPLETED, file_url, completed_at)

    loop Polling Status
        UI->>API: GET /api/v1/reports/status/:id
        API->>DB: Query report_job
        API-->>UI: Return { status: "COMPLETED", download_url: "..." }
    end
    UI->>S3: Download PDF Rapor
```

### 5.1 Worker ESM & Driver Compatibility

- Direct connection to PostgreSQL via `pg.Pool` utilizing ESM default import interop (`import pkg from "pg"; const { Pool } = pkg;`).
- Direct Redis connection via `ioredis` with TLS support for managed providers (Upstash / Redis Cloud).
- Automatic retry strategies with exponential backoff and dead-letter queue (DLQ) logging for failed report jobs.

---

## 6. Authentication & Security Architecture

The platform implements a hardened session lifecycle combining short-lived in-memory access tokens with automatic rotation of HttpOnly refresh token cookies:

```mermaid
sequenceDiagram
    autonumber
    participant User as User Browser
    participant AdminApp as Admin React App
    participant GoAPI as Go Backend (/api/v1/auth)
    participant Redis as Redis Revocation Store

    Note over User,GoAPI: 1. Authentication
    User->>AdminApp: Enter Email & Password
    AdminApp->>GoAPI: POST /auth/login { email, password }
    GoAPI->>GoAPI: Verify Hash (bcrypt) & Generate JTI
    GoAPI-->>AdminApp: Return { data: { access_token, user } } + Set-Cookie: refresh_token (HttpOnly, SameSite=Lax)
    AdminApp->>AdminApp: Store access_token in Memory / Axios Header

    Note over User,GoAPI: 2. Authenticated Operations
    AdminApp->>GoAPI: GET /students (Authorization: Bearer <access_token>)
    GoAPI-->>AdminApp: Return Student Records

    Note over User,GoAPI: 3. Silent Token Refresh (on 401 or timer)
    AdminApp->>GoAPI: POST /auth/refresh (Cookie: refresh_token automatically sent)
    GoAPI->>Redis: Check if Old Refresh JTI is Revoked
    GoAPI->>Redis: Blacklist Old Refresh JTI
    GoAPI->>GoAPI: Issue New Access Token & New Refresh JTI
    GoAPI-->>AdminApp: Return { data: { access_token } } + Set-Cookie: new_refresh_token
    AdminApp->>AdminApp: Update Memory Access Token & Retry Queued Requests

    Note over User,GoAPI: 4. Secure Logout
    AdminApp->>GoAPI: POST /auth/logout (Cookie: refresh_token)
    GoAPI->>Redis: Revoke Active Refresh JTI
    GoAPI-->>AdminApp: Set-Cookie: refresh_token=deleted (Expires past)
    AdminApp->>AdminApp: Clear In-Memory Auth State & Redirect to /login
```

---

## 7. Deployment & Infrastructure Architecture

```mermaid
graph TD
    subgraph "Edge Tier"
        VercelRouter["Vercel Gateway Router"]
        VercelLanding["/ -> deploy/index.html (Landing)"]
        VercelAdmin["/admin/* -> deploy/admin/index.html (Admin SPA)"]
        VercelRouter --> VercelLanding
        VercelRouter --> VercelAdmin
    end

    subgraph "Application Hosting (Railway / Container VPS)"
        GoContainer["Go API Gateway (sma-adp-api)"]
        WorkerContainer["BullMQ Worker (@apps/worker)"]
    end

    subgraph "Managed Cloud Services"
        PostgresInstance["PostgreSQL 15+ (Neon / Supabase)"]
        RedisInstance["Redis 7+ (Upstash / Redis Cloud)"]
        S3Bucket["Object Storage (Cloudflare R2 / Supabase Storage)"]
    end

    VercelAdmin -->|REST HTTPS| GoContainer
    GoContainer --> PostgresInstance
    GoContainer --> RedisInstance
    WorkerContainer --> RedisInstance
    WorkerContainer --> PostgresInstance
    WorkerContainer --> S3Bucket
```

### 7.1 Unified Vercel Deployment Model

- The monorepo uses `vercel.json` to produce a single merged `deploy/` directory.
- Root path `/` serves the static landing page (`@apps/landing`).
- Subpath `/admin` serves the single-page admin panel (`@apps/admin`) with client-side HTML5 history fallback rewrite rules.
- Preview branches automatically isolate mocks via MSW without communicating with production backend services.
