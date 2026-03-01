import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '28.6');
  const lon = parseFloat(searchParams.get('lon') || '77.2');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = parseInt(searchParams.get('limit') || '500', 10);

  const insforge = await createClient();

  // Find nearest weather station (simple approach: fetch all, pick nearest)
  const { data: stations } = await insforge.database
    .from('weather_stations')
    .select();

  if (!stations || stations.length === 0) {
    return NextResponse.json({ data: [], count: 0 });
  }

  // Pick closest station using simple distance
  let nearest = stations[0] as any;
  let minDist = Infinity;
  for (const s of stations as any[]) {
    const d = Math.sqrt(Math.pow(s.latitude - lat, 2) + Math.pow(s.longitude - lon, 2));
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }

  let query = insforge.database
    .from('weather_readings')
    .select()
    .eq('station_id', nearest.id)
    .order('measured_at', { ascending: false })
    .limit(limit);

  if (from) query = query.gte('measured_at', from);
  if (to) query = query.lte('measured_at', to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data?.length || 0, station: nearest });
}
