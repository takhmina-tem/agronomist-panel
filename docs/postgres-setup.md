# PostgreSQL Setup — Local Development
_Last updated: 2026-03-26_

---

## Prerequisites

- **Docker** and **Docker Compose** (to run PostgreSQL locally)
- **Node.js 18+** and **npm**
- No other tools required — `pg` is already a project dependency

---

## First-time setup

```bash
# 1. Copy env file (Next.js reads .env.local automatically)
cp .env.example .env.local

# 2. Start PostgreSQL container in the background
docker compose up -d

# 3. Run database migrations (creates schema)
npm run db:migrate

# 4. Seed development data (3 fields, 18 operations)
npm run db:seed

# 5. Start the app
npm run dev
```

Open http://localhost:3000 — the field list should appear.

---

## How to verify the database is working

### Option A — health check endpoint

After `npm run dev`, open:

```
http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "db": "connected",
  "pg_version": "PostgreSQL 16.x ...",
  "migrations_applied": [
    { "version": "001_initial_schema", "applied_at": "..." },
    { "version": "002_add_field_timestamps", "applied_at": "..." }
  ],
  "tables_found": ["fertilizers", "fields", "operations", "schema_migrations", "varieties"]
}
```

If you see `"status": "error"`, PostgreSQL is not running or migrations have not been applied.

### Option B — psql directly

```bash
# Connect to the running container
docker exec -it agronomist-postgres psql -U postgres -d agronomist_panel

# List tables
\dt

# Check migrations
SELECT version, applied_at FROM schema_migrations;

# Count seed data
SELECT count(*) FROM fields;
SELECT count(*) FROM operations;
```

---

## Environment variables

| Variable | Default | Required |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/agronomist_panel` | Yes |

The default value matches the Docker Compose service exactly. For local dev you only need to set `DATABASE_URL` if you are using a different PostgreSQL instance.

`.env.local` is git-ignored and never committed.

---

## Migration commands

| Command | What it does |
|---|---|
| `npm run db:migrate` | Runs all pending migrations. Safe to re-run — already-applied versions are skipped. |
| `npm run db:seed` | Runs migrations first, then seeds dev data. Truncates existing data before inserting. |

---

## Adding a new migration

1. Create a new file in `db/migrations/` with the next number:

   ```
   db/migrations/003_your_description.sql
   ```

2. Write idempotent SQL:

   ```sql
   -- Example: add a column
   ALTER TABLE fields ADD COLUMN IF NOT EXISTS soil_type text;
   ```

3. Run:

   ```bash
   npm run db:migrate
   ```

   Output will show `apply 003_your_description.sql` for new migrations and `skip NNN_*.sql` for already-applied ones.

---

## Docker Compose reference

The `docker-compose.yml` defines a single `postgres` service:

| Setting | Value |
|---|---|
| Image | postgres:16 |
| Container name | `agronomist-postgres` |
| Port | `5432:5432` |
| Database | `agronomist_panel` |
| User | `postgres` |
| Password | `postgres` |
| Data volume | `postgres_data` (persistent across restarts) |

```bash
# Start
docker compose up -d

# Stop (keeps data)
docker compose stop

# Stop and destroy data volume (full reset)
docker compose down -v
```

After `docker compose down -v`, re-run `npm run db:seed` to rebuild the database.

---

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

PostgreSQL is not running. Run:

```bash
docker compose up -d
docker compose ps   # should show "running"
```

### "relation does not exist"

Migrations have not been applied. Run:

```bash
npm run db:migrate
```

### "password authentication failed"

Your `.env.local` has different credentials than the Docker Compose default. Either update `.env.local` or update `docker-compose.yml` to match.

### Want to reset all data

```bash
docker compose down -v   # destroys volume
docker compose up -d     # recreates container
npm run db:seed           # re-applies migrations + seed
```

---

## Database schema overview

```
varieties     id, name, maturity_group, purpose_type, yield_potential_t_ha
fertilizers   id, name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note
fields        id, name, area_ha, variety_id → varieties, current_phase,
              disease_status, created_at, updated_at
operations    id, field_id → fields, operation_type, operation_date,
              title, notes, payload (jsonb), photo_url, created_at
schema_migrations  version, applied_at
```

Full schema: `db/migrations/001_initial_schema.sql`, `db/migrations/002_add_field_timestamps.sql`

Full design rationale: `docs/postgres-plan.md`
