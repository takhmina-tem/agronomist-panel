# Feature: Variety-Adaptive Phases

## Status: READY

---

## Problem

The phase dropdown in `FertilizerForm` and `CropProtectionForm` previously showed all 8 phases
for every field regardless of variety maturity. Early varieties (`ранний`) do not require
desiccation — they dry down naturally before harvest — so offering "десикация" as an option
for early-variety fields was agronomically incorrect.

---

## Rule implemented

| Maturity group | Phase list |
|---|---|
| `ранний` | посадка · всходы · смыкание · бутонизация · цветение · клубнеобразование · **уборка** (7 phases; десикация excluded) |
| `среднеранний`, `среднеспелый`, `среднепоздний`, `поздний`, or any other value | All 8 phases including десикация |

The rule is encoded in `getPhasesForMaturity(maturityGroup: string): string[]` inside
`components/new-operation-modal.tsx`. Any value that is not `'ранний'` gets the full list —
this is intentionally permissive; unknown or blank maturity groups default to safe behaviour.

---

## Files changed

### `components/new-operation-modal.tsx`
- Renamed `PHASES` → `PHASES_FULL` (internal constant; no export)
- Added `getPhasesForMaturity(maturityGroup)` function
- Added `phases: string[]` to `FormProps` type
- Added `maturityGroup?: string` prop to `NewOperationButton` (optional, defaults to `''`)
- Computes `const phases = getPhasesForMaturity(maturityGroup)` before `formProps`
- `formProps` now includes `phases`
- `FertilizerForm` destructures and uses `phases` instead of `PHASES`
- `CropProtectionForm` destructures and uses `phases` instead of `PHASES`

### `app/fields/[id]/page.tsx`
- `NewOperationButton` now receives `maturityGroup={data.field.maturity_group}`
- `data.field.maturity_group` was already returned by `getFieldById()` SELECT

---

## Design decisions

### Only early varieties suppress дesiccation
Mid-season and later varieties are routinely desiccated in Kazakhstan practice to synchronise
maturity. Only `ранний` is the clear exception. Finer distinctions (e.g., `среднеранний`
sometimes skipping) are left to agronomist judgement via the existing "Статус = Запланировано"
mechanism.

### Optional prop with default `''`
`maturityGroup` is an optional prop so that any callsite not yet passing it (e.g., tests,
Storybook) continues to work — it simply gets the full 8-phase list, which is the safe default.

### No migration required
This is purely a UI filtering change. The `phase` value is stored as free text in the JSONB
payload; existing records are unaffected.

---

## Validation

```
npm run typecheck  → PASS (0 errors)
npm run lint       → PASS (0 warnings)
```
