/**
 * lib/daily-summary.ts
 * Build a plain-text daily operations summary for Telegram.
 *
 * Reads operations from PostgreSQL read-only SELECT — no writes.
 * Timezone: Asia/Almaty (UTC+5, no DST) by default.
 * Time shown per operation is derived from created_at (timestamptz),
 * because operation_date is DATE only (no time component).
 * Fields table has no notes column — only operation.notes is shown.
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

const OP_EMOJI: Record<string, string> = {
  planting:        '🌱',
  inspection:      '🔬',
  fertilizer:      '🌿',
  fertilization:   '🌿',
  irrigation:      '💧',
  crop_protection: '🛡',
  desiccation:     '☀️',
  harvest:         '🌾',
  storage:         '📦',
};

const STATUS_LABELS: Record<string, string> = {
  completed:   '✓',
  in_progress: 'в работе',
  planned:     'запланировано',
};

const SEP = '━━━━━━━━━━━━━━━━━━';

function opLabel(type: string): string  { return OP_LABELS[type] ?? type; }
function opEmoji(type: string): string  { return OP_EMOJI[type]  ?? '📋'; }
function fmtArea(ha: number): string    { return (ha % 1 === 0 ? ha.toFixed(0) : ha.toFixed(1)) + ' га'; }

function fmtStatus(status: string | null): string {
  if (!status) return '';
  return STATUS_LABELS[status] ?? status;
}

/**
 * Return yesterday's date string (YYYY-MM-DD) in the given IANA timezone.
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
  field_id: number;
  field_name: string;
  area_ha: string;
  operation_type: string;
  operation_date: string;
  created_time: string;   // HH:MI localized to requested timezone
  status: string | null;
  notes: string | null;
};

/**
 * Build a compact plain-text summary grouped by field.
 * If date is omitted, defaults to yesterday in the given timezone.
 */
export async function buildDailyOperationsSummary(
  date?: string,
  tz: string = DEFAULT_TZ,
): Promise<string> {
  const targetDate = date ?? getYesterdayInTimezone(tz);

  const rows = await query<OperationRow>(`
    SELECT
      o.id,
      f.id                                              AS field_id,
      f.name                                            AS field_name,
      f.area_ha::text,
      o.operation_type,
      o.operation_date::text,
      to_char(o.created_at AT TIME ZONE $2, 'HH24:MI') AS created_time,
      o.status,
      o.notes
    FROM  operations o
    JOIN  fields f ON f.id = o.field_id
    WHERE o.operation_date = $1
    ORDER BY f.id, o.id
  `, [targetDate, tz]);

  if (rows.length === 0) {
    return `📅 Сводка за ${targetDate}\n\nЗаписи не найдены.`;
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const fieldAreas = new Map<number, { name: string; ha: number }>();
  rows.forEach(r => {
    if (!fieldAreas.has(r.field_id))
      fieldAreas.set(r.field_id, { name: r.field_name, ha: parseFloat(r.area_ha) || 0 });
  });
  const totalHa = [...fieldAreas.values()].reduce((s, v) => s + v.ha, 0);

  const typeCounts: Record<string, number> = {};
  rows.forEach(r => { typeCounts[r.operation_type] = (typeCounts[r.operation_type] ?? 0) + 1; });

  // ── Group by field (preserve DB order) ───────────────────────────────────────
  const fieldOrder: number[] = [];
  const byField = new Map<number, OperationRow[]>();
  for (const r of rows) {
    if (!byField.has(r.field_id)) { fieldOrder.push(r.field_id); byField.set(r.field_id, []); }
    byField.get(r.field_id)!.push(r);
  }

  // ── Assemble message ──────────────────────────────────────────────────────────
  const lines: string[] = [
    `📅 Сводка за ${targetDate}`,
    '',
    `📊 ${rows.length} операций · ${fieldAreas.size} полей · ${fmtArea(totalHa)}`,
  ];

  for (const fieldId of fieldOrder) {
    const ops  = byField.get(fieldId)!;
    const info = fieldAreas.get(fieldId)!;

    lines.push('');
    lines.push(`🗺 Поле: ${info.name} · ${fmtArea(info.ha)}`);

    for (const op of ops) {
      const sl = fmtStatus(op.status);
      lines.push(`${opEmoji(op.operation_type)} ${opLabel(op.operation_type)} · ${op.created_time}${sl ? ' · ' + sl : ''}`);
      lines.push(`  📝 Примечание: ${op.notes?.trim() || '—'}`);
    }
  }

  lines.push('');
  lines.push('📌 Итого:');
  for (const [type, count] of Object.entries(typeCounts)) {
    lines.push(`• ${opLabel(type)} — ${count}`);
  }

  return lines.join('\n');
}
