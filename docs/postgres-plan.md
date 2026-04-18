# PostgreSQL Migration Plan
_Created: 2026-03-26_
_Status: PLAN — no code changed yet_

---

## 1. Chosen database tool and why

**Tool: existing `pg` (node-postgres) + `lib/db.ts` query helper. No new ORM.**

Reason:
- `pg` 8.13.1 is already installed as a production dependency
- `lib/db.ts` already exports a correctly configured `pg.Pool` singleton with the `globalThis` hot-reload guard appropriate for Next.js 14
- `query<T>(sql, params)` helper already exists and returns typed rows
- All that is needed is for `lib/data.ts` to import and call this helper — one file change, zero new dependencies
- Introducing Prisma or Drizzle at this stage would add a schema definition language, a code-generation step, a migration format, and a build-time dependency — all of which would need to be learned and debugged before anything ships
- The existing pattern (`query<RowType>(sql, [$1, $2])`) is direct, transparent, and performant for this scale (3–100 fields, hundreds of operations)
- SQL written by hand is easier to reason about for analytics queries (aggregations, JSONB extraction, window functions)

**No ORM is being introduced. The existing `pg` + `query()` pattern is the ORM equivalent for this project.**

---

## 2. Environment variables

Only one variable is required. It is already documented in `.env.example`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agronomist_panel
```

For local development, copy this to `.env.local` (Next.js loads it automatically):

```bash
cp .env.example .env.local
```

`.env.local` must be in `.gitignore` (verify this — it is the Next.js default but should be confirmed).

No additional variables are needed for the MVP. Future additions (weather API key, S3 for photos) will be added to `.env.example` when those features are implemented.

---

## 3. Local development setup

### Prerequisites
- Docker and Docker Compose (for PostgreSQL)
- Node.js 18+ and npm

### Steps

```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Start PostgreSQL container
docker compose up -d

# 3. Run migrations (creates schema)
npm run db:migrate

# 4. Seed development data
npm run db:seed

# 5. Start the app
npm run dev
```

### Verification

```bash
# Connect and verify tables exist
docker exec -it agronomist-postgres psql -U postgres -d agronomist_panel -c "\dt"

# Verify seed data
docker exec -it agronomist-postgres psql -U postgres -d agronomist_panel \
  -c "SELECT count(*) FROM operations;"
```

---

## 4. Migration workflow

### Why a migration system is needed

Currently there is only `db/init.sql` — a single file run once by `scripts/seed.js`. This means:
- Schema changes require manually dropping and re-creating tables
- There is no way to know which schema version a database is on
- Multiple developers cannot safely apply incremental changes

### Chosen approach: numbered SQL files + migrations tracking table

**No third-party migration runner** (no `db-migrate`, `flyway`, `golang-migrate`). Reason: this avoids introducing a new dependency and build step. The project already has a `scripts/seed.js` pattern — we extend it with a simple migration runner script.

### Migration directory structure

```
db/
  migrations/
    001_initial_schema.sql     ← current init.sql content, promoted
    002_add_field_timestamps.sql
  seed.sql                     ← dev seed data (unchanged)

scripts/
  migrate.js                   ← new: runs pending migrations
  seed.js                      ← existing: unchanged logic, calls migrate first
```

### migrations tracking table

Added to the first migration:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version  text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
```

The migration runner reads this table, finds pending files by comparing filenames to applied versions, and runs them in order.

### Migration runner logic (scripts/migrate.js)

```
1. Connect to DATABASE_URL
2. Create schema_migrations table if not exists
3. Read all files from db/migrations/ sorted by name
4. For each file:
   a. Check if version (filename without .sql) exists in schema_migrations
   b. If not: read file, execute SQL, insert version into schema_migrations
   c. If yes: skip
5. Log applied and skipped migrations
6. Disconnect
```

### npm scripts to add

```json
"db:migrate": "node scripts/migrate.js",
"db:seed":    "node scripts/migrate.js && node scripts/seed.js"
```

Note: `db:seed` will now run migrations first, then seed. This ensures schema is always current before seeding.

### How to add a new migration

1. Create `db/migrations/NNN_description.sql` with the next available number
2. Write idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
3. Run `npm run db:migrate`
4. The runner applies only new migrations

---

## 5. Seed workflow

`db/seed.sql` is unchanged. It uses `TRUNCATE ... RESTART IDENTITY CASCADE` before inserting so it is safe to re-run.

```bash
npm run db:seed   # runs migrations first, then seed
```

The seed file provides:
- 3 varieties
- 3 fertilizers
- 3 fields
- 18 operations (all 8 types represented)

This is sufficient for development. No separate test/production seed is needed at this stage.

---

## 6. Proposed tables

### Schema decision: JSONB payload retained

**Decision: `operations` table with JSONB `payload` column. No typed detail tables.**

This was evaluated against CLAUDE.md's preferred default (typed detail tables). JSONB is the correct choice here for the following reasons that outweigh the preference:

| Concern | JSONB | Typed detail tables |
|---|---|---|
| Timeline query complexity | Single SELECT, zero joins | 8-way LEFT JOIN or UNION |
| Insert path per form | One INSERT per operation type | One INSERT into `operations` + one INSERT into type table |
| Future operation types (e.g. soil sampling) | Add new payload keys, no migration | New table + migration |
| Analytics queries | PostgreSQL `payload->>'field'::numeric` — supported | JOIN to typed table |
| Type safety | TypeScript payload types per operation_type | DB constraint per column |
| Scale | 3–1000 fields, thousands of operations | No difference at this scale |

The typed guarantees that detail tables provide are reproduced at the application layer: each operation form will have a TypeScript type for its payload, and the form will validate before writing. The database gets a well-structured JSONB object, not arbitrary JSON.

This assumption is recorded here and in `docs/architecture-audit.md`.

---

### Migration 001 — initial schema

Promotes current `db/init.sql` content into the migration system. Content is identical to current `init.sql` with the addition of the `schema_migrations` tracking table.

```sql
-- schema_migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- varieties
CREATE TABLE IF NOT EXISTS varieties (
  id                   serial PRIMARY KEY,
  name                 text NOT NULL,
  maturity_group       text NOT NULL,
  purpose_type         text NOT NULL,   -- столовый | чипсы | фри
  yield_potential_t_ha numeric(6,2) NOT NULL DEFAULT 0
);

-- fertilizers
CREATE TABLE IF NOT EXISTS fertilizers (
  id               serial PRIMARY KEY,
  name             text NOT NULL,
  fertilizer_type  text NOT NULL,
  n_pct            numeric(5,2) NOT NULL DEFAULT 0,
  p_pct            numeric(5,2) NOT NULL DEFAULT 0,
  k_pct            numeric(5,2) NOT NULL DEFAULT 0,
  purpose_note     text
);

-- fields
CREATE TABLE IF NOT EXISTS fields (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  area_ha        numeric(8,2) NOT NULL,
  variety_id     integer NOT NULL REFERENCES varieties(id),
  current_phase  text NOT NULL,
  disease_status integer NOT NULL DEFAULT 0 CHECK (disease_status BETWEEN 0 AND 5)
);

-- operations (JSONB payload per type)
CREATE TABLE IF NOT EXISTS operations (
  id              serial PRIMARY KEY,
  field_id        integer NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  operation_type  text NOT NULL,
  operation_date  date NOT NULL,
  title           text NOT NULL,
  notes           text,
  payload         jsonb NOT NULL DEFAULT '{}',
  photo_url       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_field_date
  ON operations(field_id, operation_date DESC);

CREATE INDEX IF NOT EXISTS idx_operations_type
  ON operations(operation_type);
```

---

### Migration 002 — add timestamps to fields

Adds `created_at` and `updated_at` to `fields` table as required by CLAUDE.md database design principles.

```sql
ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
```

Note: `updated_at` must be kept current by the application layer. A PostgreSQL trigger can automate this but is not required for MVP — the application will set it explicitly on UPDATE.

---

### Indexes summary

| Table | Index | Purpose |
|---|---|---|
| `operations` | `(field_id, operation_date DESC)` | Timeline queries per field |
| `operations` | `(operation_type)` | Analytics queries by type |
| `fields` | `(variety_id)` | Auto-created by FK; joins |
| `operations` | `(field_id, operation_type)` | **Add in migration 002** — used by analytics (filter by type per field) |

Add to migration 002:
```sql
CREATE INDEX IF NOT EXISTS idx_operations_field_type
  ON operations(field_id, operation_type);
```

---

### Entity-relationship summary

```
varieties (1) ──< fields (1) ──< operations
fertilizers        (many)         (many)
```

`fertilizers` is referenced by name in `operations.payload->>'product'` (not a FK). This is intentional: it allows historical preservation if a fertilizer is renamed or deleted. Forms will provide a dropdown from the `fertilizers` table; the selected name is stored in payload.

---

## 7. Migration from mock data to PostgreSQL

### The single-file swap strategy

The entire migration is contained in **one file: `lib/data.ts`**.

All pages, API routes, and components call functions exported from `lib/data.ts` with fixed signatures. Nothing else needs to change.

The strategy:
1. Keep all function signatures identical
2. Replace each function body: remove in-memory array operations, replace with `query()` calls
3. Remove the in-memory arrays and `addOperation()` mock helper
4. Add `import { query } from '@/lib/db'` at the top

**Zero changes** to:
- `app/page.tsx`
- `app/fields/[id]/page.tsx`
- Any `app/api/*/route.ts`
- Any component file
- `lib/types.ts`

### Function-by-function SQL equivalents

**`getFields()`**
```sql
SELECT
  f.id, f.name, f.area_ha,
  v.name AS variety_name,
  f.current_phase, f.disease_status,
  latest_op.operation_type  AS last_operation_type,
  latest_op.operation_date  AS last_operation_date,
  insp.plant_density,
  insp.stems_per_plant,
  irr.last_mm
FROM fields f
JOIN varieties v ON v.id = f.variety_id
-- latest operation per field
LEFT JOIN LATERAL (
  SELECT operation_type, operation_date
  FROM operations WHERE field_id = f.id
  ORDER BY operation_date DESC, id DESC LIMIT 1
) latest_op ON true
-- latest inspection per field
LEFT JOIN LATERAL (
  SELECT
    (payload->>'plantDensity')::numeric  AS plant_density,
    (payload->>'stemsPerPlant')::numeric AS stems_per_plant
  FROM operations
  WHERE field_id = f.id AND operation_type = 'inspection'
  ORDER BY operation_date DESC, id DESC LIMIT 1
) insp ON true
-- latest irrigation per field
LEFT JOIN LATERAL (
  SELECT (payload->>'volumeMm')::numeric AS last_mm
  FROM operations
  WHERE field_id = f.id AND operation_type = 'irrigation'
  ORDER BY operation_date DESC, id DESC LIMIT 1
) irr ON true
ORDER BY f.name;
```

Note: The `moisture_risk` derivation (`lastMm < 18 → 'high'`) stays in the TypeScript layer — it is a business rule, not a SQL concern.

**`getFieldById(id)`**
- Field + variety: `SELECT f.*, v.name, v.maturity_group, v.purpose_type FROM fields f JOIN varieties v ON v.id = f.variety_id WHERE f.id = $1`
- Metrics (N/P/K totals, irrigation total): aggregate queries filtering by `operation_type`
- Timeline: `SELECT * FROM operations WHERE field_id = $1 ORDER BY operation_date DESC, id DESC`

**`getComparison()`**
- Per-field aggregates: `SUM(payload->>'kKgHa')::numeric` for K, `SUM(payload->>'volumeMm')::numeric` for irrigation — filtered by type
- `desiccation_done`: `EXISTS(SELECT 1 FROM operations WHERE field_id = f.id AND operation_type = 'desiccation')`

**`getDashboardSummary()`**
- Summary KPIs: `COUNT(*)`, `SUM(area_ha)`, `COUNT(*) WHERE disease_status >= 3`, etc.
- Disease trend: aggregate `lateBlight` from inspection payloads grouped by date
- Yield vs potassium: per-field aggregates

**`addOperation()`** → replace with:
```sql
INSERT INTO operations (field_id, operation_type, operation_date, title, notes, payload, photo_url)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;
```
Plus conditional UPDATE on `fields.current_phase` / `fields.disease_status` / `fields.updated_at` if the request body includes them.

**`getVarieties()` / `getFertilizers()`**
- Simple `SELECT * FROM varieties ORDER BY name`
- Simple `SELECT * FROM fertilizers ORDER BY name`

---

## 8. Which screens read from which tables

| Screen | Tables read | Notes |
|---|---|---|
| 1. Список полей | `fields`, `varieties`, `operations` | LATERAL joins for latest op + latest inspection + latest irrigation |
| 2. Экран поля (лента) | `fields`, `varieties`, `operations` | Full timeline for field |
| 12. Аналитика поля | `operations` | Filtered by field_id; grouped by type and date |
| 13. Сравнение полей | `fields`, `varieties`, `operations` | Aggregated per field |
| Dashboard KPIs | `fields`, `operations` | COUNT, SUM aggregates |
| 15. Справочник сортов | `varieties` | Full list |
| 16. Справочник удобрений | `fertilizers` | Full list |
| Operation forms (dropdowns) | `varieties`, `fertilizers` | For selects in planting and fertilizer forms |

---

## 9. Which forms write to which tables

| Form (screen) | Primary write | Secondary write |
|---|---|---|
| Посадка (4) | `INSERT INTO operations` (type=planting) | `UPDATE fields SET current_phase='всходы'` if specified |
| Осмотр (5) | `INSERT INTO operations` (type=inspection) | `UPDATE fields SET disease_status=?, updated_at=now()` |
| Удобрения (6) | `INSERT INTO operations` (type=fertilizer) | — |
| Полив (7) | `INSERT INTO operations` (type=irrigation) | — |
| СЗР (8) | `INSERT INTO operations` (type=crop_protection) | — |
| Десикация (9) | `INSERT INTO operations` (type=desiccation) | `UPDATE fields SET current_phase='десикация'` if specified |
| Уборка (10) | `INSERT INTO operations` (type=harvest) | `UPDATE fields SET current_phase='уборка'` if specified |
| Хранение (11) | `INSERT INTO operations` (type=storage) | — |
| Добавить поле | `INSERT INTO fields` | — |

All writes go through the existing `POST /api/operations` route. The route already accepts `current_phase` and `disease_status` in the request body for field updates.

Field creation requires a new `POST /api/fields` route (does not exist yet — out of scope for this migration step).

---

## 10. Risks and compatibility issues

### Risk 1: JSONB numeric extraction type coercion
**Issue:** PostgreSQL JSONB stores numbers as JSON numbers. Extracting with `payload->>'field'` returns `text`. Must cast: `(payload->>'yieldTHa')::numeric`.
**Mitigation:** All SQL queries in `lib/data.ts` will use explicit casts. TypeScript return types enforce the numeric type.

### Risk 2: NULL vs 0 in aggregates
**Issue:** `SUM()` over an empty set returns NULL, not 0. The existing mock returns 0.
**Mitigation:** Use `COALESCE(SUM(...), 0)` in all aggregate queries. This matches the current behavior.

### Risk 3: LATERAL join support
**Issue:** LATERAL joins require PostgreSQL 9.3+. The project uses PostgreSQL 16. No issue.

### Risk 4: Connection pool exhaustion in development
**Issue:** Next.js hot-reload creates new module instances. Without the `globalThis` guard, each reload creates a new Pool.
**Mitigation:** Already handled in `lib/db.ts` with the `globalForDb.pool` pattern. No change needed.

### Risk 5: DATABASE_URL not set
**Issue:** If `.env.local` is missing, `lib/db.ts` falls back to the hardcoded default connection string. If PostgreSQL is not running, every page render throws.
**Mitigation:** The fallback string matches the Docker Compose defaults exactly. Dev setup documentation (this document) covers this. No code change needed — the existing fallback is correct.

### Risk 6: `db/init.sql` becomes stale
**Issue:** `init.sql` currently contains the full schema. Once migrations are in place, `init.sql` will be superseded by `db/migrations/001_initial_schema.sql`. The seed script currently runs `init.sql` directly.
**Mitigation:** Update `scripts/seed.js` to call `scripts/migrate.js` logic instead of reading `init.sql` directly. `init.sql` can be kept as documentation reference but must not be run alongside migrations.

### Risk 7: `operations.payload` type safety at write time
**Issue:** The API accepts any JSONB. A malformed payload can be inserted without error.
**Mitigation:** TypeScript form types per operation_type enforce shape before the API call. Server-side validation in the API route will check required fields per operation_type. This is implemented in the forms phase, not the migration phase.

### Risk 8: `updated_at` not auto-updated
**Issue:** `fields.updated_at` will only be updated when application code explicitly sets it. Forgetting to set it on UPDATE means the value is stale.
**Mitigation:** All UPDATE statements in `lib/data.ts` must include `updated_at = now()`. A PostgreSQL trigger is the correct long-term solution but is deferred — out of scope for MVP.

---

## 11. Implementation steps (ordered, minimal-invasive)

This is the concrete execution sequence. Each step is independently verifiable.

### Step A — Create migration infrastructure
- Create `db/migrations/001_initial_schema.sql` (content from current `init.sql` + `schema_migrations` table)
- Create `db/migrations/002_add_field_timestamps.sql` (add `created_at`, `updated_at`, `idx_operations_field_type`)
- Create `scripts/migrate.js` (numbered SQL runner with tracking table)
- Update `package.json`: add `"db:migrate"` script; update `"db:seed"` to run migrate first
- Do NOT change `lib/data.ts`, any page, or any component yet

### Step B — Verify migration infrastructure
```bash
docker compose up -d
npm run db:migrate
# Verify: schema_migrations should have 2 rows
docker exec agronomist-postgres psql -U postgres -d agronomist_panel \
  -c "SELECT version FROM schema_migrations;"
npm run db:seed
# Verify: data is present
docker exec agronomist-postgres psql -U postgres -d agronomist_panel \
  -c "SELECT count(*) FROM operations;"
```

### Step C — Migrate lib/data.ts to PostgreSQL
- Add `import { query } from '@/lib/db'` to `lib/data.ts`
- Replace each function body with SQL via `query()`
- Remove in-memory arrays
- Remove `addOperation()` mock helper
- Add real `addOperation()` using INSERT + conditional UPDATE

### Step D — Validate
```bash
npm run build       # must pass
npx tsc --noEmit    # must pass
npm run lint        # must pass (or fix lints)
# Start app and verify pages load with real data
npm run dev
```

### Step E — Smoke test
- Visit `/` — field list loads from PostgreSQL
- Visit `/fields/1` — timeline loads from PostgreSQL
- `curl -X POST /api/operations` with test payload — record persists after server restart

---

## 12. What this migration does NOT include

These are explicitly out of scope for the PostgreSQL migration step:

- New form components or UI
- New pages or routes
- Per-field analytics
- Weather integration
- Field creation UI
- Dictionary CRUD pages

Those are covered in subsequent steps per the delivery order in `docs/readiness-baseline.md`.
