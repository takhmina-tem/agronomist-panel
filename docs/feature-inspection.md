# Feature: Field Inspection (Осмотр поля)

## Status: READY

All layers implemented and validated end-to-end.

---

## Purpose

The field inspection workflow lets agronomists record periodic field walkthroughs.
Each inspection captures plant health metrics, disease pressure on a 0–5 scale,
and the type of abiotic stress. Results are persisted to PostgreSQL and immediately
visible in the field timeline.

---

## Data model

Inspections are stored as operations with `operation_type = 'inspection'` and a JSONB
`payload` in the `operations` table. No separate detail table is used (see docs/db-schema.md
for the JSONB vs. typed-tables justification).

### Payload shape (`lib/operation-types.ts: InspectionPayload`)

| Field | Type | Unit / range | Description |
|-------|------|-------------|-------------|
| `emergencePct` | number | 0–100 % | Field emergence |
| `plantDensity` | number | шт/га | Plant stand density |
| `stemsPerPlant` | number | шт | Average stems per plant |
| `haulmHeightCm` | number | см | Haulm (canopy) height |
| `weeds` | number | 0–5 | Weed infestation score |
| `lateBlight` | number | 0–5 | Late blight (*Phytophthora infestans*) |
| `alternaria` | number | 0–5 | Alternaria blight |
| `rhizoctonia` | number | 0–5 | Rhizoctonia canker |
| `commonScab` | number | 0–5 | Common scab |
| `stress` | enum | none\|dry\|wet\|heat | Abiotic stress type |

### Disease score scale

| Score | Interpretation |
|-------|---------------|
| 0 | Not detected |
| 1 | Sporadic (< 5% plants affected) |
| 2 | Low (5–15%) |
| 3 | Moderate (15–30%) |
| 4 | High (30–50%) |
| 5 | Critical (> 50%) |

---

## Database interaction

### Read path

`lib/data.ts: getFieldById()` fetches all operations for a field ordered by date DESC.
The timeline renders each inspection via `InspectionCard` in `components/timeline.tsx`.

Two SQL queries also aggregate inspection data for the field list view:

```sql
-- Latest inspection: plant density + stems for field list card
LEFT JOIN LATERAL (
  SELECT
    (payload->>'plantDensity')::numeric  AS plant_density,
    (payload->>'stemsPerPlant')::numeric AS stems_per_plant
  FROM   operations
  WHERE  field_id = f.id AND operation_type = 'inspection'
  ORDER  BY operation_date DESC, id DESC
  LIMIT  1
) insp ON true
```

### Write path

1. User fills the InspectionForm in the modal
2. `buildPayload('inspection', fields, [])` assembles the typed JSONB object
3. `POST /api/operations` receives the body
4. `lib/data.ts: addOperation()` inserts into `operations` and updates `fields.disease_status`
   to `MAX(lateBlight, alternaria, rhizoctonia, commonScab)`
5. `router.refresh()` triggers a Next.js server-side re-fetch; the new entry appears in the timeline

---

## UI components

### Form — `components/new-operation-modal.tsx: InspectionForm`

- `emergencePct` — number input, required
- `plantDensity`, `stemsPerPlant`, `haulmHeightCm` — number inputs, optional
- Disease scores (weeds, lateBlight, alternaria, rhizoctonia, commonScab) — **select dropdowns**
  with descriptive labels ("0 — не обнаружено", "1 — единично (до 5%)", …)
  This constrains values to 0–5 and makes field-level interpretation clear without agronomic training
- `stress` — select: none | dry | wet | heat

**Validation**: requires `emergencePct`. Disease scores are constrained by the select, so
out-of-range values are structurally impossible.

### Timeline renderer — `components/timeline.tsx: InspectionCard`

Renders all inspection data in a two-section layout:

1. **Plant metrics**: emergence %, density, stems/plant, haulm height
2. **Disease section** (always shown):
   - Risk badge: "Болезней не обнаружено" / "Низкий риск" / "Умеренный риск" / "Высокий риск болезней"
   - Color-coded score chips for any non-zero disease: emerald (1), amber (2), orange (3), red (4–5)
3. **Stress** — only shown when stress ≠ 'none'

---

## Side effects

When an inspection is saved the field's `disease_status` column is automatically updated
to `MAX(lateBlight, alternaria, rhizoctonia, commonScab)`. This value drives:
- The disease badge color on the field detail header
- The alert count on the dashboard
- The disease column in the field comparison table

---

## Assumptions

- `plantDensity` is stored and displayed in шт/га (not тыс. шт/га). Seed data corrected
  to reflect realistic values (≈ 41 000–46 000 шт/га).
- Weeds are tracked but deliberately excluded from `disease_status` since weed pressure
  is a separate agronomic concern from crop disease risk.
- One inspection per field visit is sufficient for MVP; there is no constraint preventing
  multiple inspections per day.

---

## Files changed (this feature)

| File | Change |
|------|--------|
| `components/new-operation-modal.tsx` | Disease score inputs → descriptive selects |
| `components/timeline.tsx` | InspectionCard: ScoreChip + risk badge |
| `db/seed.sql` | Fixed `plantDensity` from 44/41/46 → 44000/41000/46000 |
| `lib/operation-types.ts` | Reference only (no change) |
| `app/api/operations/route.ts` | Reference only (no change) |
| `lib/data.ts` | Reference only (no change) |
