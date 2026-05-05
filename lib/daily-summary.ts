/**
 * lib/daily-summary.ts
 * Build a plain-text daily operations summary for Telegram.
 *
 * Reads operations from PostgreSQL read-only SELECT — no writes.
 * Timezone: Asia/Almaty (UTC+5, no DST) by default.
 */

import { query } from '@/lib/db';

const DEFAULT_TZ = 'Asia/Almaty';

const OP_LABELS: Record<string, string> = {
  planting:        'Посадка',
  inspection:      'Осмотр',
  fertilizer:      'Удобрение',
  fertilization:   'Удобрение',
  irrigation:      'Полив',
  crop_protection: 'Защита СЗР',
  desiccation:     'Десикация',
  harvest:         'Уборка',
  storage:         'Хранение',
};

function opLabel(type: string): string {
  return OP_LABELS[type] ?? type;
}

/**
 * Return yesterday's date string (YYYY-MM-DD) in the given IANA timezone.
 * Uses Intl.DateTimeFormat with en-CA locale, which outputs ISO date format.
 */
export function getYesterdayInTimezone(tz: string = DEFAULT_TZ): string {
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
  return new Date(todayMs - 86_400_000).toISOString().split('T')[0];
}

type OperationRow = {
  id: number;
  operation_type: string;
  operation_date: string;
  title: string;
  field_name: string;
  area_ha: string;
  status: string | null;
};

/**
 * Build a compact plain-text summary of all operations for a given date.
 * If date is omitted, defaults to yesterday in Asia/Almaty timezone.
 * Returns a "no records" message when the day has no operations.
 */
export async function buildDailyOperationsSummary(
  date?: string,
  tz: string = DEFAULT_TZ,
): Promise<string> {
  const targetDate = date ?? getYesterdayInTimezone(tz);

  const rows = await query<OperationRow>(`
    SELECT
      o.id,
      o.operation_type,
      o.operation_date::text,
      o.title,
      f.name        AS field_name,
      f.area_ha::text,
      o.status
    FROM  operations o
    JOIN  fields f ON f.id = o.field_id
    WHERE o.operation_date = $1
    ORDER BY o.id
  `, [targetDate]);

  if (rows.length === 0) {
    return `📅 Сводка за ${targetDate}\n\nЗаписи не найдены.`;
  }

  // Unique fields and their areas
  const fieldAreas = new Map<string, number>();
  rows.forEach(r => fieldAreas.set(r.field_name, parseFloat(r.area_ha) || 0));
  const totalHa = [...fieldAreas.values()].reduce((s, v) => s + v, 0);

  // Count by operation type
  const typeCounts: Record<string, number> = {};
  rows.forEach(r => {
    typeCounts[r.operation_type] = (typeCounts[r.operation_type] ?? 0) + 1;
  });

  const lines: string[] = [
    `📅 Сводка за ${targetDate}`,
    '',
    `Операций: ${rows.length} | Полей: ${fieldAreas.size} | Площадь: ${totalHa.toFixed(1)} га`,
    '',
    'По типам:',
    ...Object.entries(typeCounts).map(([t, c]) => `  • ${opLabel(t)}: ${c}`),
    '',
    'Операции:',
    ...rows.map(r => {
      const status = r.status ? ` · ${r.status}` : '';
      return `  [${r.field_name}] ${opLabel(r.operation_type)} · ${r.operation_date}${status}`;
    }),
  ];

  return lines.join('\n');
}
