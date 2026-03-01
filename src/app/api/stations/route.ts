import { NextResponse } from 'next/server';
import { getStations } from '@/lib/simulation';
import { TimeRange } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'live';

    // For historical ranges, try to get aggregated data from DB
    if (range !== 'live') {
        try {
            const insforge = await createClient();
            const hoursMap: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
            const hours = hoursMap[range] || 24;
            const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

            const { data: readings } = await insforge.database
                .from('historical_readings')
                .select()
                .eq('parameter', 'pm25')
                .gte('measured_at', since)
                .order('measured_at', { ascending: false })
                .limit(500);

            if (readings && readings.length > 0) {
                // Group by station and compute averages
                const stationMap = new Map<string, { values: number[]; source: string }>();
                for (const r of readings as any[]) {
                    const key = r.station_source_id;
                    if (!stationMap.has(key)) {
                        stationMap.set(key, { values: [], source: r.station_source });
                    }
                    stationMap.get(key)!.values.push(r.value);
                }

                // Merge with simulation stations for coordinates
                const simStations = getStations(range);
                const enriched = simStations.map((s) => {
                    const dbData = stationMap.get(s.id);
                    if (dbData) {
                        const avg = dbData.values.reduce((a, b) => a + b, 0) / dbData.values.length;
                        return { ...s, pm25: Math.round(avg), aqi: Math.round(avg) };
                    }
                    return s;
                });

                return NextResponse.json(enriched);
            }
        } catch (err) {
            console.error('DB query failed, falling back to simulation:', err);
        }
    }

    // Fallback to simulated data
    return NextResponse.json(getStations(range));
}
