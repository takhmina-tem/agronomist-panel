# Data Flow
_Last updated: 2026-03-26_

All reads go through `lib/data.ts` → `lib/db.ts` (pg.Pool) → PostgreSQL. No mock arrays remain in any application file.

---

## Read paths by screen

| Screen | Route / Component | Data function | SQL strategy |
|---|---|---|---|
| 1. Field list | `app/page.tsx` (server component) | `getFields()` | Single query with 3 LATERAL JOINs |
| 2. Field detail | `app/fields/[id]/page.tsx` | `getFieldById(id)` | 2 queries: field+variety, then all operations |
| 3. New operation entry | `app/fields/[id]/new-operation/page.tsx` | `getFieldById(id)` | Same as field detail |
| 4–11. Operation forms | Various form pages | `getVarieties()`, `getFertilizers()` | Simple SELECTs for dropdown data |
| 12. Field analytics | `app/fields/[id]/analytics/page.tsx` | `getFieldById(id)` | All operations for field, filtered client-side |
| 13. Field comparison | `app/comparison/page.tsx` | `getComparison()` | Single query with 4 LATERAL JOINs per field |
| Dashboard | `app/dashboard/page.tsx` | `getDashboardSummary()` | 3 queries: KPIs, disease trend, yield vs K |
| 15. Variety dictionary | `app/varieties/page.tsx` | `getVarieties()` | `SELECT * FROM varieties ORDER BY name` |
| 16. Fertilizer dictionary | `app/fertilizers/page.tsx` | `getFertilizers()` | `SELECT * FROM fertilizers ORDER BY name` |

---

## Write paths

| Action | API route | Data function | SQL |
|---|---|---|---|
| Log any operation | `POST /api/operations` | `addOperation()` | `INSERT INTO operations` + conditional `UPDATE fields` |
| Create field | `POST /api/fields` | `createField()` | `INSERT INTO fields RETURNING id` |

---

## Function details

### `getFields()` → `FieldCard[]`
```sql
SELECT f.*, v.name AS variety_name,
  latest_op.operation_type, latest_op.operation_date,
  insp.plant_density, insp.stemsPerPlant,
  irr.last_mm
FROM fields f
JOIN varieties v ON v.id = f.variety_id
LEFT JOIN LATERAL (last operation per field) latest_op ON true
LEFT JOIN LATERAL (last inspection payload) insp ON true
LEFT JOIN LATERAL (last irrigation payload) irr ON true
ORDER BY f.name
```
`moisture_risk` (`low` / `medium` / `high`) is derived in TypeScript from `last_mm` — not a DB column.

### `getFieldById(id)` → `FieldDetails`
- Query 1: `fields JOIN varieties WHERE f.id = $1`
- Query 2: `SELECT * FROM operations WHERE field_id = $1 ORDER BY operation_date DESC`
- Season metrics (total N/P/K, irrigation mm, yield, storage loss) are derived in TypeScript by filtering the operations array — no extra queries.

### `getComparison()` → `ComparisonRow[]`
```sql
SELECT f.*, v.name,
  harv.yield_t_ha, harv.fraction3555, harv.fraction5570, harv.fraction70plus,
  fert.k_kg_ha, irr.irrigation_mm, des.cnt > 0 AS desiccation_done
FROM fields f
JOIN varieties v ON v.id = f.variety_id
LEFT JOIN LATERAL (latest harvest payload)           harv ON true
LEFT JOIN LATERAL (SUM fertilizer kKgHa)             fert ON true
LEFT JOIN LATERAL (SUM irrigation volumeMm)          irr  ON true
LEFT JOIN LATERAL (COUNT desiccation operations)     des  ON true
ORDER BY f.name
```
`HarvestCalibration` object is assembled in TypeScript from the JSONB fraction fields.

### `getDashboardSummary()`
- KPI query: `COUNT`, `SUM area_ha`, `COUNT FILTER disease_status >= 3` from `fields`; `AVG yieldTHa` from `operations`
- Disease trend: `AVG lateBlight` from inspection payloads grouped by `operation_date`
- Yield vs potassium: per-field `SUM kKgHa` (fertilizer) + latest `yieldTHa` (harvest) via LATERAL

### `addOperation()` → `TimelineEntry`
```sql
INSERT INTO operations (...) VALUES (...) RETURNING ...
-- then conditionally:
UPDATE fields SET current_phase=$1, disease_status=$2, updated_at=now() WHERE id=$3
```
The field UPDATE only runs when `current_phase` or `disease_status` is provided in the request body.

---

## No mock data

The following patterns are absent from all `app/`, `lib/`, and `components/` files:

- Inline `const fields = [...]` arrays
- Static JSON imports used as primary data source
- Hardcoded `return { id: 1, name: '...' }` stubs in data functions

All 7 API routes import exclusively from `@/lib/data`. `lib/data.ts` imports only from `@/lib/db` (no fallback stubs).

---

## Confirmed live data (2026-03-26)

- 19 operations in PostgreSQL (18 seed + 1 test write that survived server restart)
- All writes confirmed durable: `SELECT COUNT(*) FROM operations` = 19 after `pkill next dev`
