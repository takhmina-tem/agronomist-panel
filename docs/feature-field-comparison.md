# Field Comparison Screen — Feature Documentation

## Status: READY

All columns including calibration are implemented and PostgreSQL-backed.

---

## What the Screen Shows

The comparison table is rendered on the homepage (`/`) via `<ComparisonTable rows={comparison} />`.
It gives a side-by-side view of every field across 8 agronomic dimensions in a single row per field.

| Column | Source | Notes |
|---|---|---|
| Поле | `fields.name` | Sorted alphabetically |
| Сорт | `varieties.name` via JOIN | |
| Фаза | `fields.current_phase` | Updated by operation entry |
| Урожайность | Latest harvest `payload.yieldTHa` | `—` when no harvest yet |
| **Калибровка** | Latest harvest `payload.fraction3555/5570/70plus` | `—` when no harvest yet |
| K кг/га | SUM of fertilizer `payload.kKgHa` | Season total |
| Полив | SUM of irrigation `payload.volumeMm` | Season total in mm |
| Болезни | `fields.disease_status` | Colour-coded badge 0–5 |
| Десикация | COUNT of desiccation ops > 0 | Да / Нет |

---

## Calibration Column

### Data source

Calibration fractions come from the `harvest` operation payload:

```json
{
  "fraction3555":   38,   // % of tubers 35–55 mm
  "fraction5570":   44,   // % of tubers 55–70 mm
  "fraction70plus": 18    // % of tubers 70+ mm
}
```

These are entered by the agronomist in the Harvest form and stored as JSONB in `operations.payload`.

### Aggregation rule — multiple harvests

If a field has more than one harvest record, the query takes the **most recent harvest** by `operation_date DESC, id DESC LIMIT 1`. This is the agronomically correct rule: the latest harvest is the final-season result. Earlier harvest records (e.g. partial early-lift) are visible in the field timeline but do not affect the comparison.

### Display

Each cell renders three stacked lines with colour coding that is consistent with the calibration bar in the field analytics screen:

- **Amber** — 35–55 mm (seed/small fraction)
- **Emerald** — 55–70 mm (prime commercial fraction)
- **Blue** — 70+ mm (large fraction)

Percentage values are shown alongside the range label. When no harvest exists for a field, the cell shows `—`.

### Live data (seed)

```
Поле Север-1:  38% 35–55 · 44% 55–70 · 18% 70+   (yield 42.4 т/га)
Поле Восток-2: —                                   (no harvest yet)
Поле Юг-3:     31% 35–55 · 48% 55–70 · 21% 70+   (yield 43.0 т/га)
```

---

## SQL (getComparison lateral join)

```sql
LEFT JOIN LATERAL (
  SELECT
    (payload->>'yieldTHa')::numeric     AS yield_t_ha,
    (payload->>'fraction3555')::numeric AS fraction3555,
    (payload->>'fraction5570')::numeric AS fraction5570,
    (payload->>'fraction70plus')::numeric AS fraction70plus
  FROM  operations
  WHERE field_id = f.id AND operation_type = 'harvest'
  ORDER BY operation_date DESC, id DESC
  LIMIT 1
) harv ON true
```

The LATERAL pattern means zero extra round-trips: all fields are resolved in a single query.

---

## TypeScript Shape

```ts
// lib/types.ts
type HarvestCalibration = {
  pct3555:   number | null;
  pct5570:   number | null;
  pct70plus: number | null;
};

type ComparisonRow = {
  ...
  yield_t_ha:  number | null;
  calibration: HarvestCalibration | null;  // null = no harvest recorded
};
```

`calibration` is `null` when `yield_t_ha` is null (no harvest row exists). This is checked in `getComparison()` before mapping — if the LATERAL returns no row, all harvest columns are null and calibration is set to null.

---

## Files

| File | Role |
|---|---|
| `lib/data.ts` → `getComparison()` | SQL with LATERAL join; maps fractions into `HarvestCalibration` |
| `lib/types.ts` | `HarvestCalibration`, `ComparisonRow` |
| `components/comparison-table.tsx` | Renders calibration cell; falls back to `—` |
| `app/page.tsx` | Calls `getComparison()`, passes `rows` to `<ComparisonTable>` |

---

## Dependency Gaps

None for the current MVP. Potential future enhancements:

- **Visual calibration bar** — a mini stacked bar (like in the field analytics harvest card) could replace the three text lines for faster visual scanning across rows. Current text form is sufficient for MVP.
- **Multi-season comparison** — comparing calibration across seasons requires a `season` column on operations; not in scope now.
