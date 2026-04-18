# Weather Feature — Implementation Plan

## Constraints found during inspection

### No field coordinates in DB
`fields` table has no `lat_deg` / `lon_deg` columns. Per-field weather is not possible
without a schema migration and updated seed data. Deferred to a future migration.

### No weather code anywhere
Zero weather files, zero weather-related env vars. Full greenfield.

### GTK feasibility
GTK (Гидротермический коэффициент Селянинова) = Σ(precipitation_mm) / (0.1 × Σ(T_avg where T_avg > 10°C))
- Requires daily precipitation + daily max/min temperature for the vegetation period.
- Open-Meteo archive API provides exactly this from 1940 to ~3 days ago.
- **Feasible** given a configured farm location and a vegetation season start date.

---

## Provider: Open-Meteo

Chosen because:
- Free, no API key required, no rate limits for reasonable use
- Provides: current conditions, 7-day forecast, historical daily data
- Trusted by European agrometeo platforms
- No secrets to manage for the basic integration

Endpoints used:
- `https://api.open-meteo.com/v1/forecast` — current + 7-day forecast
- `https://archive-api.open-meteo.com/v1/archive` — historical daily data for GTK

---

## Location strategy

Since `fields` has no coordinates, weather is farm-level, not per-field.

Configuration via `.env.local`:
```
FARM_LAT=51.18
FARM_LON=71.45
FARM_LOCATION_NAME=Северо-Казахстанский регион
```

Defaults (51.18°N, 71.45°E = Астана, Казахстан) make the page work out of the box.
User changes `.env.local` to their actual farm coordinates.

Future: add `lat_deg NUMERIC(9,6)` and `lon_deg NUMERIC(9,6)` columns to `fields`
via migration 003, allowing per-field weather queries.

---

## Caching

Weather page uses `export const dynamic = 'force-dynamic'` to skip build-time
prerendering. At runtime, Next.js `fetch` cache is used with `revalidate: 3600`
(1 hour) so repeated page loads don't hammer Open-Meteo.

---

## GTK calculation details

- Season start: April 1 of the current year (standard for potato in the region)
- Season end: `today - 3 days` (archive API latency is ~2–5 days)
- T_avg = (T_max + T_min) / 2 per day
- Only days where T_avg > 10°C contribute to the denominator
- Result is `null` if fewer than 5 qualifying days exist (too early in season)

Interpretation scale (Selyaninov):
| GTK | Meaning |
|-----|---------|
| < 0.5 | Очень сухо (засуха) |
| 0.5 – 1.0 | Сухо |
| 1.0 – 1.5 | Норма |
| 1.5 – 2.0 | Влажно |
| > 2.0 | Избыточное увлажнение |

---

## Agronomic spray advisory

Derived from current conditions (no ML, pure rules):
- Wind < 5 m/s → safe for application
- Precipitation == 0 → safe
- Temperature 10–25°C → optimal efficacy
- Humidity < 90% → minimal dilution risk

All four conditions met → "Условия подходят для обработки"
Any one failed → specific warning shown

---

## What is NOT in this version

- Per-field weather (needs lat/lon migration)
- Precipitation forecast vs irrigation plan integration
- Growing degree days (GDD) chart (seasonal accumulation chart; can be added once GTK is stable)
- Historical multi-year comparison
- Push alerts / thresholds
