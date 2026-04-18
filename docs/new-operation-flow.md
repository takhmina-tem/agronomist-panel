# New Operation Flow
_Last updated: 2026-03-26_

## Entry point

`app/fields/[id]/page.tsx` (server component) renders a `<NewOperationButton>` client component above the timeline. The button opens a modal.

## Component

`components/new-operation-modal.tsx` — single self-contained client component. No external modal or form library.

Exported: `NewOperationButton({ fieldId: number, areaHa: number })`

## Flow

```
Field page
  └── [+ Новая запись] button
        │
        ▼
    Modal — Step 1: Type picker
        8 tiles (planting / inspection / fertilizer / irrigation /
                 crop_protection / desiccation / harvest / storage)
        │  user selects a type
        ▼
    Modal — Step 2: Form
        Common fields:
          - Дата операции (required, default = today)
          - Заголовок (required, pre-filled from type)
        Type-specific fields (see below)
        Notes textarea (optional)
        │  user clicks "Сохранить"
        ▼
    POST /api/operations
        │  success
        ▼
    "Операция сохранена. Обновляем страницу…"
    → modal closes → router.refresh() (re-runs server component, timeline updates)
```

## Per-type forms

| Type | Required fields | Notable behaviour |
|---|---|---|
| `planting` | seedClass, fraction, rateTHa, depthCm | soilTemperature preserved |
| `inspection` | emergencePct | disease scores 0–5 each; max score auto-written to `fields.disease_status` |
| `fertilizer` | product, doseKgHa, phase | N/P/K auto-calculated from `fertilizers` reference table; shown as read-only |
| `irrigation` | type, volumeMm | — |
| `crop_protection` | product, protectionType, dose, phase | — |
| `desiccation` | product, dose, dryingPct | — |
| `harvest` | grossTons, yieldTHa | yieldTHa auto-calculated as grossTons / areaHa when grossTons is entered |
| `storage` | airTemp, massTemp, humidity | — |

## Validation

Client-side validation runs before the POST. Errors are shown inline in the modal footer. The save button is disabled while the request is in flight.

## Server update strategy

After a successful save, `router.refresh()` is called. This re-runs the server component `getFieldById()` and returns fresh data including the new operation in the timeline — no manual page reload required.

## Fertilizer auto-calc

`/api/references/fertilizers` is fetched once when the component mounts. When the user selects a product and enters a dose, N/P/K are computed as:

```
nKgHa = fertilizer.n_pct × doseKgHa / 100
pKgHa = fertilizer.p_pct × doseKgHa / 100
kKgHa = fertilizer.k_pct × doseKgHa / 100
```

The computed values are shown as read-only fields and stored in the JSONB payload.

## Disease status propagation

For `inspection` operations, the maximum of `lateBlight`, `alternaria`, `rhizoctonia`, `commonScab` is sent as `disease_status` in the POST body. `addOperation()` in `lib/data.ts` then runs:

```sql
UPDATE fields SET disease_status = $1, updated_at = now() WHERE id = $2
```

This keeps the field card's disease badge current after each inspection.

## Files changed

| File | Change |
|---|---|
| `components/new-operation-modal.tsx` | Created — full modal + 8 forms |
| `app/fields/[id]/page.tsx` | Added `<NewOperationButton>` above timeline |

## Status: READY
