import { NextResponse } from 'next/server';
import { getCorrelatedData } from '@/lib/data/historical';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const stationId = searchParams.get('station_id');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to parameters required' }, { status: 400 });
  }

  try {
    const data = await getCorrelatedData({
      from,
      to,
      stationSourceId: stationId || undefined,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
