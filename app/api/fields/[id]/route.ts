import { NextResponse } from 'next/server';
import { getFieldById } from '@/lib/data';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await getFieldById(Number(params.id));
  return NextResponse.json(data);
}
