/**
 * lib/weather.ts
 *
 * Open-Meteo integration — no API key required.
 *
 * Endpoints:
 *   https://api.open-meteo.com/v1/forecast      current + 7-day forecast
 *   https://archive-api.open-meteo.com/v1/archive  historical daily (for GTK)
 *
 * Farm location is configured via .env.local:
 *   FARM_LAT, FARM_LON, FARM_LOCATION_NAME
 * Defaults to 51.89666°N, 77.036267°E so the page works without config.
 */

// ── Location ──────────────────────────────────────────────────────────────────

export type FarmCoordinates = {
  lat: number;
  lon: number;
  name: string;
};

export function getFarmCoordinates(): FarmCoordinates {
  const name = process.env.FARM_LOCATION_NAME;
  return {
    lat:  parseFloat(process.env.FARM_LAT  ?? '51.89666'),
    lon:  parseFloat(process.env.FARM_LON  ?? '77.036267'),
    name: name && name.trim() ? name : `${process.env.FARM_LAT ?? '51.89666'}, ${process.env.FARM_LON ?? '77.036267'}`,
  };
}

// ── WMO weather code helpers ──────────────────────────────────────────────────

/** Human-readable Russian description for a WMO weather code. */
export function wmoDescription(code: number): string {
  if (code === 0)             return 'Ясно';
  if (code <= 3)              return 'Переменная облачность';
  if (code <= 48)             return 'Туман';
  if (code <= 55)             return 'Морось';
  if (code <= 57)             return 'Ледяная морось';
  if (code <= 65)             return 'Дождь';
  if (code <= 67)             return 'Ледяной дождь';
  if (code <= 75)             return 'Снегопад';
  if (code === 77)            return 'Снежные зёрна';
  if (code <= 82)             return 'Ливень';
  if (code <= 86)             return 'Снежный ливень';
  return 'Гроза';
}

/** Lucide icon name for a WMO code — mapped to icons available in lucide-react. */
export type WmoIconName = 'Sun' | 'Cloud' | 'CloudRain' | 'CloudSnow' | 'Zap';

export function wmoIconName(code: number): WmoIconName {
  if (code === 0)  return 'Sun';
  if (code <= 3)   return 'Cloud';
  if (code <= 48)  return 'Cloud';
  if (code <= 67)  return 'CloudRain';
  if (code <= 77)  return 'CloudSnow';
  if (code <= 82)  return 'CloudRain';
  if (code <= 86)  return 'CloudSnow';
  return 'Zap';
}

// ── Forecast types ────────────────────────────────────────────────────────────

export type CurrentWeather = {
  temperature:   number;   // °C
  humidity:      number;   // %
  windspeed:     number;   // m/s
  precipitation: number;   // mm (last hour)
  weathercode:   number;   // WMO code
  description:   string;   // human-readable
};

export type DailyForecast = {
  date:        string;
  tempMax:     number;
  tempMin:     number;
  precipSum:   number;
  weathercode: number;
  description: string;
};

export type WeatherForecastData = {
  current: CurrentWeather;
  daily:   DailyForecast[];
};

// ── Forecast fetch ────────────────────────────────────────────────────────────

export async function fetchWeatherForecast(
  lat: number,
  lon: number,
): Promise<WeatherForecastData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'current',
    'temperature_2m,relativehumidity_2m,precipitation,weathercode,windspeed_10m',
  );
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
  );
  url.searchParams.set('timezone',       'auto');
  url.searchParams.set('forecast_days',  '7');
  url.searchParams.set('wind_speed_unit','ms');

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo forecast: HTTP ${res.status}`);

  const data = await res.json() as {
    current: Record<string, number>;
    daily:   Record<string, (number | string)[]>;
  };

  const c = data.current;
  const current: CurrentWeather = {
    temperature:   Number(c.temperature_2m),
    humidity:      Number(c.relativehumidity_2m),
    windspeed:     Number(c.windspeed_10m),
    precipitation: Number(c.precipitation),
    weathercode:   Number(c.weathercode),
    description:   wmoDescription(Number(c.weathercode)),
  };

  const d = data.daily;
  const daily: DailyForecast[] = (d.time as string[]).map((date, i) => ({
    date,
    tempMax:     Number(d.temperature_2m_max[i]),
    tempMin:     Number(d.temperature_2m_min[i]),
    precipSum:   Number(d.precipitation_sum[i]),
    weathercode: Number(d.weathercode[i]),
    description: wmoDescription(Number(d.weathercode[i])),
  }));

  return { current, daily };
}

// ── GTK (Гидротермический коэффициент Селянинова) ─────────────────────────────

export type GtkResult = {
  gtk:            number | null;
  precipSum:      number;   // mm, entire period
  tempSum:        number;   // Σ T_avg on days where T_avg > 10°C
  daysUsed:       number;   // days contributing to denominator
  periodStart:    string;
  periodEnd:      string;
  interpretation: string;
};

function gtkInterpretation(gtk: number): string {
  if (gtk < 0.5)  return 'Очень сухо (засуха)';
  if (gtk < 1.0)  return 'Сухо';
  if (gtk < 1.5)  return 'Норма';
  if (gtk < 2.0)  return 'Влажно';
  return 'Избыточное увлажнение';
}

/**
 * Calculate GTK for the current potato vegetation season.
 * Season start: April 1 of the current year.
 * Season end:   today − 3 days (archive API latency).
 */
export async function calculateSeasonGtk(
  lat: number,
  lon: number,
): Promise<GtkResult> {
  const today      = new Date();
  const seasonStart = new Date(today.getFullYear(), 3, 1); // April 1
  const endDate     = new Date(today);
  endDate.setDate(today.getDate() - 3);                    // 3-day lag

  const toISO = (d: Date) => d.toISOString().split('T')[0];

  if (endDate < seasonStart) {
    return {
      gtk: null, precipSum: 0, tempSum: 0, daysUsed: 0,
      periodStart: toISO(seasonStart),
      periodEnd:   toISO(endDate),
      interpretation: 'Сезон ещё не начался (ранее 1 апреля)',
    };
  }

  const start = toISO(seasonStart);
  const end   = toISO(endDate);

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('start_date', start);
  url.searchParams.set('end_date',   end);
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo archive: HTTP ${res.status}`);

  const data = await res.json() as {
    daily: Record<string, (number | null)[]>;
  };

  const d = data.daily;
  let precipSum = 0;
  let tempSum   = 0;
  let daysUsed  = 0;

  for (let i = 0; i < d.time.length; i++) {
    const tMax  = Number(d.temperature_2m_max[i]  ?? 0);
    const tMin  = Number(d.temperature_2m_min[i]  ?? 0);
    const tAvg  = (tMax + tMin) / 2;
    const precip = Number(d.precipitation_sum[i] ?? 0);

    precipSum += precip;
    if (tAvg > 10) {
      tempSum  += tAvg;
      daysUsed += 1;
    }
  }

  const r = (x: number) => Math.round(x * 10) / 10;

  if (daysUsed < 5) {
    return {
      gtk: null,
      precipSum: r(precipSum),
      tempSum:   r(tempSum),
      daysUsed,
      periodStart: start,
      periodEnd:   end,
      interpretation: 'Недостаточно тёплых дней для расчёта (нужно ≥5 дней с T > 10°C)',
    };
  }

  const gtk = r(precipSum / (0.1 * tempSum));
  return {
    gtk,
    precipSum: r(precipSum),
    tempSum:   Math.round(tempSum),
    daysUsed,
    periodStart: start,
    periodEnd:   end,
    interpretation: gtkInterpretation(gtk),
  };
}

// ── Agronomic spray advisory ──────────────────────────────────────────────────

export type SprayAdvisory = {
  safe:     boolean;
  reasons:  string[];   // warnings when not safe
  summary:  string;
};

export function getSprayAdvisory(c: CurrentWeather): SprayAdvisory {
  const reasons: string[] = [];

  if (c.windspeed > 5)       reasons.push(`Ветер ${c.windspeed} м/с — снос препарата (норма: ≤5 м/с)`);
  if (c.precipitation > 0)   reasons.push('Идут осадки — препарат будет смыт');
  if (c.temperature < 10)    reasons.push(`Температура ${c.temperature}°C — ниже минимума эффективности (≥10°C)`);
  if (c.temperature > 28)    reasons.push(`Температура ${c.temperature}°C — риск фитотоксичности при жаре`);
  if (c.humidity > 90)       reasons.push(`Влажность ${c.humidity}% — риск снижения концентрации препарата`);

  const safe = reasons.length === 0;
  return {
    safe,
    reasons,
    summary: safe
      ? 'Условия подходят для обработки СЗР'
      : 'Обработка не рекомендуется',
  };
}

// ── Precipitation for water-balance chart ─────────────────────────────────────

/**
 * Fetch daily precipitation totals from the Open-Meteo archive for a date
 * range. Used to overlay rainfall on top of manual irrigation in the field
 * analytics chart.
 *
 * Returns [] when:
 *   - startDate > effective endDate (archive lag or pre-season request)
 *   - the API call fails for any reason (graceful — non-critical data)
 *
 * Location: pass field coordinates when available; otherwise use the farm-level
 * coordinates returned by getFarmCoordinates().
 * The archive API has a ~3-day lag, so endDate is clamped automatically.
 */
export async function fetchSeasonPrecipitation(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<{ date: string; precipMm: number }[]> {
  const today = new Date();
  const maxEnd = new Date(today);
  maxEnd.setDate(today.getDate() - 3);
  const toISO = (d: Date) => d.toISOString().split('T')[0];
  const safeEnd = endDate < toISO(maxEnd) ? endDate : toISO(maxEnd);

  if (startDate > safeEnd) return [];

  try {
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude',   String(lat));
    url.searchParams.set('longitude',  String(lon));
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date',   safeEnd);
    url.searchParams.set('daily',      'precipitation_sum');
    url.searchParams.set('timezone',   'auto');

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = await res.json() as {
      daily: { time: string[]; precipitation_sum: (number | null)[] };
    };

    return data.daily.time.map((date, i) => ({
      date,
      precipMm: Math.round((Number(data.daily.precipitation_sum[i] ?? 0)) * 10) / 10,
    }));
  } catch {
    return [];
  }
}
