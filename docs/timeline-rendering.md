# Timeline Rendering — Architecture & Design

## Purpose

The field timeline (`components/timeline.tsx`) renders all agronomic operations for a single field in reverse-chronological order. Data is sourced entirely from PostgreSQL via `getFieldById()` in `lib/data.ts`, which returns `TimelineEntry[]` (id, type, date, title, notes, payload, photo_url).

---

## Architecture

### Rendering model

Each entry uses a **two-layer display**:

```
Left column (fast-scan)         Right column (secondary detail)
─────────────────────────       ─────────────────────────────────
[icon] TYPE LABEL · date        ╔══════════════════════════════╗
Title text                      ║  secondary data panel 272px  ║
[stat chip] [stat chip] ...     ║  (phase, methods, bar charts)║
notes text                      ╚══════════════════════════════╝
```

**Left column** contains everything the agronomist needs for a fast timeline scan: title, operation type with icon, date, and 2–4 headline stat chips derived from the payload.

**Right panel** (272 px) contains supplementary agronomic detail: growth phases, application methods, disease score bars, NPK table, calibration bar, and harvest period dates.

This separation means the feed is scannable by reading only the left column, while the detail panel provides drill-down depth.

---

## Component structure

```
Timeline(items)
├── MonthSeparator      — "Сентябрь 2026" divider when month changes
└── per item:
    ├── spine (dot + vertical line)   — coloured by operation type
    ├── card header (badge + date + optional photo thumbnail)
    ├── HeadlineStats dispatcher      — → per-type Stats component
    └── DetailPanel dispatcher        — → per-type Detail component
```

### HeadlineStats (left column chips)

| Operation | Chips shown |
|-----------|-------------|
| Planting | rateTHa т/га · depthCm см · soilTemperature°C |
| Inspection | emergencePct% всхожесть · plantDensity шт/га · haulmHeightCm см · disease risk badge |
| Fertilizer | product name · doseKgHa кг/га · N·P·K inline triple |
| Irrigation | volumeMm мм · type label · waterEc мСм/см |
| Crop protection | product name · dose · protection type badge |
| Desiccation | product name · dose · dryingPct% ботвы |
| Harvest | yieldTHa т/га · grossTons т · wastePct% badge |
| Storage | airTemp°C · massTemp°C · humidity% · disease badge (if present) |

### DetailPanel (right column)

| Operation | Detail panel contents |
|-----------|----------------------|
| Planting | seed class, fraction, row spacing, starter fertilizer |
| Inspection | stems/plant + `ScoreBar` for each disease score > 0 + stress type |
| Fertilizer | phase, application method + NPK inline triple (blue row) |
| Irrigation | goal text |
| Crop protection | phase, weather conditions |
| Desiccation | haulm colour |
| Harvest | harvest period dates (if set) + `CalibrationBar` (if fractions > 0) |
| Storage | loss % + storage disease label (if present) |

---

## Visual system

### Operation type colours

| Type | Dot / accent | Badge |
|------|-------------|-------|
| planting | emerald-500 | bg-emerald-50 / text-emerald-800 |
| inspection | amber-500 | bg-amber-50 / text-amber-800 |
| fertilizer | blue-500 | bg-blue-50 / text-blue-800 |
| irrigation | sky-500 | bg-sky-50 / text-sky-800 |
| crop_protection | red-500 | bg-red-50 / text-red-800 |
| desiccation | orange-500 | bg-orange-50 / text-orange-800 |
| harvest | green-600 | bg-green-50 / text-green-800 |
| storage | purple-500 | bg-purple-50 / text-purple-800 |

Each card has a 4 px left border stripe in the operation type colour, plus a coloured dot containing the type icon on the spine.

### Icons (Lucide React)

Sprout, ScanSearch, FlaskConical, Droplets, ShieldAlert, Leaf, Truck, Warehouse

### Disease score bars (`ScoreBar`)

Five-dot progress bar (filled/empty dots) per disease. Only scores > 0 are rendered. Colour scales with severity:

| Score | Colour |
|-------|--------|
| 1–2 | emerald / amber |
| 3 | orange |
| ≥ 4 | red |

### Calibration bar (`CalibrationBar`)

Proportional horizontal bar (h-5, rounded-full) showing calibre fractions in three colours:
- amber-400: 35–55 mm
- emerald-500: 55–70 mm
- blue-400: 70+ mm

Percentages labelled below each segment. Only rendered when at least one fraction is non-zero.

### Date formatting

ISO dates (`yyyy-MM-dd`) are formatted to Russian short form via `formatDate()`:
- `2026-09-14` → `14 сент. 2026`

Month separator labels use full form via `monthKey()`:
- `2026-09-14` → `Сентябрь 2026`

Month separators appear when the month changes between consecutive entries. Since entries are ordered `operation_date DESC`, separators appear between months as you scroll down.

---

## Photo support

`TimelineEntry.photo_url` is typed `string | null` and is stored in the `operations` table.

**Current state**: The seed data contains no photos (all `photo_url` are `null`). No photo upload flow exists.

**Rendering**: When `photo_url` is non-null, a small thumbnail (h-8 w-12, object-cover) is shown in the card header as a link that opens the image in a new tab.

**Gap**: There is no upload UI. Photos must be manually stored at an accessible URL and inserted directly into the database. To complete photo support, a file upload endpoint and UI control are needed. This is documented but not implemented; the placeholder cost is zero bytes — the renderer simply renders nothing when `photo_url` is null.

---

## Data source

All timeline data comes from PostgreSQL. No mock data.

Query: `getFieldById(id)` in `lib/data.ts`
```sql
SELECT id, field_id, operation_type, operation_date::text, title, notes, payload, photo_url
FROM operations
WHERE field_id = $1
ORDER BY operation_date DESC, id DESC
```

Payload is stored as JSONB. TypeScript payload interfaces (`lib/operation-types.ts`) enforce field-level types at the application layer.

---

## Before / After summary

### Before

- Dates: raw ISO (`2026-09-14`)
- Type indicator: text-only badge (4 tones: default / warning / danger / success)
- Timeline dot: uniform `brand-600`
- Card structure: left title/notes + right flat-list detail panel (260 px)
- Key numbers: buried inside right detail panel
- Disease scores: `N/5 — label` text string (e.g. "4/5 — сильно")
- NPK: three separate label:value rows
- Harvest calibration: three separate label:value rows
- Photos: not rendered (ignored)
- Month navigation: none

### After

- Dates: Russian short form (`14 сент. 2026`)
- Type indicator: coloured badge with icon + matching left border stripe
- Timeline dot: coloured icon dot per operation type (8 distinct colours)
- Card structure: left column has title + **headline stat chips** for fast scanning; right detail panel (272 px) has secondary data
- Key numbers: prominent stat chips in left column (yield, volume, dose, emergence, etc.)
- Disease scores: 5-dot score bars with severity-based colour, only non-zero scores shown
- NPK: single-row inline triple with N / P / K in distinct colours
- Harvest calibration: proportional stacked bar with percentage labels
- Photos: thumbnail shown if `photo_url` is set; gap documented
- Month navigation: group separators between months

---

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS — 0 errors |
| `npm run lint` | PASS — 0 warnings |
| `npm test` | PASS — 12/12 |
| `npm run build` | PASS — production build clean |
| Data source | PostgreSQL only; no mock data |
