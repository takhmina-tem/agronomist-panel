# Per-Field Analytics — Feature Documentation

## Status: READY (with documented partial gaps)

Analytics are rendered from real PostgreSQL data. No synthetic values are used anywhere.

---

## Architecture

```
PostgreSQL operations table (JSONB payload)
  └─ lib/data.ts: getFieldAnalytics(fieldId)   ← single query, all types
       └─ app/fields/[id]/page.tsx              ← server component, parallel fetch
            └─ components/charts.tsx            ← 'use client' chart components
                 ├─ FieldNpkChart
                 ├─ FieldIrrigationChart
                 ├─ FieldDiseaseChart
                 └─ FieldProtectionTable
```

`getFieldAnalytics()` issues one `SELECT` over the `operations` table for the given field, filtered by `operation_type`, and returns `FieldAnalyticsData` (defined in `lib/types.ts`). No joins, no extra queries — TypeScript derives all series in memory.

The field page calls `getFieldById` and `getFieldAnalytics` in `Promise.all`. Charts only render when their data array is non-empty — fields with no operations show no analytics section.

---

## Analytics Implemented

### 1. NPK over season — READY

**Component:** `FieldNpkChart` (stacked bar chart)  
**Data source:** `operation_type = 'fertilizer'` → `payload.nKgHa`, `payload.pKgHa`, `payload.kKgHa`  
**X-axis:** operation date  
**Series:** N (blue), P₂O₅ (violet), K₂O (green), stacked per application  
**Totals:** `analytics.totals.totalN/P/K` also shown as KPI cards at top of page

Each bar represents one fertilization event. NPK values are auto-calculated at write time from the fertilizer dictionary (`lib/npk.ts`) and stored in the payload — so they are always present when a fertilizer operation exists.

**Dependency gap:** None. Fully supported by current schema.

---

### 2. Irrigation over time — READY (rainfall side MISSING)

**Component:** `FieldIrrigationChart` (bar chart)  
**Data source:** `operation_type = 'irrigation'` → `payload.volumeMm`  
**X-axis:** operation date  
**Series:** irrigation volume per event in mm

Shows every manual irrigation event logged by the agronomist.

**Dependency gap — rainfall:** The water balance is incomplete. Rainfall is not tracked. To complete the balance chart, a weather integration (e.g. Open-Meteo historical data) would need to add `rainfall_mm` events or a separate `weather_log` table. Until then, the chart shows the irrigation side only. This is documented in the chart subtitle.

---

### 3. Disease dynamics — READY

**Component:** `FieldDiseaseChart` (area chart, multi-series)  
**Data source:** `operation_type = 'inspection'` → `payload.lateBlight`, `payload.alternaria`, `payload.rhizoctonia`, `payload.commonScab`  
**X-axis:** inspection date  
**Series:** Фитофтороз (red), Альтернариоз (orange), Ризоктониоз (purple), Парша (yellow)  
**Y-axis:** 0–5 scoring scale (agronomic standard)

Each data point is a field inspection. The chart shows how disease pressure evolves across the season.

**Note:** `weeds` score is captured in payload but not charted (it is not a disease — shown in the timeline's `InspectionStats` chip instead). Could be added as a 5th series if needed.

**Dependency gap:** None for the 4 disease series. More inspection events entered by the agronomist = richer chart.

---

### 4. Fungicide / protection windows — READY

**Component:** `FieldProtectionTable` (table)  
**Data source:** `operation_type = 'crop_protection'` → `payload.product`, `payload.protectionType`, `payload.dose`, `payload.phase`, `payload.weather`  
**Columns:** Date · Препарат · Тип (badge: Фунгицид / Гербицид / Инсектицид) · Доза · Фаза · Погода

Renders every protection event as a row. Type badges are colour-coded (blue = fungicide, amber = herbicide, red = insecticide).

**Dependency gap:** A timeline / Gantt-style view of protection intervals would be more useful agronomically (showing re-entry intervals between applications). This requires an `interval_days` or `valid_until` field per event, which is not currently stored. The table is the correct minimal form given current data.

---

### 5. Yield / harvest summary — READY

**Component:** Inline `Card` in `app/fields/[id]/page.tsx`  
**Data source:** `operation_type = 'harvest'` → `payload.yieldTHa`, `payload.grossTons`, `payload.wastePct`, `payload.fraction3555/5570/70plus`

Renders:
- Урожайность (т/га), Валовый сбор (т), Отходы (%)
- Calibration bar chart: 35–55 / 55–70 / 70+ mm fraction breakdown with colour-coded percentages

**Yield vs operations — PARTIAL:** A chart correlating yield with specific operation counts or timing (e.g. "fields with 3+ irrigations yield X vs 1 irrigation yield Y") requires multiple harvested fields with varied operation histories. With the current seed (2 harvested fields, 1 event each), a cross-field comparison exists in the dashboard's `YieldPotassiumChart` on the homepage. A per-field multi-season view requires a `season` or `year` column on operations, which is not yet in the schema.

---

## What Each Field Shows (seed data)

| Field | NPK chart | Irrigation chart | Disease chart | Protection table | Harvest summary |
|---|---|---|---|---|---|
| Поле Север-1 | ✓ 1 event | ✓ 1 event | ✓ 2 inspections | ✓ 1 event | ✓ with calibration |
| Поле Восток-2 | ✓ 1 event | ✓ 1 event | ✓ 1 inspection | ✓ 1 event | — (no harvest yet) |
| Поле Юг-3 | ✓ 1 event | ✓ 1 event | ✓ 1 inspection | — (no protection) | ✓ with calibration |

Analytics section is hidden when a field has zero operations of any tracked type.

---

## Data Shape (lib/types.ts: FieldAnalyticsData)

```ts
type FieldAnalyticsData = {
  npkEvents:        NpkEvent[];         // per fertilizer op
  irrigationEvents: IrrigationEvent[];  // per irrigation op
  diseasePoints:    DiseasePoint[];     // per inspection op
  protectionEvents: ProtectionEvent[];  // per crop_protection op
  harvest:          HarvestSummary;     // latest harvest op, or null
  totals: {
    totalN: number;            // sum N кг/га across season
    totalP: number;
    totalK: number;
    totalIrrigationMm: number;
  };
};
```

---

## Files Changed / Added

| File | Role |
|---|---|
| `lib/data.ts` | `getFieldAnalytics()` — single DB query, 5 series derived in TS |
| `lib/types.ts` | `FieldAnalyticsData`, `NpkEvent`, `IrrigationEvent`, `DiseasePoint`, `ProtectionEvent`, `HarvestSummary` |
| `app/api/fields/[id]/analytics/route.ts` | GET endpoint — exposes same data as JSON |
| `components/charts.tsx` | `FieldNpkChart`, `FieldIrrigationChart`, `FieldDiseaseChart`, `FieldProtectionTable` |
| `app/fields/[id]/page.tsx` | Calls `getFieldAnalytics()`, renders analytics section |

---

## Dependency Gaps Summary

| Gap | Impact | What's needed |
|---|---|---|
| Rainfall data | Water balance incomplete | Weather integration (Open-Meteo or manual log) |
| Multi-season yield | Yield trend not chartable | `season` / `year` column on operations |
| Protection intervals | Can't show re-entry windows | `interval_days` or `valid_until` on protection ops |
| Weed chart series | Weeds tracked but not charted | Add `weeds` to `FieldDiseaseChart` (minor, opt-in) |

None of these gaps block the current MVP analytics. They are enhancements for a later iteration.
