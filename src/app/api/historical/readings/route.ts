import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('station_id');
  const parameter = searchParams.get('parameter') || 'pm25';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const source = searchParams.get('source');
  const limit = parseInt(searchParams.get('limit') || '1000', 10);

  const insforge = await createClient();

  let query = insforge.database
    .from('historical_readings')
    .select()
    .eq('parameter', parameter)
    .order('measured_at', { ascending: false })
    .limit(limit);

  if (stationId) {
    query = query.eq('station_source_id', stationId);
  }
  if (source) {
    query = query.eq('station_source', source);
  }
  if (from) {
    query = query.gte('measured_at', from);
  }
  if (to) {
    query = query.lte('measured_at', to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data?.length || 0 });
}
