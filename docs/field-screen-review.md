# Field Screen Review

## Review scope

`app/fields/[id]/page.tsx` — the per-field detail screen, covering:
- Field header and key info display
- Operation creation entry point
- Form save flow
- Structured timeline readability
- Analytics visibility and usability
- Loading/error/empty states
- Russian label and terminology consistency
- Raw technical data leakage

---

## Findings and actions taken

### Bug fixed — `hasAnalytics` did not include harvest

**Before:** a field that had only a harvest operation would not show the analytics section
(harvest summary card, calibration bar) because `hasAnalytics` only checked the four
event arrays (`npkEvents`, `irrigationEvents`, `diseasePoints`, `protectionEvents`).

**Fix applied** (`app/fields/[id]/page.tsx`):
```tsx
const hasAnalytics =
  analytics.npkEvents.length > 0 ||
  analytics.irrigationEvents.length > 0 ||
  analytics.diseasePoints.length > 0 ||
  analytics.protectionEvents.length > 0 ||
  analytics.harvest !== null;   // ← added
```

---

### Bug fixed — storage badge rendered "—%" when no storage operation

**Before:** `{data.metrics.storage_loss_pct ?? '—'}%` produced the string `—%` when
the field had no storage operation — grammatically incorrect.

**Fix applied:**
```tsx
{data.metrics.storage_loss_pct !== null && data.metrics.storage_loss_pct !== undefined
  ? <Badge tone="warning">Потери в хранении {data.metrics.storage_loss_pct}%</Badge>
  : <Badge tone="default">Хранение: нет данных</Badge>
}
```
Now shows "Хранение: нет данных" (neutral badge) when the value is absent, and
"Потери в хранении X%" only when a real value exists.

---

## Areas reviewed and found OK

### Field header
- Field name as `<h1>`, area/variety/maturity/purpose as subtitle — clear.
- Phase badge, disease status badge (colour-coded by score), yield and storage badges — all present and meaningful.
- Gradient card matches visual system.

### Operation creation entry point
- `<NewOperationButton fieldId=… areaHa=… />` is prominently placed above the timeline.
- Button opens the 8-form modal (`components/new-operation-modal.tsx`, 803 lines).
- Each form has validation and saves via `POST /api/operations`.
- On success: `router.refresh()` refreshes server component data — timeline updates live.

### Forms save flow
- Fertilizer N/P/K auto-calculation works from the fertilizer dictionary.
- Inspection form propagates `disease_status` to the field record.
- All 8 operation types have dedicated forms with Russian labels throughout.
- No raw JSON editors exposed to users.

### Timeline readability
- `components/timeline.tsx` (645 lines) renders each operation type with a dedicated stats component:
  `PlantingStats`, `InspectionStats`, `FertilizerStats`, `IrrigationStats`, `ProtectionStats`,
  `DesiccationStats`, `HarvestStats`, `StorageStats`.
- Score bars, calibration bars, and NPK inline display are all present.
- Month-separator rows and coloured spine dots aid navigation.
- Empty state: "Записей пока нет. Нажмите «Новая запись»…" — correct.
- No raw JSON payloads leaking to the UI.

### Analytics section
- Four chart components: `FieldNpkChart` (stacked N/P/K bar), `FieldIrrigationChart` (bar by date),
  `FieldDiseaseChart` (multi-series area), `FieldProtectionTable` (tabular with type badges).
- Harvest summary card with yield/gross/waste and calibration bar.
- All charts return `null` on empty data — no empty chart frames shown.
- Section is hidden entirely when there is no analytics data at all.

### KPI cards
- 4 metric cards (N kg/ha, P kg/ha, K kg/ha, irrigation mm) derived from real DB aggregates.
- Consistent icon/value layout, brand-50 icon backgrounds.

### Loading/error/empty states
- Empty timeline: handled by `Timeline` component with guidance text.
- Invalid field ID: `getFieldById` throws an error that propagates as a Next.js 500.
  Not a graceful 404, but this is a known pre-existing gap — not introduced here.

### Russian terminology
- All labels, badges, section titles, and chart axes use Russian throughout.
- No English UI strings found in the field screen or its direct component dependencies.

---

## Not fixed (larger scope than targeted fix)

### No graceful 404 for invalid field IDs
Navigating to `/fields/999` throws a 500 because `getFieldById` raises when the
field is not found. A proper fix requires either:
- Adding a Next.js `not-found.tsx` page in `app/fields/[id]/`
- Or wrapping with `notFound()` from `next/navigation`

Not done: low risk in practice (all navigation is from real field cards), and the
fix requires a separate small PR. Document only.

---

## Validation

```
npm run typecheck  → pass (0 errors)
npm test           → pass (12/12 tests)
```

---

## Status

| Area | Status |
|---|---|
| Field header display | READY |
| Operation entry point | READY |
| Form save flow | READY |
| Timeline readability | READY |
| Analytics visibility (bug fixed) | READY |
| Analytics charts | READY |
| Storage badge (bug fixed) | READY |
| Russian labels | READY |
| Raw data leakage | NONE FOUND |
| Graceful 404 for bad field ID | MISSING (documented) |

**Overall field screen: READY for MVP** (one non-blocking gap documented)
