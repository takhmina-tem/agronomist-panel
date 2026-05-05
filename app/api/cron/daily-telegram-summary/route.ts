/**
 * GET /api/cron/daily-telegram-summary
 *
 * Called by Vercel cron at 04:00 UTC (= 09:00 Asia/Almaty).
 * Protected by: Authorization: Bearer <CRON_SECRET>
 *
 * Query params:
 *   ?date=YYYY-MM-DD  — override target date (default: yesterday in Asia/Almaty)
 *   ?preview=1        — return summary as JSON without sending to Telegram
 *
 * Recipient: single chat from TELEGRAM_CHAT_ID env var (no DB table).
 */

import { NextRequest, NextResponse } from 'next/server';
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
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get('date') ?? undefined;
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
  }
  const targetDate = dateParam ?? getYesterdayInTimezone(TZ);

  // ── Build summary ────────────────────────────────────────────────────────────
  const summaryText = await buildDailyOperationsSummary(targetDate, TZ);

  // ── Preview mode ─────────────────────────────────────────────────────────────
  if (searchParams.get('preview') === '1') {
    return NextResponse.json({ ok: true, preview: true, date: targetDate, text: summaryText });
  }

  // ── Recipient ────────────────────────────────────────────────────────────────
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    return NextResponse.json({ error: 'TELEGRAM_CHAT_ID not configured on server' }, { status: 500 });
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  try {
    await sendTelegramMessage(chatId, summaryText);
    return NextResponse.json({ ok: true, date: targetDate, sent: 1 });
  } catch (err) {
    return NextResponse.json({
      ok:    false,
      date:  targetDate,
      sent:  0,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 502 });
  }
}
