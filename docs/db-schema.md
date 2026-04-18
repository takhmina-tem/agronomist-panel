# Database Schema
_Last updated: 2026-03-26_

---

## Schema decision: JSONB vs typed detail tables

**Decision: `operations` table with JSONB `payload`. No typed detail tables.**

CLAUDE.md prefers typed detail tables as the default. This decision documents why JSONB is the correct choice for this codebase.

| Concern | JSONB | Typed detail tables |
|---|---|---|
| Timeline query | Single `SELECT * FROM operations WHERE field_id = $1` | 8-way `LEFT JOIN` across 8 tables, or `UNION ALL` of 8 queries |
| Insert (any operation type) | One `INSERT INTO operations` | Two `INSERT`s: base row + type-specific row |
| Future operation types | Add new payload keys, no migration | New table + migration |
| Analytics queries | `payload->>'field'::numeric` — supported by PostgreSQL | `JOIN` to typed table |
| Type safety | TypeScript payload types in `lib/operation-types.ts` | DB column constraints |
| Deployed state | Schema already live with 18 seeded operations in JSONB | Would require DROP + recreate |

**Application-layer safety:** `lib/operation-types.ts` defines TypeScript interfaces for all 8 payload types (`PlantingPayload`, `InspectionPayload`, etc.). Each form validates against these types before writing. The database stores well-structured JSONB, not arbitrary JSON.

---

## Tables

### `schema_migrations`
Migration tracking table. Managed by `scripts/migrate.js`.

| Column | Type | Notes |
|---|---|---|
| `version` | text PK | Filename without .sql extension |
| `applied_at` | timestamptz | Set automatically on insert |

---

### `varieties`
Reference table. Screen 15 (Справочник сортов).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | e.g. Коломба, Гала, Ред Скарлетт |
| `maturity_group` | text NOT NULL | ранний \| среднеранний \| среднепоздний |
| `purpose_type` | text NOT NULL | столовый \| чипсы \| фри |
| `yield_potential_t_ha` | numeric(6,2) | Used for comparison and forecasting |

Used by:
- `fields.variety_id → varieties.id`
- Planting form dropdown
- Field list display
- Variety dictionary page

---

### `fertilizers`
Reference table. Screen 16 (Справочник удобрений).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | e.g. NPK 16-16-16, Калимагнезия |
| `fertilizer_type` | text NOT NULL | комплексное \| калийное \| листовое |
| `n_pct` | numeric(5,2) | Nitrogen %, used for N auto-calc |
| `p_pct` | numeric(5,2) | Phosphorus %, used for P auto-calc |
| `k_pct` | numeric(5,2) | Potassium %, used for K auto-calc |
| `purpose_note` | text | Optional usage note |

Used by:
- Fertilizer form: product dropdown; N/P/K auto-calculated as `dose × pct / 100`
- Not FK-linked to operations (name stored in payload for historical preservation)

---

### `fields`
Core domain entity. Screen 1, 2, 12, 13.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | e.g. Поле Север-1 |
| `area_ha` | numeric(8,2) NOT NULL | Field area |
| `variety_id` | int NOT NULL → varieties | |
| `current_phase` | text NOT NULL | Current crop phase (see phases below) |
| `disease_status` | int NOT NULL DEFAULT 0 | Overall disease score 0–5 |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | Updated when phase or disease changes |

**current_phase values** (potato production cycle):
`посадка` → `всходы` → `смыкание` → `бутонизация` → `цветение` → `клубнеобразование` → `десикация` → `уборка`

**Constraint:** `disease_status BETWEEN 0 AND 5`

---

### `operations`
Core event log. All 8 operation types. Screens 2–11.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `field_id` | int NOT NULL → fields ON DELETE CASCADE | |
| `operation_type` | text NOT NULL | See operation types below |
| `operation_date` | date NOT NULL | ISO date of the operation |
| `title` | text NOT NULL | Human-readable description |
| `notes` | text | Optional agronomist notes |
| `payload` | jsonb NOT NULL DEFAULT '{}' | Typed per operation_type; see below |
| `photo_url` | text | Future: S3/CDN URL |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**operation_type values:**

| Value | Screen | Description |
|---|---|---|
| `planting` | 4 | Potato planting with seed details |
| `inspection` | 5 | Regular field inspection, disease scoring |
| `fertilizer` | 6 | Any fertilizer application with N/P/K |
| `irrigation` | 7 | Irrigation event |
| `crop_protection` | 8 | Fungicide / herbicide / insecticide |
| `desiccation` | 9 | Pre-harvest haulm drying |
| `harvest` | 10 | Harvest with calibration data |
| `storage` | 11 | Storage chamber monitoring |

---

## JSONB payload schemas

Each payload type is defined as a TypeScript interface in `lib/operation-types.ts`.

### `planting` payload
```json
{
  "seedClass": "элита",
  "fraction": "35-55",
  "rateTHa": 2.8,
  "depthCm": 8,
  "rowSpacingCm": 75,
  "soilTemperature": 9.8,
  "starterFertilizer": "NPK 16-16-16"
}
```
TypeScript: `PlantingPayload`

### `inspection` payload
```json
{
  "emergencePct": 91,
  "plantDensity": 44,
  "stemsPerPlant": 4.1,
  "haulmHeightCm": 18,
  "weeds": 1,
  "lateBlight": 1,
  "alternaria": 0,
  "rhizoctonia": 1,
  "commonScab": 1,
  "stress": "dry"
}
```
TypeScript: `InspectionPayload`
Key analytics fields: `lateBlight` (disease trend chart), `plantDensity`, `stemsPerPlant` (field list card)

### `fertilizer` payload
```json
{
  "product": "Калимагнезия",
  "doseKgHa": 180,
  "phase": "бутонизация",
  "applicationMethod": "вразброс",
  "nKgHa": 0,
  "pKgHa": 0,
  "kKgHa": 57.6
}
```
TypeScript: `FertilizerPayload`
`nKgHa`, `pKgHa`, `kKgHa` are auto-calculated from the `fertilizers` reference table: `dose × n_pct / 100`.

### `irrigation` payload
```json
{
  "type": "sprinkler",
  "volumeMm": 30,
  "waterEc": 0.7,
  "goal": "поддержание влаги"
}
```
TypeScript: `IrrigationPayload`
`volumeMm` used for moisture_risk derivation on field card and irrigation analytics.

### `crop_protection` payload
```json
{
  "product": "Ревус",
  "protectionType": "fungicide",
  "dose": "0.6 л/га",
  "weather": "ветер 2 м/с, без осадков",
  "phase": "цветение"
}
```
TypeScript: `CropProtectionPayload`
`protectionType` used for fungicide window chart in per-field analytics.

### `desiccation` payload
```json
{
  "product": "Реглон",
  "dose": "2 л/га",
  "dryingPct": 78,
  "haulmColor": "желто-зеленый"
}
```
TypeScript: `DesiccationPayload`

### `harvest` payload
```json
{
  "grossTons": 1040,
  "yieldTHa": 42.4,
  "fraction3555": 38,
  "fraction5570": 44,
  "fraction70plus": 18,
  "wastePct": 4.6
}
```
TypeScript: `HarvestPayload`
Calibration fields (`fraction3555`, `fraction5570`, `fraction70plus`) surfaced in `ComparisonRow.calibration`.

### `storage` payload
```json
{
  "airTemp": 3.8,
  "massTemp": 4.1,
  "humidity": 92,
  "lossPct": 2.4,
  "storageDisease": "none"
}
```
TypeScript: `StoragePayload`

---

## Indexes

| Table | Index | Purpose |
|---|---|---|
| `operations` | `idx_operations_field_date (field_id, operation_date DESC)` | Timeline queries (ORDER BY date) |
| `operations` | `idx_operations_type (operation_type)` | Global analytics by type |
| `operations` | `idx_operations_field_type (field_id, operation_type)` | Per-field analytics: filter by type |
| `fields` | `fields_variety_id_fkey` | Auto-created by FK |

---

## Entity relationships

```
varieties (1) ──< fields (1) ──< operations
fertilizers                        (many)
  └── referenced by name in
      operations.payload->>'product'
      (intentionally not FK — preserves history if fertilizer is renamed)
```

---

## Screen → table mapping

| Screen | Tables read | Write |
|---|---|---|
| 1. Список полей | fields, varieties, operations (LATERAL) | — |
| 2. Экран поля | fields, varieties, operations | — |
| 3. Новая запись | — | operations (INSERT) |
| 4–11. Operation forms | varieties, fertilizers (for dropdowns) | operations (INSERT) + fields (UPDATE) |
| 12. Аналитика поля | operations (filtered by field_id) | — |
| 13. Сравнение полей | fields, varieties, operations (aggregated) | — |
| 15. Справочник сортов | varieties | varieties (future CRUD) |
| 16. Справочник удобрений | fertilizers | fertilizers (future CRUD) |

---

## Migrations applied

| File | Content |
|---|---|
| `001_initial_schema.sql` | schema_migrations, varieties, fertilizers, fields, operations, 2 indexes |
| `002_add_field_timestamps.sql` | fields.created_at, fields.updated_at, idx_operations_field_type |

---

## Data access layer

All reads and writes go through `lib/data.ts` using `lib/db.ts` (`pg.Pool` + `query()` helper).

| Function | Returns | Notes |
|---|---|---|
| `getFields()` | `FieldCard[]` | LATERAL joins for last op + last inspection + last irrigation |
| `getFieldById(id)` | `FieldDetails` | Field + variety + timeline; metrics derived in TypeScript |
| `getComparison()` | `ComparisonRow[]` | Aggregates + calibration from harvest payload |
| `getDashboardSummary()` | `{summary, diseaseTrend, yieldVsPotassium}` | 3 separate queries |
| `getVarieties()` | `Variety[]` | Simple SELECT |
| `getFertilizers()` | `Fertilizer[]` | Simple SELECT; used for NPK auto-calc |
| `addOperation(body)` | `TimelineEntry` | INSERT + conditional UPDATE on fields |
| `createField(input)` | `{id}` | INSERT into fields |
