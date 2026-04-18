import { NextResponse } from 'next/server';
import { getFieldAnalytics } from '@/lib/data';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Неверный id поля' }, { status: 400 });
  }

  try {
    const data = await getFieldAnalytics(id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Не удалось загрузить аналитику', details: String(err) },
      { status: 500 },
    );
  }
}
