import { NextResponse } from 'next/server';
import { addOperation } from '@/lib/data';

export async function POST(request: Request) {
  const body = await request.json();
  const { field_id, operation_type, operation_date, title, notes, payload, photo_url, status } = body;

  if (!field_id || !operation_type || !operation_date || !title) {
    return NextResponse.json({ error: 'field_id, operation_type, operation_date и title обязательны' }, { status: 400 });
  }

  try {
    const op = await addOperation({
      field_id,
      operation_type,
      operation_date,
      title,
      notes,
      payload,
      photo_url,
      status,
      current_phase: body.current_phase,
      disease_status: body.disease_status,
    });
    return NextResponse.json(op, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Не удалось создать запись', details: String(error) }, { status: 500 });
  }
}
