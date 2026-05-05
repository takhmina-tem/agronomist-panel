import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/** PATCH /api/settings/telegram/recipients/[id] — toggle is_active (soft delete) */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const rows = await query<{ id: number; is_active: boolean }>(`
    UPDATE telegram_recipients
    SET    is_active  = NOT is_active,
           updated_at = now()
    WHERE  id = $1
    RETURNING id, is_active
  `, [id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}
