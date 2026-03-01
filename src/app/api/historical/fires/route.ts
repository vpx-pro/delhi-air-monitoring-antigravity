import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const state = searchParams.get('state');
  const summary = searchParams.get('summary') === 'true';
  const limit = parseInt(searchParams.get('limit') || '500', 10);

  const insforge = await createClient();

  if (summary) {
    let query = insforge.database
      .from('fire_daily_summary')
      .select()
      .order('date', { ascending: false })
      .limit(limit);

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    if (state) query = query.eq('state', state);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count: data?.length || 0 });
  }

  let query = insforge.database
    .from('fire_hotspots')
    .select()
    .order('acq_date', { ascending: false })
    .limit(limit);

  if (from) query = query.gte('acq_date', from);
  if (to) query = query.lte('acq_date', to);
  if (state) query = query.eq('state', state);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count: data?.length || 0 });
}
