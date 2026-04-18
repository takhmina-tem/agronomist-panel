# Feature: Planting Operation
_Last updated: 2026-03-26_

## Status: READY

All layers are implemented and validated end-to-end.

---

## Data model

**Table:** `operations` (JSONB payload, `operation_type = 'planting'`)

**TypeScript interface:** `PlantingPayload` in `lib/operation-types.ts`

| Field | Type | Description |
|---|---|---|
| `seedClass` | string | Семенной класс: элита / первая репродукция / вторая репродукция |
| `fraction` | `'35-55' \| '55-70' \| '70+'` | Фракция клубней |
| `rateTHa` | number | Норма посадки, т/га |
| `depthCm` | number | Глубина посадки, см |
| `rowSpacingCm` | number | Ширина ряда, см |
| `soilTemperature` | number | Температура почвы на глубине посадки, °C ✓ |
| `starterFertilizer` | string | Стартовое удобрение (название из справочника) |

Soil temperature is explicitly preserved as required by the product vision.

---

## Form (Screen 4)

**Location:** `components/new-operation-modal.tsx` → `PlantingForm` component

Entry point: "Новая запись" button on the field screen → Step 1 type picker → "Посадка" tile → form.

| Field | Input type | Validation |
|---|---|---|
| Дата операции | `<input type="date">` | required |
| Заголовок | text | required |
| Семенной класс | `<select>` (элита / первая репродукция / вторая репродукция) | required |
| Фракция клубней | `<select>` (35-55 / 55-70 / 70+) | required |
| Норма посадки | `<input type="number">` (т/га) | required |
| Глубина посадки | `<input type="number">` (см) | required |
| Ширина ряда | `<input type="number">` (см) | optional |
| Температура почвы | `<input type="number">` (°C) | optional |
| Стартовое удобрение | text | optional |
| Примечания | textarea | optional |

---

## Save flow

1. Client-side validation fires on "Сохранить"
2. `buildPayload('planting', fields, [])` constructs the typed `PlantingPayload` object (strings → numbers coerced)
3. `POST /api/operations` with body:
   ```json
   {
     "field_id": 1,
     "operation_type": "planting",
     "operation_date": "2026-04-18",
     "title": "Посадка",
     "payload": { "seedClass": "элита", "fraction": "35-55", ... }
   }
   ```
4. `addOperation()` in `lib/data.ts` runs `INSERT INTO operations ... RETURNING ...`
5. On success: modal closes, `router.refresh()` re-runs the server component, new entry appears in the timeline

---

## Timeline rendering (Screen 2)

**Location:** `components/timeline.tsx` → `PlantingCard` component

Renders a structured definition list in the payload card:

```
Семенной класс   элита
Фракция          35–55 мм
Норма посадки    2.8 т/га
Глубина          8 см
Ширина ряда      75 см
Темп. почвы      9.8 °C
Стартовое уд.    NPK 16-16-16
```

Fields with zero or empty values are hidden. The fraction value is displayed with human-readable label ("35–55 мм") rather than the raw DB string ("35-55").

---

## Read/write field mapping

| Form field | `buildPayload` key | `PlantingPayload` field | `PlantingCard` label |
|---|---|---|---|
| Семенной класс select | `seedClass` | `seedClass` | Семенной класс |
| Фракция select | `fraction` | `fraction` | Фракция |
| Норма посадки input | `rateTHa` | `rateTHa` | Норма посадки |
| Глубина input | `depthCm` | `depthCm` | Глубина |
| Ширина ряда input | `rowSpacingCm` | `rowSpacingCm` | Ширина ряда |
| Температура почвы input | `soilTemperature` | `soilTemperature` | Темп. почвы |
| Стартовое удобрение input | `starterFertilizer` | `starterFertilizer` | Стартовое уд. |

All keys are identical between form, payload builder, TypeScript interface, and renderer — no mapping drift.

---

## Validated against

- 3 existing seed planting operations in PostgreSQL confirmed to render correctly with the new `PlantingCard`
- `tsc --noEmit` — clean
- `next lint` — no warnings
- `next build` — compiled successfully

---

## Files changed

| File | Change |
|---|---|
| `components/new-operation-modal.tsx` | `PlantingForm` + `buildPayload('planting')` + `validate('planting')` — existed, verified complete |
| `components/timeline.tsx` | Replaced `JSON.stringify` fallback with structured renderers for all 8 types; `PlantingCard` is the primary implementation |
| `docs/feature-planting.md` | This document |
