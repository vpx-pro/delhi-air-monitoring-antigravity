import { NextResponse } from 'next/server';
import { CPCB_STATIONS } from '@/lib/simulation';

export async function GET() {
    // In a real app, this would fetch from Supabase:
    // const { data } = await supabase.from('cpcb_stations').select('*');

    // For demo/prototype, return simulated static data
    return NextResponse.json(CPCB_STATIONS);
}
