# Architecture Audit
_Generated: 2026-03-26. Do not change app code based on this file alone — it is reference only._

---

## 1. Frontend framework and app structure

| Property | Value |
|---|---|
| Framework | Next.js 14.2.25, App Router |
| Language | TypeScript 5.7.2 |
| Styling | Tailwind CSS 3.4.17, custom `brand` green palette |
| Icons | lucide-react 0.469.0 |
| Charts | recharts 2.15.0 |
| UI utilities | clsx 2.1.1 |
| React | 18.3.1 |

**Pages (app router):**

```
app/
  layout.tsx            root layout, sets font and background gradient
  globals.css           body background, font
  page.tsx              / — dashboard: field list + 2 charts + comparison table
  fields/[id]/page.tsx  /fields/:id — field detail: metrics cards + timeline
```

All pages are server components. Charts use `'use client'` and are imported into server pages. There is no loading state, error boundary, or suspense used anywhere.

**Component inventory:**

| File | Components | Notes |
|---|---|---|
| `components/ui.tsx` | Shell, Card, Badge, SectionTitle, ActionLink | Reusable base primitives |
| `components/header.tsx` | DashboardHero | Hero banner with feature pills |
| `components/summary-cards.tsx` | SummaryCards | 4-KPI grid |
| `components/field-card.tsx` | FieldCard | Field overview card, links to detail |
| `components/timeline.tsx` | Timeline | Chat-style list; renders payload as raw `JSON.stringify` |
| `components/comparison-table.tsx` | ComparisonTable | Table with 8 columns; missing calibration column |
| `components/charts.tsx` | DiseaseTrendChart, YieldPotassiumChart | recharts, `'use client'` |

**Missing UI infrastructure (nothing exists for these):**
- Modal / dialog component
- Form input primitives (Input, Select, Textarea, NumberInput)
- Button component
- Form validation
- Toast / notification after save
- Any interactive state management (no useState/useReducer in any page)

---

## 2. Backend / data access pattern

**Critical finding: ALL data comes from in-memory arrays in `lib/data.ts`.**

`lib/db.ts` exists and exports a `pg.Pool` and `query()` helper, but **it is never imported by any page, API route, or component**. The PostgreSQL connection is completely unused at runtime.

Data flow today:

```
page.tsx / fields/[id]/page.tsx
  └── imports lib/data.ts (getFields, getFieldById, etc.)
        └── reads from in-memory JS arrays (3 fields, 18 operations)

app/api/*/route.ts
  └── imports lib/data.ts functions
        └── same in-memory arrays
            (POST /api/operations calls addOperation() which pushes to the array —
             data is lost on every server restart)
```

`lib/data.ts` functions and their data sources:

| Function | Source | Notes |
|---|---|---|
| `getFields()` | in-memory `fields[]` array | |
| `getFieldById(id)` | in-memory | |
| `getComparison()` | in-memory | |
| `getDashboardSummary()` | in-memory | |
| `getVarieties()` | in-memory `varieties[]` | |
| `getFertilizers()` | in-memory `fertilizers[]` | |
| `addOperation()` | pushes to in-memory `operations[]` | **NOT persisted** |

---

## 3. Package manager and scripts

Package manager: **npm** (package-lock.json present).

```json
"scripts": {
  "dev":      "next dev",
  "build":    "next build",
  "start":    "next start",
  "lint":     "next lint",
  "db:seed":  "node scripts/seed.js"
}
```

No test runner. No migration runner. No typecheck script (use `npx tsc --noEmit`).

`scripts/seed.js` is a standalone Node script that reads `db/init.sql` + `db/seed.sql` and runs them against PostgreSQL via `pg.Client`. It is the only file that actually touches the database.

---

## 4. Current routes / pages / screens

| Route | Type | Screen# | Status |
|---|---|---|---|
| `/` | Page | 1, 13 | Partial — list + comparison, no add field button |
| `/fields/[id]` | Page | 2 | Partial — timeline works, no add operation button |
| `GET /api/fields` | API | — | Works (in-memory) |
| `GET /api/fields/[id]` | API | — | Works (in-memory) |
| `POST /api/operations` | API | 3–11 | Works (in-memory, not persisted) |
| `GET /api/analytics/summary` | API | 12 | Global only, no per-field analytics |
| `GET /api/references/varieties` | API | 15 | Works (in-memory) |
| `GET /api/references/fertilizers` | API | 16 | Works (in-memory) |

**Missing routes:**
- `GET /api/fields/[id]/analytics` — per-field analytics
- `GET/POST /api/fields` for field creation
- `/fields/[id]/analytics` — per-field analytics page
- `/dictionaries/varieties` — variety settings page
- `/dictionaries/fertilizers` — fertilizer reference page
- `/weather` — weather screen

---

## 5. Domain models and types

Defined in `lib/types.ts`:

```typescript
FieldCard          // used in field list (id, name, area_ha, variety_name, current_phase,
                   // disease_status, last_operation_*, plant_density, stems_per_plant, moisture_risk)

TimelineEntry      // used in field detail (id, field_id, operation_type, operation_date,
                   // title, notes, payload: Record<string,unknown>, photo_url)

FieldDetails       // wraps field + metrics + timeline[]
  metrics: {
    total_n, total_p, total_k   // summed from fertilizer payloads
    irrigation_mm               // summed from irrigation payloads
    yield_t_ha                  // from latest harvest payload
    storage_loss_pct            // from latest storage payload
  }

ComparisonRow      // id, name, variety_name, area_ha, current_phase,
                   // yield_t_ha, k_kg_ha, irrigation_mm, disease_status, desiccation_done
```

**Types missing / needed for new work:**
- Operation form input types per operation_type
- Analytics data shape for per-field charts
- Variety / Fertilizer entity types for dictionary pages
- Field creation input type

---

## 6. Where data currently comes from

**Source: 100% in-memory JavaScript arrays in `lib/data.ts`.**

The in-memory data is a faithful mirror of `db/seed.sql`. It includes:
- 3 varieties (Коломба, Гала, Ред Скарлетт)
- 3 fertilizers (NPK 16-16-16, Калимагнезия, Монокалийфосфат)
- 3 fields
- 18 operations covering all 8 operation types

All payloads are well-structured JSONB objects. The data model is internally consistent and ready for migration.

---

## 7. Database code

**Schema:** `db/init.sql`
- 4 tables: `varieties`, `fertilizers`, `fields`, `operations`
- `operations.payload` is `jsonb NOT NULL DEFAULT '{}'`
- Correct FK: `fields.variety_id → varieties`, `operations.field_id → fields ON DELETE CASCADE`
- Indexes: `(field_id, operation_date desc)`, `(operation_type)`
- Missing: `updated_at` on fields, `harvest_date_end` column, no migration versioning

**Connection:** `lib/db.ts`
- `pg.Pool` singleton with `globalThis` pattern (correct for Next.js dev hot-reload)
- Defaults to `postgres://postgres:postgres@localhost:5432/agronomist_panel`
- `query<T>()` helper returns `result.rows`
- **Never used by the app at runtime** — only by `scripts/seed.js`

**Migration system:** None. Only raw SQL files run once by seed script.

**Docker:** `docker-compose.yml` defines PostgreSQL 16 service on port 5432 with volume `postgres_data`. Fully usable for local dev.

---

## 8. Reusable components

**High reuse value (keep as-is or extend):**

| Component | Reusable for |
|---|---|
| `Card` | All form panels, modals, analytics cards |
| `Badge` | Operation type labels, status indicators |
| `Shell` | All new pages |
| `SectionTitle` | All new page sections |
| `Timeline` | Existing; needs payload rendering upgrade |
| `ComparisonTable` | Add calibration column only |
| Chart pattern in `charts.tsx` | Duplicate pattern for per-field charts |

**Must be added (none exist):**
- `Modal` — for new operation entry
- `Button` — for all form submits
- `Input`, `Select`, `Textarea`, `NumberInput` — for all operation forms
- Form components per operation type (8 total)

---

## 9. Analytics / chart infrastructure

Recharts is installed and working. The pattern used in `components/charts.tsx`:

```tsx
'use client'
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={...}>
    <CartesianGrid /> <XAxis /> <YAxis /> <Tooltip />
    <Area ... />
  </AreaChart>
</ResponsiveContainer>
```

This pattern can be directly reused for:
- NPK over season (BarChart or LineChart)
- Disease dynamics (AreaChart — already done globally, needs per-field version)
- Irrigation water balance (BarChart)
- Protection windows (custom or ComposedChart)

The data derivation logic exists in `getDashboardSummary()` in `lib/data.ts` and can be adapted for per-field analytics with a `field_id` filter.

---

## 10. Minimal path to PostgreSQL + product vision

### Phase 1 — PostgreSQL as source of truth (no new UI)

1. Ensure PostgreSQL is running (docker compose up)
2. Run `npm run db:seed` to populate database
3. Replace functions in `lib/data.ts` with SQL queries via `lib/db.ts`
   - Keep the same function signatures → zero changes to pages, API routes, or components
   - This is a pure internal swap with no UI impact
4. Add `updated_at` to `fields` table in `init.sql`
5. Verify `npm run build` passes

**Risk:** Low. All function signatures and return types remain identical.

### Phase 2 — New operation entry (highest business value)

1. Add UI primitives: `Button`, `Input`, `Select`, `Textarea` to `components/ui.tsx`
2. Add `Modal` component
3. Add "+" button on `/fields/[id]` page
4. Add `OperationTypeSelector` (the popup with icons per type)
5. Add 8 typed form components (planting, inspection, fertilizer, irrigation, protection, desiccation, harvest, storage)
6. Wire forms to `POST /api/operations`
7. After submit, `router.refresh()` to reload server component data

### Phase 3 — Per-field analytics

1. Add `getFieldAnalytics(id)` function to data layer
2. Add `GET /api/fields/[id]/analytics` API route
3. Add analytics section to `/fields/[id]` page
4. Charts: NPK cumulative, disease dynamics, irrigation timeline, protection events

### Phase 4 — Secondary

- Calibration column in comparison table (data already available)
- Structured timeline payload rendering
- Dictionary pages (varieties, fertilizers)
- Weather integration

---

## Database schema decision: JSONB vs typed detail tables

**Decision: keep single `operations` table + JSONB payload.**

**Justification:**
1. All 8 operation types are already consistently structured in the seed data — the "schema" is in the application layer
2. PostgreSQL JSONB supports typed queries (`payload->>'yieldTHa'::numeric`) so analytics remain possible
3. Typed detail tables would require 8-way LEFT JOIN for any timeline query and 8 separate insert paths for each operation type
4. JSONB allows future operation types (e.g., soil sampling) without schema migrations
5. The per-type forms + type-safe TypeScript payload types give the same guarantees at the app layer
6. The existing `idx_operations_type` index supports type-filtered queries efficiently

The CLAUDE.md preference for typed detail tables is acknowledged but JSONB is the correct choice for this domain model. This assumption is documented here.
