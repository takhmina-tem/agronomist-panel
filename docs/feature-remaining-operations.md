# Feature: Remaining Operations (Irrigation, Protection, Desiccation, Harvest, Storage)

## Status per operation type

| Operation | Form UI | Validation | DB write | Timeline renderer | Analytics |
|-----------|---------|------------|----------|-------------------|-----------|
| Irrigation | READY | READY | READY | READY | READY |
| Plant protection | READY | READY | READY | READY | READY |
| Desiccation | READY | READY | READY | READY | READY |
| Harvest | READY | READY | READY | READY | READY |
| Storage | READY | READY | READY | READY | READY |

---

## 1. Irrigation (`irrigation`)

### Form fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | select | yes | `sprinkler` (Дождевание) or `drip` (Капельное) |
| volumeMm | number | yes | mm of water applied |
| waterEc | number | no | EC of irrigation water, мСм/см |
| goal | text | no | Free-form agronomic goal |

### Payload type: `IrrigationPayload` (`lib/operation-types.ts`)

### DB write path
`POST /api/operations` → `addOperation()` in `lib/data.ts` → `INSERT INTO operations`

### Analytics usage
- `getFields()`: derives `moisture_risk` from latest `volumeMm` (< 18 mm = high, < 28 = medium, ≥ 28 = low)
- `getFieldById()`: sums `volumeMm` across all irrigation ops → `metrics.irrigation_mm`
- `getComparison()`: sums `volumeMm` per field → comparison column

### Timeline renderer
`IrrigationCard` in `components/timeline.tsx` — shows type, volume, EC, goal.

---

## 2. Plant Protection / Crop Protection (`crop_protection`)

### Form fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| product | text | yes | Trade name of pesticide |
| protectionType | select | yes | `fungicide` / `herbicide` / `insecticide` |
| dose | text | yes | Dose with units, e.g. "0.6 л/га" |
| phase | select | yes | Growth phase at application (8 options) |
| weather | text | no | Weather conditions at time of spray |

### Payload type: `CropProtectionPayload` (`lib/operation-types.ts`)

### DB write path
`POST /api/operations` → `addOperation()` → `INSERT INTO operations`

### Analytics usage
- Disease dynamics indirectly tracked via inspection scores before/after protection operations
- Per-field analytics screen can derive fungicide windows from `operation_date` + `phase`

### Timeline renderer
`CropProtectionCard` in `components/timeline.tsx` — shows product, type badge, dose, phase, weather.

---

## 3. Desiccation (`desiccation`)

### Form fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| product | text | yes | Product name (e.g. Реглон) |
| dose | text | yes | Dose with units, e.g. "2 л/га" |
| dryingPct | number | yes | % of haulm that has dried at time of application |
| haulmColor | text | no | Colour of haulm post-treatment |

### Payload type: `DesiccationPayload` (`lib/operation-types.ts`)

### DB write path
`POST /api/operations` → `addOperation()` → `INSERT INTO operations`

### Analytics usage
- `getComparison()`: counts desiccation operations per field → `desiccation_done` boolean column

### Timeline renderer
`DesiccationCard` in `components/timeline.tsx` — shows product, dose, drying %, haulm colour.

---

## 4. Harvest (`harvest`)

### Form fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| harvestStartDate | date | no | First day of harvest window |
| harvestEndDate | date | no | Last day of harvest window |
| grossTons | number | yes | Total tonnes harvested |
| yieldTHa | number | yes | Yield t/ha — auto-calculated from grossTons ÷ field area |
| fraction3555 | number | no | Calibre 35–55 mm, % |
| fraction5570 | number | no | Calibre 55–70 mm, % |
| fraction70plus | number | no | Calibre 70+ mm, % |
| wastePct | number | no | Waste %, % |

Auto-calculation: entering `grossTons` triggers `yieldTHa = grossTons / field.area_ha`.

### Payload type: `HarvestPayload` (`lib/operation-types.ts`)

`harvestStartDate` and `harvestEndDate` are optional `string` fields (ISO date format).
Existing seed data without these fields remains valid — they are simply absent from those payloads.

### DB write path
`POST /api/operations` → `addOperation()` → `INSERT INTO operations`

### Analytics usage
- `getFieldById()`: latest harvest `yieldTHa` → `metrics.yield_t_ha`
- `getComparison()`: latest harvest yield + calibration fractions per field
- `getDashboardSummary()`: average yield across all fields

### Timeline renderer
`HarvestCard` in `components/timeline.tsx` — shows optional harvest period, gross tons, yield, waste %, and calibration fractions section when any fraction is non-zero.

---

## 5. Storage (`storage`)

### Form fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| airTemp | number | yes | Air temperature in storage, °C |
| massTemp | number | yes | Potato mass temperature, °C |
| humidity | number | yes | Relative humidity, % |
| lossPct | number | no | Storage losses over period, % |
| storageDisease | select | no | One of 7 known storage diseases or 'none' |

Known storage diseases (select options):
- `none` — Нет болезней
- `wet_rot` — Мокрая гниль
- `dry_rot` — Сухая гниль (фузариоз)
- `late_blight` — Фитофтороз
- `silver_scurf` — Серебристая парша
- `black_scurf` — Ризоктониоз
- `pink_rot` — Розовая гниль
- `other` — Другое (указать в примечаниях)

Existing seed data with `storageDisease: "none"` remains valid — the renderer and DB handle any string value.

### Payload type: `StoragePayload` (`lib/operation-types.ts`)

### DB write path
`POST /api/operations` → `addOperation()` → `INSERT INTO operations`

### Analytics usage
- `getFieldById()`: latest storage `lossPct` → `metrics.storage_loss_pct`

### Timeline renderer
`StorageCard` in `components/timeline.tsx` — shows temperatures, humidity, losses, and a human-readable disease label (mapped from slug via `STORAGE_DISEASE_LABELS`).

---

## Implementation notes

### Architecture decision: JSONB payloads retained
All operation payloads are stored as JSONB in `operations.payload`. Typed detail tables were not introduced because:
- Schema is already live with 18+ seeded operations
- 8-way JOIN for every timeline query would be more complex
- TypeScript interfaces in `lib/operation-types.ts` provide field-level guarantees at the application layer
- JSONB allows optional fields (e.g. `harvestStartDate`) without schema migrations

### Backward compatibility
- `HarvestPayload.harvestStartDate` and `harvestEndDate` are optional — existing records without them render correctly (the date section is hidden when both are absent).
- `StoragePayload.storageDisease` accepts any string — the renderer maps known slugs to Russian labels and passes through unknown values as-is, preserving compatibility with pre-existing `"none"` seed data.

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS — 0 errors |
| `npm run lint` | PASS — 0 warnings |
| `npm test` | PASS — 12/12 tests |
| `npm run build` | PASS — production build clean |
| DB migration status | migrations 001 + 002 applied; no new migration needed (JSONB, no schema change) |
| Seed status | 18 operations seeded including examples of all 5 types |

## Files changed

| File | Change |
|------|--------|
| `lib/operation-types.ts` | Added optional `harvestStartDate` / `harvestEndDate` to `HarvestPayload` |
| `components/new-operation-modal.tsx` | `HarvestForm`: added start/end date inputs; `StorageForm`: replaced plain text with structured disease select; `buildPayload`: includes harvest dates when present |
| `components/timeline.tsx` | `HarvestCard`: shows harvest period section when dates present; `StorageCard`: maps disease slugs to Russian labels via `STORAGE_DISEASE_LABELS` |
| `docs/feature-remaining-operations.md` | This document |
