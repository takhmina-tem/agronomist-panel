# Dictionary Pages — Feature Documentation

## Status: READY

Both dictionary pages are implemented, PostgreSQL-backed, and accessible via the homepage navigation.

---

## Routes

| Screen | URL | Component |
|---|---|---|
| Screen 15 — Сорта | `/dictionaries/varieties` | `app/dictionaries/varieties/page.tsx` |
| Screen 16 — Удобрения | `/dictionaries/fertilizers` | `app/dictionaries/fertilizers/page.tsx` |

Navigation links are on the homepage (`/`) in the "Справочники" section at the bottom of the page.

---

## Architecture

Both pages are Next.js server components. They call the data layer directly — no client-side fetch, no loading state needed.

```
PostgreSQL: varieties / fertilizers tables
  └─ lib/data.ts: getVarieties() / getFertilizers()
       └─ app/dictionaries/[name]/page.tsx  ← server component
```

`getVarieties()` and `getFertilizers()` are simple `SELECT *` queries, ordered by name. No joins required — both tables are self-contained reference data.

---

## Screen 15: Сорта картофеля (`/dictionaries/varieties`)

### Columns shown

| Column | DB field | Notes |
|---|---|---|
| Сорт | `varieties.name` | Bold, primary identifier |
| Группа спелости | `varieties.maturity_group` | ранний / среднеранний / среднеспелый etc. |
| Назначение | `varieties.purpose_type` | столовый / чипсы / фри |
| Потенциал урожайности | `varieties.yield_potential_t_ha` | Displayed as `X т/га` |

All 4 columns in the `varieties` table are shown. No attributes are omitted.

### Live data (seed)

| Сорт | Группа спелости | Назначение | Потенциал |
|---|---|---|---|
| Гала | среднеранний | чипсы | 52 т/га |
| Коломба | ранний | столовый | 44 т/га |
| Ред Скарлетт | ранний | столовый | 48 т/га |

### Data source

```ts
// lib/data.ts
export async function getVarieties(): Promise<Variety[]> {
  return query<Variety>(
    'SELECT id, name, maturity_group, purpose_type, yield_potential_t_ha FROM varieties ORDER BY name'
  );
}
```

---

## Screen 16: Удобрения (`/dictionaries/fertilizers`)

### Columns shown

| Column | DB field | Display |
|---|---|---|
| Название | `fertilizers.name` | Bold |
| Тип | `fertilizers.fertilizer_type` | комплексное / калийное / листовое |
| N% | `fertilizers.n_pct` | Blue — matches NPK badge colour in forms |
| P% | `fertilizers.p_pct` | Violet |
| K% | `fertilizers.k_pct` | Emerald |
| Примечание | `fertilizers.purpose_note` | Application context; `—` when null |

All 6 user-visible columns in the `fertilizers` table are shown. The N/P/K colour coding is consistent with the fertilizer form's NPK auto-calc display and the field analytics NPK chart.

### Live data (seed)

| Название | Тип | N% | P% | K% | Примечание |
|---|---|---|---|---|---|
| Калимагнезия | калийное | 0 | 0 | 32 | Качество клубней и калибр |
| Монокалийфосфат | листовое | 0 | 52 | 34 | Поддержка в клубнеобразовании |
| NPK 16-16-16 | комплексное | 16 | 16 | 16 | Стартовое питание при посадке |

### Data source

```ts
// lib/data.ts
export async function getFertilizers(): Promise<Fertilizer[]> {
  return query<Fertilizer>(
    'SELECT id, name, fertilizer_type, n_pct, k_pct, p_pct, purpose_note FROM fertilizers ORDER BY name'
  );
}
```

The fertilizer dictionary is also used at runtime by the operation entry modal (`new-operation-modal.tsx`) to populate the product dropdown and drive NPK auto-calculation (`lib/npk.ts`). The dictionary page and the form share the same data source.

---

## Navigation entry points

The homepage (`app/page.tsx`) has a "Справочники" section at the bottom with two link buttons:

```tsx
<Link href="/dictionaries/varieties">
  <BookOpen size={16} /> Сорта картофеля
</Link>
<Link href="/dictionaries/fertilizers">
  <FlaskConical size={16} /> Удобрения
</Link>
```

Both pages include a back-arrow link (`← Назад`) that returns to `/`.

---

## Files

| File | Role |
|---|---|
| `app/dictionaries/varieties/page.tsx` | Screen 15 — varieties table |
| `app/dictionaries/fertilizers/page.tsx` | Screen 16 — fertilizers table |
| `lib/data.ts` → `getVarieties()` | DB query for varieties |
| `lib/data.ts` → `getFertilizers()` | DB query for fertilizers |
| `lib/types.ts` → `Variety`, `Fertilizer` | TypeScript shapes |
| `app/page.tsx` | Homepage nav links to both pages |

---

## Dependency Gaps

None for current MVP. Potential future enhancements:

- **Fields using variety** — a "Используется на полях" count column on the varieties page could show how many active fields use each variety (requires a JOIN with `fields`).
- **NPK composition bar** — a mini visual bar showing relative N/P/K proportions could replace the three separate percentage columns for faster scanning.
- **Add / edit** — the dictionaries are read-only for now. Adding new varieties or fertilizers requires direct DB access or a future admin form.
