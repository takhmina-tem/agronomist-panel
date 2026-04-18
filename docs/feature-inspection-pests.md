# Feature: Potato Pest Support in Inspection

## Status: READY

## What was added

Two potato-specific insect pest fields added to the inspection workflow:

| Field | Russian label | Scientific name |
|---|---|---|
| `coloradoBeetle` | Колорадский жук | *Leptinotarsa decemlineata* |
| `wireworm` | Проволочник | *Agriotes spp.* |

Both use the same 0–5 severity scoring as existing disease fields:

| Score | Meaning |
|---|---|
| 0 | Не обнаружено |
| 1 | Единично (до 5%) |
| 2 | Слабо (5–15%) |
| 3 | Умеренно (15–30%) |
| 4 | Сильно (30–50%) |
| 5 | Критично (>50%) |

---

## Implementation

### No migration required
JSONB payload is additive. Existing inspection records have no `coloradoBeetle`/`wireworm` key; the `n()` helper in `lib/data.ts` returns `0` for missing numeric keys — safe default.

---

## Files changed

### `lib/operation-types.ts`
Added two optional fields to `InspectionPayload`:
```ts
/** Колорадский жук (Leptinotarsa decemlineata), балл 0–5 */
coloradoBeetle: number;
/** Проволочник (Agriotes spp.), балл 0–5 */
wireworm: number;
```

### `components/new-operation-modal.tsx`
- `InspectionForm` refactored to split into two labelled sections:
  - "Болезни (балл 0–5)" — existing 5 disease scores (lateBlight, alternaria, rhizoctonia, commonScab, weeds)
  - "Вредители (балл 0–5)" — new pest scores (coloradoBeetle, wireworm)
- `buildPayload('inspection', ...)` extended with `coloradoBeetle` and `wireworm`

### `components/timeline.tsx`
- `InspectionStats` (headline chip): `maxAll` now includes `coloradoBeetle` and `wireworm` in the max score; label updated from "Болезни X/5" to "Болезни/вред. X/5"; idle state updated to "Проблем нет"
- `InspectionDetail` (right-column panel): Split into two conditional sub-sections — "Болезни" (diseases only) and "Вредители" (pests only). Each section renders `ScoreBar` rows only when score > 0. Existing disease rendering unchanged.

---

## Data flow (end-to-end)

```
InspectionForm (modal)
  → buildPayload() → { coloradoBeetle: N, wireworm: N, ... }
  → POST /api/operations → addOperation()
  → operations.payload JSONB in PostgreSQL

getFieldById() / getFieldAnalytics()
  → payload returned as Record<string, unknown>
  → cast to InspectionPayload in timeline

timeline.tsx
  → InspectionStats: includes pest scores in risk chip
  → InspectionDetail: renders separate "Вредители" section
```

---

## Validation

```
npm run typecheck  → PASS (0 errors)
npm run lint       → PASS (0 warnings)
npm test           → PASS (12/12)
```

---

## Backward compatibility

Existing seeded inspection records (3 records in `db/seed.sql`) do not have `coloradoBeetle` or `wireworm` keys in their JSONB payloads. The timeline renders pest sections only when `score > 0`, so existing records show no pest section — correct behaviour.

---

## What remains for full PDF compliance on inspection

- Photo attachment in the modal (shared gap across all operation types — documented in `docs/pdf-edge-audit.md`)
- Operation-level status field (shared gap — same doc)
