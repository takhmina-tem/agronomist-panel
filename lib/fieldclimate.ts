/**
 * lib/fieldclimate.ts
 * FieldClimate API v1 — precipitation data only.
 *
 * Auth: HMAC-SHA256
 *   Authorization: hmac {public_key}:{hex_signature}
 *   String-to-sign: METHOD + REQUEST_PATH + DATE + PUBLIC_KEY (concatenated, no separators)
 *   REQUEST_PATH is the path relative to the API base, e.g. /data/{id}/daily/...
 *   Date header: RFC 2616 UTC string (new Date().toUTCString())
 *
 * Required env variables:
 *   FIELDCLIMATE_PUBLIC_KEY    — HMAC public key
 *   FIELDCLIMATE_PRIVATE_KEY   — HMAC private key (never logged)
 *   FIELDCLIMATE_STATION_ID    — station identifier (typically 8 chars)
 * Optional:
 *   FIELDCLIMATE_API_BASE_URL  — default: https://api.fieldclimate.com/v1
 */

import { createHmac } from 'crypto';

function apiBase(): string {
  return (process.env.FIELDCLIMATE_API_BASE_URL ?? 'https://api.fieldclimate.com/v1').replace(/\/$/, '');
}

export function isFieldClimateConfigured(): boolean {
  return !!(
    process.env.FIELDCLIMATE_PUBLIC_KEY &&
    process.env.FIELDCLIMATE_PRIVATE_KEY &&
    process.env.FIELDCLIMATE_STATION_ID
  );
}

function hmacHeaders(method: string, path: string): Record<string, string> {
  const publicKey  = process.env.FIELDCLIMATE_PUBLIC_KEY!;
  const privateKey = process.env.FIELDCLIMATE_PRIVATE_KEY!;
  const date       = new Date().toUTCString();

  // FieldClimate string-to-sign: METHOD + PATH + DATE + PUBLIC_KEY (no separators)
  const signature = createHmac('sha256', privateKey)
    .update(method + path + date + publicKey)
    .digest('hex');

  return {
    Authorization: `hmac ${publicKey}:${signature}`,
    Date:          date,
    Accept:        'application/json',
  };
}

export type DailyPrecip = {
  date:     string;   // YYYY-MM-DD
  precipMm: number;   // daily precipitation total, mm
};

/**
 * Fetch daily precipitation totals from a FieldClimate station for a date range.
 * Always returns [] (never throws) when:
 *   - credentials are not configured
 *   - API is unreachable
 *   - response is unparseable
 */
export async function fetchFieldClimatePrecipitation(
  startDate: string,   // YYYY-MM-DD
  endDate:   string,   // YYYY-MM-DD
): Promise<DailyPrecip[]> {
  if (!isFieldClimateConfigured()) return [];

  const stationId = process.env.FIELDCLIMATE_STATION_ID!;

  const fromTs = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
  const toTs   = Math.floor(new Date(endDate   + 'T23:59:59Z').getTime() / 1000);

  // Path relative to API base — used both in URL and HMAC signing
  const path = `/data/${stationId}/daily/from/${fromTs}/to/${toTs}`;

  try {
    const res = await fetch(`${apiBase()}${path}`, {
      headers: hmacHeaders('GET', path),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const raw = await res.json() as unknown;
    return parseDailyPrecipitation(raw);
  } catch {
    return [];
  }
}

function parseDailyPrecipitation(raw: unknown): DailyPrecip[] {
  if (!raw || typeof raw !== 'object') return [];
  const d = raw as Record<string, unknown>;

  // Real FieldClimate shape:
  //   d.sensors — array of sensor descriptors (no vals)
  //   d.data    — array of daily rows: { date: "YYYY-MM-DD HH:MM:SS", "<group>_X_X_<code>_<aggr>": number, ... }
  const sensors = Array.isArray(d.sensors) ? (d.sensors as Record<string, unknown>[]) : [];
  const rows    = Array.isArray(d.data)    ? (d.data    as Record<string, unknown>[]) : [];

  if (sensors.length === 0 || rows.length === 0) return [];

  // Find the precipitation sensor:
  //   - unit === "mm" AND aggr is an object containing a "sum" key, OR
  //   - name / original_name contains rain / precip / осадки
  const rainSensor = sensors.find(s => {
    const unit = String(s.unit ?? '').toLowerCase();
    const name = String(s.name ?? s.original_name ?? s.shortcut ?? '').toLowerCase();
    const aggrIsSum =
      s.aggr !== null &&
      typeof s.aggr === 'object' &&
      'sum' in (s.aggr as object);
    return (unit === 'mm' && aggrIsSum) ||
           name.includes('rain') ||
           name.includes('precip') ||
           name.includes('осадки');
  });

  if (!rainSensor) return [];

  // Build the data-row key: "<group>_X_X_<code>_<aggrKey>", e.g. "5_X_X_6_sum"
  const aggrKey = Object.keys(rainSensor.aggr as object)[0] ?? 'sum';
  const dataKey = `${rainSensor.group}_X_X_${rainSensor.code}_${aggrKey}`;

  return rows
    .map(row => ({
      date:     String(row.date ?? '').slice(0, 10),
      precipMm: Math.round(Number(row[dataKey] ?? 0) * 10) / 10,
    }))
    .filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.precipMm));
}
