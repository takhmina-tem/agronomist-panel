import { NextResponse } from 'next/server';
import { getFields, createField } from '@/lib/data';

export async function GET() {
  const data = await getFields();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    name?: string;
    area_ha?: number;
    variety_id?: number;
    current_phase?: string;
  };

  const { name, area_ha, variety_id, current_phase } = body;

  if (!name?.trim())   return NextResponse.json({ error: 'Укажите название поля' },     { status: 400 });
  if (!area_ha || area_ha <= 0) return NextResponse.json({ error: 'Укажите площадь поля' }, { status: 400 });
  if (!variety_id)     return NextResponse.json({ error: 'Выберите сорт' },              { status: 400 });

  try {
    const row = await createField({ name: name.trim(), area_ha, variety_id, current_phase });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Не удалось создать поле', details: String(error) }, { status: 500 });
  }
}
