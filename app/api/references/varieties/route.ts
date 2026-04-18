import { NextResponse } from 'next/server';
import { getVarieties } from '@/lib/data';

export async function GET() {
  return NextResponse.json(await getVarieties());
}
