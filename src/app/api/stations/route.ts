import { NextResponse } from 'next/server';
import { getStations } from '@/lib/simulation';
import { TimeRange } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'live';

    // In a real app, this would fetch from Supabase:
    // const { data } = await supabase.from('cpcb_stations').select('*');

    // For demo/prototype, return simulated static data with range adjustment
    return NextResponse.json(getStations(range));
}
