import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const rows = await query<{
    id: number;
    chat_id: string;
    label: string | null;
    is_active: boolean;
    created_at: string;
  }>(`
    SELECT id, chat_id, label, is_active, created_at::text
    FROM   telegram_recipients
    ORDER  BY id
  `);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { chat_id?: string; label?: string };

  const chatId = body.chat_id?.trim();
  if (!chatId) {
    return NextResponse.json({ error: 'chat_id обязателен' }, { status: 400 });
  }

  try {
    const [row] = await query<{ id: number }>(`
      INSERT INTO telegram_recipients (chat_id, label)
      VALUES ($1, $2)
      RETURNING id
    `, [chatId, body.label?.trim() || null]);

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('unique')) {
      return NextResponse.json({ error: 'Этот chat_id уже добавлен' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Не удалось добавить получателя' }, { status: 500 });
  }
}
