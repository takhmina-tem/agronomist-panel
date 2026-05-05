/**
 * GET /api/cron/daily-telegram-summary
 *
 * Called by Vercel cron scheduler at 04:00 UTC (= 09:00 Asia/Almaty).
 * Protected by Authorization: Bearer <CRON_SECRET>.
 *
 * Optional query param:  ?date=YYYY-MM-DD  — override date for manual testing.
 * Default:               previous day in Asia/Almaty timezone.
 *
 * Returns JSON: { ok, date, recipients, sent, failed }
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildDailyOperationsSummary, getYesterdayInTimezone } from '@/lib/daily-summary';
import { sendTelegramMessage } from '@/lib/telegram';

const TZ = process.env.DAILY_SUMMARY_TIMEZONE ?? 'Asia/Almaty';

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured on server' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Date ────────────────────────────────────────────────────────────────────
  const dateParam = request.nextUrl.searchParams.get('date') ?? undefined;
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
  }
  const targetDate = dateParam ?? getYesterdayInTimezone(TZ);

  // ── Recipients ──────────────────────────────────────────────────────────────
  const recipients = await query<{ id: number; chat_id: string; label: string | null }>(`
    SELECT id, chat_id, label
    FROM   telegram_recipients
    WHERE  is_active = true
    ORDER  BY id
  `);

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, date: targetDate, recipients: 0, sent: 0, failed: 0 });
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const summary = await buildDailyOperationsSummary(targetDate, TZ);

  // ── Send — each recipient independently, never abort on single failure ──────
  let sent   = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      await sendTelegramMessage(r.chat_id, summary);
      sent++;
    } catch (err) {
      failed++;
      errors.push(`chat_id ${r.chat_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok:         failed === 0,
    date:       targetDate,
    recipients: recipients.length,
    sent,
    failed,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
