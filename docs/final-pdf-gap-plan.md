# Final PDF Gap Plan
**Date:** 2026-04-14  
**Based on:** `docs/final-pdf-compliance-report.md`  
**Scope:** Remaining gaps only. Completed items are not repeated.

---

## Part A — Explicit PDF Gaps (PDF-required, not yet done)

### Gap 1 — Add Field UI
**Status: MISSING**  
**PDF required: Yes** — the agronomist must be able to register new fields without SQL access.

**What exists:**
- `createField()` in `lib/data.ts:435` — full INSERT, takes `CreateFieldInput`
- `POST /api/fields` route in `app/api/fields/route.ts` — but only returns field list (GET)

**Smallest fix:**
1. Add a simple modal `components/new-field-modal.tsx`:
   - Name (text), area_ha (number), variety selector (`/api/references/varieties`), starting phase (select from `PHASES_FULL`)
2. Add "Добавить поле" button to dashboard (`app/page.tsx` after field grid)
3. Add `POST /api/fields` handler calling `createField()`
4. After save: `router.refresh()` reloads dashboard
5. **No migration needed** — `fields` table schema is complete

**Estimated scope:** 2–3 hours  
**Risk:** Low — `createField()` is already written and tested

---

### Gap 2 — Photo File Upload (vs URL paste)
**Status: PARTIAL** (URL input works; file-from-device upload missing)  
**PDF required: Yes (implied)** — "photos" in an agronomist workflow implies field photos from a mobile device

**What exists:**
- `photo_url text` column in `operations` table — `001_initial_schema.sql:50`
- `TimelineEntry.photo_url` type — `lib/types.ts:30`
- Timeline renders thumbnail + link — `components/timeline.tsx:628-641`
- URL input in modal step 2 — `components/new-operation-modal.tsx:806-812`
- URL validation + API wiring — all complete

**What is missing:**
- A file input (`<input type="file" accept="image/*">`) in the modal
- A storage backend to receive the upload and return a hosted URL

**Options (pick one):**
| Option | Effort | Notes |
|---|---|---|
| Vercel Blob | 2–3 hrs | Add `@vercel/blob`; POST to `/api/upload`; return URL |
| Local `public/uploads/` | 1–2 hrs | Next.js `formidable` save to disk; dev only |
| Cloudflare R2 | 3–4 hrs | `@aws-sdk/client-s3` with R2 endpoint |
| Keep URL paste | 0 | Acceptable for MVP — agronomist can use any hosted image link |

**Recommendation for MVP ship:** URL paste is acceptable for v1. Flag to agronomist team that file upload is deferred. Mark as P1 for first post-launch sprint.

**Estimated scope (Vercel Blob):** 2–3 hours  
**Risk:** Medium — requires infra decision; URL paste unblocks the workflow today

---

## Part B — Non-PDF Product Improvements

These are not explicitly required by the PDF product vision but add meaningful value.

### B1 — Per-Field Weather and GTK
**What's missing:** Weather page shows farm-level data (single `FARM_LAT/LON`). Ideally each field has its own coordinates so GTK and spray advisory reflect that field's microclimate.

**Dependency:** Requires Gap 1 (add-field UI) to be done first, so coordinates can be entered at field creation time.

**Smallest fix:**
1. Migration `004_add_field_coordinates.sql`:
   ```sql
   alter table fields
     add column if not exists lat_deg numeric(9,6),
     add column if not exists lon_deg numeric(9,6);
   ```
2. Add `lat_deg`/`lon_deg` inputs to the add-field modal (Gap 1)
3. Update `getFieldById()` to return coordinates
4. Pass lat/lon to `fetchWeatherForecast()` from field detail page
5. Update seed with approximate coordinates for 3 test fields

**Estimated scope:** 2–3 hours (after Gap 1)

---

### B2 — Harvest Mechanical Damage %
**What's missing:** `HarvestPayload` has `wastePct` (general waste) but no dedicated `mechanicalDamagePct` field. The pdf-edge-audit classified this as an **Enhancement**, not PDF-required.

**Smallest fix (30 minutes):**
1. Add `mechanicalDamagePct?: number` to `HarvestPayload` in `lib/operation-types.ts`
2. Add a number input "Механические повреждения, %" to `HarvestForm` in `new-operation-modal.tsx`
3. Add rendering in `HarvestDetail` in `timeline.tsx` via `<Def>` row
4. No migration needed (JSONB additive)

---

### B3 — Rainfall Overlay on Irrigation Water Balance
**What's missing:** `FieldIrrigationChart` shows only manual irrigation volumes. Real precipitation overlay would give a true water balance.

**Dependency:** Requires B1 (per-field coordinates) to fetch per-field precipitation from Open-Meteo archive.

**Estimated scope:** 2 hours (after B1)

---

### B4 — Multi-Day GTK Trend Chart
**What's missing:** `GtkCard` shows a single scalar GTK for the season-to-date. A weekly rolling GTK chart would show drought/wet progression.

**Smallest fix:**
- Fetch full season data already available from `calculateSeasonGtk()` archive call
- Bin into weekly buckets; render as `AreaChart` using existing `recharts` setup
- No DB changes, no migration

**Estimated scope:** 2–3 hours

---

## Part C — Smallest Path to 100% PDF Compliance

Complete these two items:

| # | Task | Effort | Blocks |
|---|---|---|---|
| 1 | Add field UI (Gap 1) | 2–3 hrs | Field management workflow |
| 2 | Photo file upload OR accept URL paste as v1 | 0–3 hrs | Photos in timeline |

That is all. Every other PDF-required item is already READY.

**If URL paste is accepted as v1 for photos:** only Gap 1 remains → **1 task, ~2–3 hours** to 100% PDF compliance.

---

## Part D — Smallest Path to MVP Ship

The system is operationally functional today for its primary workflow:
- An agronomist can view all fields
- Open any field timeline
- Log any of the 8 operation types with full data
- See analytics, charts, and comparison
- Browse variety and fertilizer dictionaries
- Check weather and GTK

The only practical blocker to real-world use is **Gap 1 (add field UI)**. Without it, new fields can only be added by direct SQL, which is not viable for an agronomist.

**MVP ship checklist:**

| Item | Status | Action needed |
|---|---|---|
| All core operation forms (8) | READY | None |
| PostgreSQL persistence | READY | None |
| Per-field analytics | READY | None |
| Field comparison + calibration | READY | None |
| Dictionary pages | READY | None |
| Weather + GTK | READY | None |
| Operation statuses | READY | None |
| Photos in timeline | READY (URL) | None for MVP |
| Inspection pests | READY | None |
| Variety-adaptive phases | READY | None |
| **Add field UI** | **MISSING** | **Implement Gap 1** |
| Valid TypeScript + lint | READY | None |
| DB migrations applied | READY | None |

**Remaining work to ship:** Implement Gap 1.  
**Estimate:** 2–3 hours.

---

## Summary Table

| Gap | Type | Effort | Priority |
|---|---|---|---|
| Add field UI | PDF-required | 2–3 hrs | P0 for shipping |
| Photo file upload | PDF-implied | 2–3 hrs or defer | P1 post-launch |
| Per-field weather/GTK | Enhancement | 2–3 hrs (after add-field) | P2 |
| Harvest mechanical damage % | Enhancement | 30 min | P3 |
| Rainfall overlay on water balance | Enhancement | 2 hrs (after per-field weather) | P3 |
| GTK weekly trend chart | Enhancement | 2–3 hrs | P3 |
