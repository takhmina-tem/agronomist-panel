# Feature: Fertilization (Удобрение)

## Status: READY

All layers implemented and validated end-to-end.

---

## Purpose

The fertilization workflow lets agronomists record every nutrient application event
for a field. The agronomist selects a product from the fertilizer dictionary, enters
the dose, and the system automatically calculates the actual N, P₂O₅ and K₂O load
applied per hectare. Both the raw dose and the derived nutrient amounts are persisted
and used to drive seasonal NPK analytics on the field detail screen.

---

## Data model

Fertilization events are stored as operations with `operation_type = 'fertilizer'`
and a JSONB `payload` in the `operations` table.

### Payload shape (`lib/operation-types.ts: FertilizerPayload`)

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `product` | string | — | Fertilizer name — matches `fertilizers.name` |
| `doseKgHa` | number | кг/га | Physical dose applied |
| `phase` | string | — | Crop growth stage at time of application |
| `applicationMethod` | string | — | How it was applied (see enum below) |
| `nKgHa` | number | кг/га | **Derived** nitrogen load |
| `pKgHa` | number | кг/га | **Derived** P₂O₅ load |
| `kKgHa` | number | кг/га | **Derived** K₂O load |

**Application methods**: вразброс | ленточно | под культиватор | листовое | фертигация

### NPK calculation (`lib/npk.ts`)

```
nKgHa = round2(n_pct × doseKgHa / 100)
pKgHa = round2(p_pct × doseKgHa / 100)
kKgHa = round2(k_pct × doseKgHa / 100)
```

Rounding to 2 decimal places avoids floating-point representation noise
(e.g. `0.32 × 180 / 100 = 0.5760000000000001`).

The function is extracted as a pure TypeScript utility with no framework dependencies
so it can be unit-tested without mocking and reused in future analytics.

---

## Fertilizer dictionary

### Schema (`fertilizers` table in migration 001)

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | — |
| `name` | text | Display name, used as foreign key by value in payloads |
| `fertilizer_type` | text | комплексное \| калийное \| листовое |
| `n_pct` | numeric(5,2) | Nitrogen % |
| `p_pct` | numeric(5,2) | P₂O₅ % |
| `k_pct` | numeric(5,2) | K₂O % |
| `purpose_note` | text | Optional agronomic hint shown in the form |

### Seed data

| Name | Type | N% | P% | K% |
|------|------|----|----|----|
| NPK 16-16-16 | комплексное | 16 | 16 | 16 |
| Калимагнезия | калийное | 0 | 0 | 32 |
| Монокалийфосфат | листовое | 0 | 52 | 34 |

The `purpose_note` is shown as a contextual hint below the product selector in the
form when a product is selected.

---

## Read path

`lib/data.ts: getFieldById()` aggregates fertilizer operations for the season NPK totals:

```typescript
metrics: {
  total_n: fertOps.reduce((s, o) => s + num(o.payload.nKgHa), 0),
  total_p: fertOps.reduce((s, o) => s + num(o.payload.pKgHa), 0),
  total_k: fertOps.reduce((s, o) => s + num(o.payload.kKgHa), 0),
}
```

These totals feed the N / P / K metric cards on the field detail screen and are
available for future analytics queries.

Field comparison (`getComparison()`) also aggregates `kKgHa` per field via a SQL
lateral join on the JSONB payload.

---

## Write path

1. User opens "Новая запись" → selects "Удобрение"
2. **FertilizerForm** (`components/new-operation-modal.tsx`):
   - Selects product from dropdown (loaded from `/api/references/fertilizers`)
   - `purpose_note` hint is shown inline after selection
   - Enters dose (кг/га)
   - N / P₂O₅ / K₂O fields update live via `calcNpk()` — read-only preview
3. `buildPayload('fertilizer', ...)` calls `calcNpk()` to assemble the final payload
4. `POST /api/operations` → `lib/data.ts: addOperation()` → PostgreSQL INSERT
5. `router.refresh()` causes the server component to re-fetch; the new entry
   appears in the timeline and NPK metric cards update

---

## Timeline renderer (`components/timeline.tsx: FertilizerCard`)

Renders:
- Product name + dose
- Growth phase + application method
- NPK section (shown when any nutrient > 0): N / P₂O₅ / K₂O кг/га

---

## Tests

Test file: `lib/__tests__/npk.test.ts` — 12 tests covering:

| Test | Expectation |
|------|-------------|
| NPK 16-16-16 @ 100 kg/ha | N=P=K=16 |
| Калимагнезия @ 180 kg/ha | N=0, P=0, K=57.6 — matches seed field 1 |
| Монокалийфосфат @ 12 kg/ha | N=0, P=6.24, K=4.08 — matches seed field 2 |
| Калимагнезия @ 210 kg/ha | K=67.2 — matches seed field 3 |
| Zero dose | all zeros |
| Zero composition | all zeros |
| Floating-point rounding | 33.33% @ 10 = 3.33 (not 3.333…) |
| Fractional dose | 16% @ 2.5 = 0.4 |
| Large dose | 46% @ 500 = 230 |
| `formatNpk` compact label | `"N 29 / P 0 / K 58 кг/га"` |
| `formatNpk` rounding | rounds to integer |
| `formatNpk` zeros | `"N 0 / P 0 / K 0 кг/га"` |

Run with: `npm test`

---

## Files changed

| File | Change |
|------|--------|
| `lib/npk.ts` | **NEW** — pure `calcNpk()` + `formatNpk()` functions |
| `lib/__tests__/npk.test.ts` | **NEW** — 12 vitest tests |
| `vitest.config.ts` | **NEW** — minimal vitest config with `@/` alias |
| `package.json` | Added `vitest ^2.1.8`, `test` and `test:watch` scripts |
| `components/new-operation-modal.tsx` | FertilizerForm uses `calcNpk()`; `buildPayload` uses `calcNpk()`; added `'ленточно'` to applicationMethod options; shows `purpose_note` hint |

---

## Assumptions

- Fertilizer identity is matched by **name** (not id) because the payload stores
  the human-readable product name. This is safe as long as fertilizer names in the
  dictionary are unique (enforced by convention; a UNIQUE constraint can be added
  in a future migration).
- `nKgHa` / `pKgHa` / `kKgHa` in the payload represent N, P₂O₅ and K₂O respectively
  (not elemental P and K), consistent with standard agronomic reporting.
- The `fertilizer_type` field from the dictionary is NOT duplicated into the operation
  payload; it is derivable at read time from the dictionary by name lookup.

---

## NPK analytics readiness

Every fertilizer operation stored in the DB is immediately usable for seasonal NPK
aggregation because `nKgHa`, `pKgHa`, `kKgHa` are stored as explicit numeric fields
in the JSONB payload. Queries follow the pattern:

```sql
SUM((payload->>'nKgHa')::numeric)  AS total_n
SUM((payload->>'pKgHa')::numeric)  AS total_p
SUM((payload->>'kKgHa')::numeric)  AS total_k
```

No re-calculation from composition percentages is needed at query time.
