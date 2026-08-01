Local dev stack (Postgres + Redis) for Go API and Admin Frontend

This repository includes a Docker Compose setup for running a local Postgres + Redis stack, with the Go API (sma-adp-api) and Admin frontend.

Start the database and redis services (for Go API):

```bash
cd /home/noah/project/sma/sma-adp-api && make docker-up
```

Run database migrations and seed data for Go API:

```bash
cd /home/noah/project/sma/sma-adp-api
migrate -path migrations -database "postgresql://postgres:postgres@localhost:5432/admin_panel_sma?sslmode=disable" up
psql "postgresql://postgres:postgres@localhost:5432/admin_panel_sma?sslmode=disable" -f scripts/seed.sql
```

Start Go API server:

```bash
cd /home/noah/project/sma/sma-adp-api && make dev
```

Start Admin frontend:

```bash
cd /home/noah/project/sma/admin-panel-sma/apps/admin && pnpm dev
```

Notes:

- The Go API (sma-adp-api) uses DATABASE_URL=postgres://postgres:postgres@localhost:5432/admin_panel_sma and REDIS_URL=redis://localhost:6379
- The Admin frontend connects to Go API at http://localhost:8081/api/v1 (configured via VITE_API_URL)
- NestJS backend has been removed; backend is now Go-based
