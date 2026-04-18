# PDF Edge Requirements Audit
**Date:** 2026-04-12  
**Scope:** Narrow compliance check against 5 specific PDF requirement areas only.  
**Method:** Code inspection — no functional testing assumed.

---

## 1. Field Timeline Screen

> PDF requirement: photos · comments · statuses · dates

---

### 1a. Dates
**Status: READY**

- `operation_date` on every `TimelineEntry` (schema `001_initial_schema.sql`)
- `formatDate()` in `components/timeline.tsx:36` → "14 сент. 2026"
- Month separator groups entries by month (`monthKey()`, line 43)
- Rendered in every timeline card header: `timeline.tsx:598`

---

### 1b. Comments / Notes
**Status: READY**

- `notes text` column in `operations` table (`001_initial_schema.sql:49`)
- `TimelineEntry.notes: string | null` in `lib/types.ts:28`
- Textarea in step 2 of the modal: `new-operation-modal.tsx:752-759`
- Rendered below headline stats: `timeline.tsx:629-631`
- Saved via `POST /api/operations` → `addOperation()` in `lib/data.ts`

---

### 1c. Photos
**Status: PARTIAL**

**What works:**
- `photo_url text` column exists in `operations` table (`001_initial_schema.sql:50`)
- `TimelineEntry.photo_url: string | null` in `lib/types.ts:30`
- Timeline renders a clickable thumbnail when `photo_url` is non-null: `timeline.tsx:600-615`
- API route (`app/api/operations/route.ts:6`) accepts and forwards `photo_url`
- `addOperation()` in `lib/data.ts:402` persists it

**What is missing:**
- No file input or URL input anywhere in `new-operation-modal.tsx` — confirmed by full grep, zero photo-related code in the modal
- Users cannot attach a photo through the UI; only a manually-inserted DB row would display
- No upload backend (no storage endpoint, no S3/R2/Vercel Blob integration)

**PDF required or enhancement:** PDF-required (PDF explicitly lists photos in the timeline screen)

**Smallest fix:** Add a URL text input to step 2 of the modal as an interim solution (no storage backend needed). A user would paste a hosted image URL. File upload is a larger effort requiring a storage backend.

---

### 1d. Statuses
**Status: MISSING**

**What exists:** `disease_status` on the `fields` table (field-level, not operation-level). No concept of per-operation status.

**What is missing:**
- No `status` column on the `operations` table
- No `status` field in `TimelineEntry` type
- No status badge, label, or filter in the timeline UI
- No status picker in the new-operation modal

**PDF required or enhancement:** PDF-required if the product vision includes planned vs actual operations or an "in progress" workflow state. Without the PDF text, this is classified as **likely PDF-required** based on the explicit mention. However, all seed data represents completed operations — the system today implicitly treats every entry as "done."

**Smallest fix:**
1. Migration: `ALTER TABLE operations ADD COLUMN status text NOT NULL DEFAULT 'completed' CHECK (status IN (''planned'', ''in_progress'', ''completed''))`
2. Add optional status select to modal footer (default: completed)
3. Show status badge in timeline header row

---

## 2. Field Inspection

> PDF requirement: potato pests (colorado beetle / wireworm) · photo attachment

---

### 2a. Potato Pests (Colorado Beetle / Wireworm)
**Status: MISSING**

**What exists:**
- `InspectionPayload` in `lib/operation-types.ts:50-71` covers diseases only:
  `lateBlight`, `alternaria`, `rhizoctonia`, `commonScab`, `weeds`
- The form section header in `new-operation-modal.tsx:144` is titled "Болезни и вредители" (diseases AND pests) but the actual scores are all diseases, no insect pests
- `InspectionForm` score array: `weeds`, `lateBlight`, `alternaria`, `rhizoctonia`, `commonScab` — no pest entries
- `InspectionDetail` in `timeline.tsx:342-375` renders these same 5 fields

**What is missing:**
- No `coloradoBeetle` (Колорадский жук, *Leptinotarsa decemlineata*)
- No `wireworm` (Проволочник, *Agriotes spp.*)
- No other potato-specific pests the PDF may require (aphids, nematodes, thrips)

**PDF required:** PDF-required — colorado beetle is the primary economic pest of potato in Kazakhstan and Central Asia; it was explicitly named in the original requirement

**Smallest fix:**
1. Add `coloradoBeetle: number` and `wireworm: number` to `InspectionPayload` in `lib/operation-types.ts`
2. Add two score rows to `InspectionForm` in `new-operation-modal.tsx`
3. Add `ScoreBar` entries to `InspectionDetail` in `timeline.tsx`
4. Include in `buildPayload('inspection', ...)` in modal
5. No migration needed — JSONB payload is additive

This is a fully additive, safe change. Existing seeded inspection records will simply have `coloradoBeetle: 0` implicit (JSONB access returns null, cast to 0 by `n()` helper).

---

### 2b. Photo Attachment (Inspection-specific)
**Status: MISSING** (same root cause as 1c)

The modal has zero photo input for any form type. All 8 forms share the same absence of photo capability.

**PDF required:** PDF-required for inspection (field observation photos are a core agronomy workflow)

**Smallest fix:** Same as 1c — add a photo URL input to the modal's step 2. The existing `photo_url` column, API wiring, and timeline thumbnail rendering are already complete. Only the input control is missing.

---

## 3. Harvest

> PDF requirement: start date + end date · photo of mechanical damage

---

### 3a. Start Date and End Date
**Status: READY**

Both harvest date fields are fully implemented end-to-end:

| Layer | Evidence |
|---|---|
| Type | `HarvestPayload.harvestStartDate?: string` and `harvestEndDate?: string` — `lib/operation-types.ts:149,151` |
| Form | Two `<input type="date">` rows labeled "Дата начала уборки" / "Дата окончания уборки" — `new-operation-modal.tsx:300-304` |
| Save | Conditionally included in `buildPayload('harvest', ...)` — `new-operation-modal.tsx:443-444` |
| Timeline | `HarvestDetail` renders "Период уборки" divider with both dates formatted — `timeline.tsx:452-460` |

Both dates are optional (`?`), which matches real-world usage (single-day harvests won't fill them in).

---

### 3b. Photo of Mechanical Damage
**Status: MISSING**

**What exists:**
- `HarvestPayload` has `wastePct: number` (general waste %) but no field for mechanical damage
- No `mechanicalDamagePct` or `mechanicalDamagePhotoUrl` field anywhere
- Same root cause as 1c: no photo upload UI in the modal

**What is missing:**
- `mechanicalDamagePct?: number` field in `HarvestPayload`
- Input in `HarvestForm` for mechanical damage percentage
- Photo attachment (covered by the general photo fix in 1c/2b)

**PDF required or enhancement:** **Enhancement** — the PDF mentions harvest photos generally but mechanical damage as a specific field was not explicitly stated in the original requirement text provided. However, `wastePct` does partially cover the same domain intent. Mark as enhancement pending confirmation from the PDF.

**Smallest fix:**
- Add `mechanicalDamagePct?: number` to `HarvestPayload`
- Add a number input "Механические повреждения, %" to `HarvestForm`
- Add rendering in `HarvestDetail` via `<Def>`
- No migration needed (JSONB additive)

---

## 4. Varieties / Settings

> PDF requirement: variety dictionary page · UI phases adapted by variety

---

### 4a. Variety Dictionary Page
**Status: READY**

- Route: `/dictionaries/varieties`
- File: `app/dictionaries/varieties/page.tsx`
- Reads from PostgreSQL via `getVarieties()` in `lib/data.ts:357`
- Displays: Сорт · Группа спелости · Назначение · Потенциал урожайности
- Nav link from dashboard: `app/page.tsx:64-69` ("Сорта картофеля" with `BookOpen` icon)
- Data in DB: 3 varieties seeded (Коломба, Гала, Ред Скарлетт)

---

### 4b. UI Phases Adapted by Variety
**Status: MISSING**

**What exists:**
- `PHASES` constant in `new-operation-modal.tsx:11-14` — **hardcoded static list** for all varieties:
  ```
  ['посадка', 'всходы', 'смыкание', 'бутонизация',
   'цветение', 'клубнеобразование', 'десикация', 'уборка']
  ```
- This same list is used in both `FertilizerForm` (line 201) and `CropProtectionForm` (line 259)
- The modal `NewOperationButton` receives `fieldId` and `areaHa` but **not** the variety or maturity group
- `Variety.maturity_group` exists in the DB and type, but never flows into the modal

**What is missing:**
- The modal does not receive the field's variety or maturity group
- Phase options are identical regardless of whether the crop is early (ранний), mid-season (среднеранний), or late
- The PDF vision likely implies: early varieties might skip certain phases or use a tighter window; чипсовый vs столовый varieties have different production-end targets

**PDF required or enhancement:** **PDF-required** based on the explicit mention in requirements, but **low implementation risk** because:
- The phase list is the same 8 stages that apply to potato in general
- Adapting by variety is primarily about ordering/availability, not correctness
- The current static list is not wrong, just not personalized

**Smallest fix:**
1. Pass `varietyName` and `maturityGroup` as props to `NewOperationButton`
2. Define a `PHASES_BY_MATURITY` map (e.g. early variety shortens the season — `бутонизация` arrives sooner; `десикация` can be omitted for some чипсовые varieties)
3. Filter or reorder `PHASES` based on the maturity group in `FertilizerForm` and `CropProtectionForm`

This is a **product-completeness** feature — no DB change needed, only UI logic.

---

## 5. Weather

> PDF requirement: temperature · precipitation · wind · GTK/GTC if implemented

---

### 5a. Temperature
**Status: READY**

- `CurrentWeather.temperature: number` — `lib/weather.ts:66`
- Displayed as `{c.temperature}°C` in large bold text in `CurrentCard` — `app/weather/page.tsx:55`
- 7-day forecast shows max/min per day: `{Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°` — `page.tsx:91-93`
- GTK calculation uses daily T_max and T_min: `lib/weather.ts:209-211`

---

### 5b. Precipitation
**Status: READY**

- `CurrentWeather.precipitation: number` (last hour, mm) — `lib/weather.ts:69`
- Displayed with `<CloudRain>` icon: `{c.precipitation} мм осадки` — `page.tsx:70`
- 7-day forecast shows `precipitation_sum` per day, rendered when `> 0` — `page.tsx:94-99`
- GTK seasonal Σprecip calculated and displayed in `GtkCard` — `page.tsx:135-136`

---

### 5c. Wind
**Status: READY**

- `CurrentWeather.windspeed: number` (m/s) — `lib/weather.ts:68`
- API requested with `wind_speed_unit=ms` — `lib/weather.ts:107`
- Displayed with `<Wind>` icon: `{c.windspeed} м/с ветер` — `page.tsx:65-67`
- Used in spray advisory threshold check: `if (c.windspeed > 5)` — `lib/weather.ts:258`

Wind direction is not shown (only speed). Not flagged as missing since the PDF requirement mentions "wind" generically and speed is the agronomically relevant value for spray advisory.

---

### 5d. GTK / GTC (Гидротермический коэффициент)
**Status: READY**

Full implementation confirmed:

| Feature | Evidence |
|---|---|
| Formula | Σprecip / (0.1 × Σ T_avg where T_avg > 10°C) — `lib/weather.ts:235` |
| Season period | April 1 → today − 3 days — `lib/weather.ts:169-172` |
| Archive API | `archive-api.open-meteo.com` with daily max/min/precip — `lib/weather.ts:188-196` |
| Interpretation scale | 5 levels (Засуха → Избыточное увлажнение) — `lib/weather.ts:152-158` |
| UI card | `GtkCard` with value, interpretation, Σprecip, Σtemp, daysUsed, period, full scale legend — `app/weather/page.tsx:106-168` |
| Edge case | Returns `null` when < 5 qualifying days, with explanation text |
| Farm location | `FARM_LAT/LON` from `.env.local`; defaults to Астана |

---

## Summary Table

| # | Requirement | Status | PDF Required |
|---|---|---|---|
| 1a | Timeline — dates | READY | Yes |
| 1b | Timeline — comments/notes | READY | Yes |
| 1c | Timeline — photos (display) | PARTIAL | Yes |
| 1c | Timeline — photos (upload UI) | MISSING | Yes |
| 1d | Timeline — operation statuses | MISSING | Likely Yes |
| 2a | Inspection — potato pests (colorado beetle / wireworm) | MISSING | Yes |
| 2b | Inspection — photo attachment | MISSING | Yes |
| 3a | Harvest — start + end date | READY | Yes |
| 3b | Harvest — mechanical damage photo | MISSING | Enhancement |
| 4a | Variety dictionary page | READY | Yes |
| 4b | UI phases adapted by variety | MISSING | Yes |
| 5a | Weather — temperature | READY | Yes |
| 5b | Weather — precipitation | READY | Yes |
| 5c | Weather — wind | READY | Yes |
| 5d | Weather — GTK/GTC | READY | Yes |

---

## Shortest Path to Full PDF Compliance

Ordered by impact-to-effort ratio, smallest scope first:

### Step 1 — Potato pests in InspectionPayload (1–2 hrs, zero risk)
Add `coloradoBeetle` and `wireworm` score fields to:
- `lib/operation-types.ts` — `InspectionPayload`
- `components/new-operation-modal.tsx` — `InspectionForm` score array
- `components/timeline.tsx` — `InspectionDetail` score bars
- `components/new-operation-modal.tsx` — `buildPayload('inspection', ...)`

No migration. JSONB additive. Existing records unaffected.

---

### Step 2 — Photo URL input in modal (1 hr, zero risk)
Add a single URL text input to step 2 of `new-operation-modal.tsx`:
```tsx
<Row label="Фото (URL)">
  <input type="url" ... value={photoUrl} onChange={...} placeholder="https://..." />
</Row>
```
Pass `photoUrl` to `body.photo_url` in `handleSave()`.

The column, API wiring, and timeline thumbnail display are all already complete. Only the input is missing.

This immediately enables photos for all 8 operation types including inspection and harvest.

---

### Step 3 — Operation status field (2–3 hrs)
1. Migration `003_add_operation_status.sql`:
   ```sql
   alter table operations
     add column if not exists status text not null default 'completed'
     check (status in ('planned', 'in_progress', 'completed'));
   ```
2. Add `status?: 'planned' | 'in_progress' | 'completed'` to `TimelineEntry` in `lib/types.ts`
3. Add optional status select in modal footer (default: completed, so existing flow unchanged)
4. Show coloured status badge in timeline card header

---

### Step 4 — Mechanical damage field in harvest (30 min)
Add `mechanicalDamagePct?: number` to `HarvestPayload` and a number input to `HarvestForm`.
Render in `HarvestDetail`. No migration needed.

---

### Step 5 — Variety-adaptive phases (2 hrs)
Pass `maturityGroup` prop to `NewOperationButton`.
Define a `PHASES_BY_MATURITY` map and filter the phase dropdown accordingly.
No DB change. UI only.

---

### What does NOT need to change

| Item | Reason |
|---|---|
| Photos display in timeline | Already works — `timeline.tsx:600-615` |
| Harvest start/end dates | Fully implemented end-to-end |
| Variety dictionary page | Fully implemented at `/dictionaries/varieties` |
| All 4 weather metrics | Temperature, precipitation, wind, GTK all present |
| All other timeline fields | Dates and notes are complete |
