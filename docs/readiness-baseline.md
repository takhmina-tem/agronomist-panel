# Readiness Baseline
_Audited: 2026-03-26 against Панель_Агронома_Видение.pdf_
_This is the starting point. Update after each implementation phase._

---

## Summary

| Category | Count |
|---|---|
| READY | 3 |
| PARTIAL | 7 |
| MISSING | 6 |
| BLOCKED | 1 |
| **Total screens** | **16 + infra** |

Overall MVP readiness: **~30%**
Core blocker: **all data is in-memory; no UI for data entry; no per-field analytics.**

---

## Screen-by-screen status

### Screen 1 — Список полей
**Status: PARTIAL**

| Field | Present |
|---|---|
| Название поля | ✅ |
| Площадь га | ✅ |
| Сорт | ✅ |
| Текущая фаза | ✅ |
| Последняя операция | ✅ |
| Статус болезней 0–5 | ✅ |
| Картофельные фазы (всходы, смыкание, бутонизация, цветение, клубнеобразование) | ✅ in seed |

**Missing:**
- No "Добавить поле" button or form
- Phase label "смыкание" not in existing seed data (minor)
- Field list is read-only; no navigation to analytics from here

---

### Screen 2 — Экран поля (лента)
**Status: PARTIAL**

| Element | Present |
|---|---|
| Записи операций | ✅ |
| Таймлайн по датам | ✅ |
| Статусы (badges per type) | ✅ |
| Комментарии (notes) | ✅ |
| Фото | ❌ photo_url is null everywhere; no image rendering |
| Структурированное отображение payload | ❌ raw JSON.stringify shown |

**Missing:**
- "Добавить запись" button — the entire data-entry entry point is absent
- Structured rendering of each operation type payload (shows raw JSON)
- Photo support in UI

---

### Screen 3 — Новая запись (попап)
**Status: MISSING**

No modal, no popup, no icon selector, no form routing. `POST /api/operations` API exists but there is no UI connected to it. The app is read-only.

---

### Screen 4 — Посадка картофеля
**Status: MISSING**

Data exists in seed payloads (`seedClass`, `fraction`, `rateTHa`, `depthCm`, `rowSpacingCm`, `soilTemperature`, `starterFertilizer`). No input form exists. Not displayed in structured way in timeline (raw JSON).

---

### Screen 5 — Осмотр поля
**Status: MISSING**

Data exists in seed payloads (`emergencePct`, `plantDensity`, `stemsPerPlant`, `haulmHeightCm`, `weeds`, `lateBlight`, `alternaria`, `rhizoctonia`, `commonScab`, `stress`). No input form. Timeline shows raw JSON. Structured rendering (болезни block, вредители block, стресс) absent.

---

### Screen 6 — Удобрения (NPK)
**Status: MISSING**

Data in seed (`product`, `doseKgHa`, `phase`, `applicationMethod`, `nKgHa`, `pKgHa`, `kKgHa`). No form. **Auto-calculation of N/P/K from selected fertilizer product** not implemented anywhere. Total N/P/K shown in field metrics cards (read-only).

---

### Screen 7 — Полив
**Status: MISSING**

Data in seed (`type`, `volumeMm`, `waterEc`, `goal`). No form. irrigation_mm shown in field metrics card (read-only).

---

### Screen 8 — Защита (СЗР)
**Status: MISSING**

Data in seed (`product`, `protectionType`, `dose`, `weather`, `phase`). No form. No structured display in timeline.

---

### Screen 9 — Десикация
**Status: PARTIAL**

Data fully present in seed (`product`, `dose`, `dryingPct`, `haulmColor`). `desiccation_done` boolean used in comparison table. No input form. Timeline renders raw JSON payload.

---

### Screen 10 — Уборка урожая
**Status: PARTIAL**

Data present (`grossTons`, `yieldTHa`, `fraction3555`, `fraction5570`, `fraction70plus`, `wastePct`). `yield_t_ha` shown in field detail badge. Calibration breakdown shown in seed but **not rendered structurally in timeline**. No form. Missing: `harvest_date_start` / `harvest_date_end` (only single operation_date used).

---

### Screen 11 — Хранение
**Status: PARTIAL**

Data present (`airTemp`, `massTemp`, `humidity`, `lossPct`, `storageDisease`). `storage_loss_pct` shown in field detail badge. No form. No dedicated storage screen / camera view.

---

### Screen 12 — Аналитика поля
**Status: MISSING**

No per-field analytics page or route exists. Global `DiseaseTrendChart` and `YieldPotassiumChart` are on the dashboard only.

Required charts for this screen:
- NPK за сезон — data derivable from fertilizer operations
- Полив + осадки — irrigation data present; rainfall requires weather API (not available)
- Болезни по датам — inspection lateBlight/alternaria/rhizoctonia values available
- Фунгицидные окна — derivable from crop_protection operations
- Урожайность vs операции — derivable from harvest + operation timeline

**All charts except rainfall are implementable from existing data.**

---

### Screen 13 — Сравнение полей
**Status: PARTIAL**

Table exists with columns: Поле, Сорт, Фаза, Урожайность, K кг/га, Полив, Болезни, Десикация.

**Missing column: Калибровка** (fraction3555 / fraction5570 / fraction70plus from harvest payload — data is present, just not projected into `ComparisonRow` type or table).

---

### Screen 14 — Погодные данные
**Status: MISSING**

No weather page, no weather API integration, no temperature/precipitation/wind data, no ГТК (hydrothermal coefficient) calculation. This requires an external weather API (e.g., Open-Meteo — free, no key required).

---

### Screen 15 — Настройки сортов
**Status: PARTIAL**

Data present in-memory and in seed SQL. `GET /api/references/varieties` endpoint returns all fields. No dedicated page at `/dictionaries/varieties`. No CRUD (add/edit/delete variety).

---

### Screen 16 — Справочник удобрений
**Status: PARTIAL**

Data present. `GET /api/references/fertilizers` endpoint works. No dedicated page. No CRUD. **Auto-calculation in fertilizer form is not wired** (this reference is the source for NPK auto-calc in Screen 6).

---

## Infrastructure status

| Concern | Status | Notes |
|---|---|---|
| PostgreSQL schema | PARTIAL | `db/init.sql` correct but `fields` missing `updated_at`; no `harvest_date_end` |
| PostgreSQL connection | PARTIAL | `lib/db.ts` exists and correct, never used by app |
| Database seed | READY | `npm run db:seed` runs init.sql + seed.sql via pg.Client |
| Migration system | MISSING | No versioning; one-shot SQL files only |
| Data layer (reads) | BLOCKED | All reads from in-memory — must migrate to PostgreSQL |
| Data layer (writes) | BLOCKED | `addOperation()` writes to in-memory array; lost on restart |
| Form components | MISSING | No Button, Input, Select, Textarea, Modal exist |
| Per-field analytics API | MISSING | No `/api/fields/[id]/analytics` route |
| Dictionary pages | MISSING | No `/dictionaries/*` pages |
| Weather integration | MISSING | No weather API, no data model |
| Error handling | MISSING | No error boundaries, no loading states |
| Type coverage | PARTIAL | `lib/types.ts` covers read shapes; missing form/input types |

---

## Blockers (must fix before anything else is useful)

1. **PostgreSQL must become the data source** — currently any write is lost on restart; the app cannot be used in production as-is. Fix: replace `lib/data.ts` function bodies with `query()` calls to PostgreSQL.

2. **New operation entry UI must exist** — without Screen 3 (popup + forms) the app is read-only and the core agronomist workflow cannot be performed.

---

## Implementation order for this exact codebase

Given the codebase structure, the minimal-risk implementation order is:

### Step 1 — PostgreSQL migration (no UI changes)
- Replace `lib/data.ts` internals with `lib/db.ts` queries
- Keep all function signatures identical → zero page/component changes
- Add `updated_at` to fields in `db/init.sql`
- Run `npm run db:seed`, verify with `npm run build`
- **Evidence of done:** `lib/db.ts` imported in `lib/data.ts`; `npm run build` passes; data survives server restart

### Step 2 — UI primitives + Modal + operation entry
- Add `Button`, `Input`, `Select`, `Textarea`, `NumberInput` to `components/ui.tsx`
- Add `Modal` component
- Add "Добавить запись" button to `/fields/[id]` page
- Add `OperationTypeSelector` modal (icons for 8 types)
- Wire to operation forms (one form per type)
- Wire forms to `POST /api/operations`
- After save: `router.refresh()` to reload server data
- **Evidence of done:** agronomo can add planting/inspection/fertilizer from browser; data persists in PostgreSQL

### Step 3 — Structured timeline rendering
- Replace `JSON.stringify` in `Timeline` component with per-type renderers
- Each operation type gets a structured card layout
- **Evidence of done:** all 8 operation types show human-readable fields in timeline

### Step 4 — Per-field analytics page
- Add `getFieldAnalytics(id)` to `lib/data.ts`
- Add `GET /api/fields/[id]/analytics` route
- Add analytics section at bottom of `/fields/[id]` page
- 4 charts from real data: NPK cumulative, disease dynamics, irrigation timeline, protection events
- **Evidence of done:** charts visible on field page, data derived from real operations

### Step 5 — Calibration column in comparison
- Add `calibration` to `ComparisonRow` type
- Add derivation logic in `getComparison()`
- Add column to `ComparisonTable`
- **Evidence of done:** calibration % shown in comparison table

### Step 6 — Dictionary pages
- Add `/dictionaries/varieties` and `/dictionaries/fertilizers` pages
- Reuse `Shell`, `Card`, `SectionTitle` primitives
- Read-only initially
- **Evidence of done:** pages render data from PostgreSQL

### Step 7 — Weather integration (last)
- Integrate Open-Meteo free API (no key required)
- Add weather widget to dashboard
- **Evidence of done:** temperature/precipitation visible

---

## Key architectural decision recorded

**JSONB payload retained** (vs typed detail tables per CLAUDE.md preference).

Reason: 8-way JOIN complexity for timeline queries outweighs type-safety benefits; PostgreSQL JSONB is queryable with `->` and `->>`; all payloads are consistently structured; TypeScript form types provide application-layer safety. Typed detail tables would double the migration complexity with no runtime benefit for this scale.
