# ADR 0005: Asynchronous PDF Report Card Generation using BullMQ Worker

## Status

Accepted (Implemented)

## Context

Compiling semester report cards (_Buku Rapor_) involves aggregating dozens of data points per student (biodata, attendance records, formative scores, summative scores, behavioral comments, extracurriculars) and rendering pixel-perfect multi-page PDFs using Chromium / Puppeteer or PDFKit. Performing this synchronously within HTTP requests blocks API worker threads, causes HTTP gateway timeouts (504 Gateway Timeout), and degrades server performance.

## Decision

Decouple PDF report card generation using **BullMQ** and a dedicated worker process (`@apps/worker`):

1. The Go API handles generation requests by creating a `report_job` record in PostgreSQL (status: `PENDING`), enqueuing a message to Redis (`REPORT_PDF_QUEUE`), and returning a `202 Accepted` response with the `job_id`.
2. `@apps/worker` picks up the job, fetches necessary relational data directly from PostgreSQL, renders the PDF document, and uploads the artifact to S3/Supabase Storage.
3. The worker updates the `report_job` status to `COMPLETED` with the secure download URL.
4. The frontend polls `GET /api/v1/reports/status/:id` and alerts the user when generation finishes.

## Consequences

- **Positive**:
  - Zero risk of HTTP timeout on large class batches (30-40 students).
  - Independent horizontal scalability of the PDF worker process without affecting API throughput.
  - Resilient retry handling with exponential backoff and dead-letter queue inspection for failed jobs.
- **Negative / Constraints**:
  - Requires Redis infrastructure for BullMQ state and queue management.
  - Requires polling or websocket notification integration in the UI.
