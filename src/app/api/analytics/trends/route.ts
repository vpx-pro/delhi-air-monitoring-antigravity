import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

function getClient() {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY!,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'overview';
  const parameter = searchParams.get('parameter') || 'pm25';
  const stationId = searchParams.get('station_id') || null;
  const month = searchParams.get('month'); // for yoy view

  const insforge = getClient();

  try {
    let data;

    if (view === 'overview' || view === 'yoy') {
      // Read from pre-computed overview table
      let q = insforge.database
        .from('analytics_delhi_overview')
        .select()
        .eq('parameter', parameter)
        .order('period', { ascending: true });

      if (view === 'yoy' && month) {
        const monthStr = month.padStart(2, '0');
        q = q.like('period', `%-${monthStr}`);
      }

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      data = rows;
    } else if (view === 'station') {
      // Read from pre-computed monthly trends table
      let q = insforge.database
        .from('analytics_monthly_trends')
        .select()
        .eq('parameter', parameter)
        .order('period', { ascending: true });

      if (stationId) {
        q = q.eq('station_source_id', stationId);
      }

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      data = rows;
    } else if (view === 'heatmap') {
      // Read from pre-computed station yearly table
      const { data: rows, error } = await insforge.database
        .from('analytics_station_yearly')
        .select()
        .order('station_source_id', { ascending: true });

      if (error) throw new Error(error.message);
      data = rows;
    } else {
      return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
    }

    return NextResponse.json({ data: data || [], count: data?.length || 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
