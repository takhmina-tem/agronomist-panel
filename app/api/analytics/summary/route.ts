import { NextResponse } from 'next/server';
import { getComparison, getDashboardSummary } from '@/lib/data';

export async function GET() {
  const [summary, comparison] = await Promise.all([getDashboardSummary(), getComparison()]);
  return NextResponse.json({ ...summary, comparison });
}
