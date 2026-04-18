# Final Gap Plan
**Date:** 2026-04-12  
**Based on:** final-readiness-report.md  

All P0 and P1 items from CLAUDE.md are complete. Remaining work is P2 or lower.

---

## Critical issues (blocking real usage in production)

### None.

All four original blockers are resolved:
1. New operation creation UI — DONE
2. PostgreSQL as source of truth — DONE
3. Read and write through database — DONE
4. Per-field analytics screen — DONE

---

## Important issues (usability gaps)

### 1. No "Add field" UI
**Impact:** agronomist cannot add a new field from the browser. Must use `db:seed` or direct SQL.  
**Root cause:** `createField()` exists in `lib/data.ts` but no button or form is wired in.  
**Smallest fix:**
- Add "Добавить поле" button to dashboard (`app/page.tsx`).
- Create `components/new-field-modal.tsx` — simple form: name, area_ha, variety selector (from `/api/references/varieties`), starting phase.
- Add `POST /api/fields` route calling `createField()`.
- After save: `router.refresh()`.
- Estimated scope: ~2–3 hours.

---

### 2. Graceful 404 for invalid field IDs — FIXED
`lib/data.ts:getFieldById()` now calls `notFound()` from `next/navigation`.  
`app/fields/[id]/not-found.tsx` added — renders a Russian "Поле не найдено" page with nav back to field list.

---

## Nice-to-have issues (value-adding, not blocking)

### 3. Per-field weather and GTK
**What's missing:** Each field shows farm-level weather (Астана defaults). Per-field weather requires coordinates on the `fields` table.  
**Smallest path:**
1. Migration `003_add_field_coordinates.sql`:
   ```sql
   alter table fields
     add column if not exists lat_deg numeric(9,6),
     add column if not exists lon_deg numeric(9,6);
   ```
2. Add `lat_deg`/`lon_deg` inputs to the add-field modal (see gap #1).
3. Update seed with coordinates for 3 test fields.
4. Update `getFieldById()` to return coordinates.
5. Pass `lat`/`lon` to `fetchWeatherForecast()` on the field page.
**Estimated scope:** ~3–4 hours (depends on gap #1 being done first).

---

### 4. Photo uploads in timeline
**What's missing:** `photo_url` column exists in the `operations` table and is returned in all timeline queries. The modal has no photo upload input.  
**Smallest path:**
- Add a file input to `NewOperationButton` step 2 form.
- Upload to a storage service (e.g. Cloudflare R2, Vercel Blob, local `public/uploads/`).
- Store the returned URL in `payload.photo_url` when posting.
- Render `<img>` in timeline if `item.photo_url` is non-null.
**Estimated scope:** 4–6 hours (depends on storage choice).

---

### 5. Multi-day GTK trend chart
**What's missing:** The GTK card shows a single scalar value. A rolling weekly GTK chart would show drought/wet progression over the season.  
**Smallest path:** Fetch full season from Open-Meteo archive; bin into weekly GTK values; render as AreaChart using existing `recharts` setup.  
**Estimated scope:** ~2–3 hours.

---

### 6. Rainfall overlay on irrigation water balance
**What's missing:** `FieldIrrigationChart` shows only manual irrigation. Adding real precipitation from Open-Meteo would give a true water balance.  
**Depends on:** Gap #3 (per-field coordinates).  
**Estimated scope:** ~2 hours after gap #3.

---

## Smallest path to MVP completion

If the goal is to ship the system as a real working tool for agronomists, the minimum remaining work is:

| Priority | Task | Hours |
|---|---|---|
| 1 | ~~Fix graceful 404 for invalid field IDs~~ | DONE |
| 2 | Add-field UI (modal + API route) | 2–3 |
| 3 | Per-field coordinates (migration + seed update) | 1 |
| **Total remaining** | | **~3 hours** |

Everything else (photos, GTK trend, rainfall overlay) adds value but is not required to ship an operational MVP.

---

## Do not do before shipping

- Do not rewrite the JSONB schema to typed detail tables — no benefit, high risk.
- Do not add weather to the field card — farm-level weather on the weather page is sufficient for MVP.
- Do not add multi-field comparison charts — the comparison table is sufficient.
- Do not add user authentication — out of scope for this MVP.
