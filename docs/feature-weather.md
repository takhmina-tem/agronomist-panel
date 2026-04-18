# Weather Feature — Feature Documentation

## Status summary

| Feature | Status |
|---|---|
| Current conditions | READY |
| 7-day forecast | READY |
| GTK (Гидротермический коэффициент) | READY |
| Agronomic spray advisory | READY |
| Per-field weather | MISSING — no coordinates on fields table |
| Rainfall vs irrigation comparison | MISSING — no weather storage in DB |

---

## Provider: Open-Meteo

**No API key required.** No secrets to manage beyond the farm location coordinates.

- Forecast: `https://api.open-meteo.com/v1/forecast`
- Historical: `https://archive-api.open-meteo.com/v1/archive`
- Archive latency: ~2–5 days. Implementation uses `today − 3 days` as safe end date.
- Response caching: Next.js `fetch` cache with `revalidate: 3600` (1 hour).

---

## Configuration

Add to `.env.local`:

```
FARM_LAT=51.18
FARM_LON=71.45
FARM_LOCATION_NAME=Ваш регион
```

Defaults (51.18°N, 71.45°E = Астана, Казахстан) are set in `lib/weather.ts` so the
page renders correctly without any configuration. Coordinates can be obtained via
Google Maps → right-click → "Что здесь?".

---

## Current conditions card

Shows:
- Temperature (°C)
- Weather description (WMO code → Russian text)
- Humidity (%)
- Wind speed (m/s)
- Precipitation (mm, last hour)

WMO codes are translated in `wmoDescription()` in `lib/weather.ts`. Icon mapping
uses 5 lucide-react icons: Sun / Cloud / CloudRain / CloudSnow / Zap.

---

## 7-day forecast strip

7 cards in a horizontal grid (desktop). Each shows:
- Day label (Сегодня, or Пн 14 апр etc.)
- Weather icon
- Max/min temperature
- Precipitation sum (shown only when > 0)

Today's card is highlighted with a ring.

---

## GTK — Гидротермический коэффициент Селянинова

**Formula:**
```
ГТК = Σ(осадки_мм) / (0,1 × Σ(T_ср при T_ср > 10°C))
```

Where `T_ср = (T_max + T_min) / 2` per calendar day.

**Period:** April 1 of the current year through `today − 3 days`.

**Minimum threshold:** result is shown as `—` if fewer than 5 days have `T_avg > 10°C`.
Early-season (e.g. first week of April in cold regions) will show this state.

**Interpretation (Selyaninov scale):**

| GTK | Russian interpretation |
|-----|------------------------|
| < 0.5 | Очень сухо (засуха) |
| 0.5 – 1.0 | Сухо |
| 1.0 – 1.5 | Норма |
| 1.5 – 2.0 | Влажно |
| > 2.0 | Избыточное увлажнение |

The card shows the GTK value, interpretation, Σ precipitation, Σ temperature, days used,
and the full interpretation scale for reference.

**Live test result** (April 12, 2026, Астана defaults, period Apr 1–Apr 9):
- Σ precipitation: 12.5 mm (12.2 mm rain on Apr 9)
- Σ T_avg > 10°C: ~57.5°C across 5 days
- GTK ≈ 2.17 → Избыточное увлажнение

---

## Spray advisory

Pure rule-based evaluation of current conditions. No ML.

| Condition | Threshold | Impact |
|---|---|---|
| Wind | ≤ 5 m/s | Spray drift risk above 5 m/s |
| Precipitation | = 0 mm | Wash-off if raining |
| Temperature | 10–28°C | Below 10: insufficient efficacy; above 28: phytotoxicity risk |
| Humidity | < 90% | Dilution risk at high humidity |

All four conditions met → green "Условия подходят для обработки СЗР"  
Any one failed → amber alert with specific reasons listed.

---

## Architecture

```
lib/weather.ts
  ├─ getFarmCoordinates()         reads FARM_LAT / FARM_LON / FARM_LOCATION_NAME
  ├─ fetchWeatherForecast()       GET api.open-meteo.com/v1/forecast
  ├─ calculateSeasonGtk()         GET archive-api.open-meteo.com/v1/archive
  ├─ getSprayAdvisory()           pure function, no network
  └─ wmoDescription() / wmoIconName()   WMO code helpers

app/weather/page.tsx
  └─ server component (dynamic = 'force-dynamic')
       ├─ calls fetchWeatherForecast + calculateSeasonGtk in Promise.all
       ├─ renders CurrentCard, ForecastStrip, SprayCard, GtkCard
       └─ gracefully degrades if Open-Meteo is unreachable (shows error card)
```

The page uses `export const dynamic = 'force-dynamic'` to skip build-time
prerendering. Weather should be fresh per-request, not from a stale build snapshot.
The `revalidate: 3600` on the `fetch` calls means repeated loads within an hour
are served from Next.js cache without re-hitting Open-Meteo.

---

## Files changed / added

| File | Change |
|---|---|
| `lib/weather.ts` | New — types, API client, GTK, spray advisory |
| `app/weather/page.tsx` | New — weather page server component |
| `.env.local` | Added FARM_LAT, FARM_LON, FARM_LOCATION_NAME |
| `.env.example` | Added same vars with defaults |
| `app/page.tsx` | Added "Погода и ГТК" nav link in Справочники section |

---

## Dependency gaps

### Per-field weather (MISSING)

The `fields` table has no `lat_deg` / `lon_deg` columns. All fields share the
single farm-level location from env vars.

To enable per-field weather:
1. Add migration `003_add_field_coordinates.sql`:
   ```sql
   alter table fields
     add column if not exists lat_deg numeric(9,6),
     add column if not exists lon_deg numeric(9,6);
   ```
2. Update seed with coordinates for the 3 test fields.
3. Update `getFieldById()` to return coordinates.
4. Pass `lat`/`lon` to `fetchWeatherForecast()` on the field page.

### Rainfall vs irrigation water balance (MISSING)

The per-field irrigation chart (`FieldIrrigationChart`) shows manual irrigation
events from the operations table. To add rainfall to the water balance chart,
historical precipitation would need to be fetched from Open-Meteo at field level
and overlaid. This requires per-field coordinates (see above) and storing or
fetching per-field precipitation for the season.

### Multi-day GTK trend (MISSING)

A chart showing GTK rolling over the season (weekly bins) would show drought/wet
progression. Requires storing daily precipitation history per location — either
in the DB or by fetching a full season from the archive API at page load.
