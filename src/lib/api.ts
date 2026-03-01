import { AQIStation, Region } from './types';
import { getStations } from './simulation';
import { createClient } from '@insforge/sdk';

const WAQI_BASE_URL = 'https://api.waqi.info/search/';

const REGION_KEYWORDS: Record<Region, string> = {
    'Delhi': 'Delhi',
    'Haryana': 'Haryana',
    'Punjab': 'Punjab'
};

type WAQIStation = {
    uid: number;
    aqi: string;
    time: {
        stime: string;
        vtime: number;
        tz: string;
    };
    station: {
        name: string;
        geo: [number, number];
        url: string;
    };
};

type WAQIResponse = {
    status: string;
    data: WAQIStation[];
};

function getInsforgeClient() {
    return createClient({
        baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY!,
    });
}

async function persistWAQIReadings(stations: AQIStation[]) {
    try {
        const insforge = getInsforgeClient();
        const readings = stations.flatMap((s) => {
            const measuredAt = s.lastUpdated || new Date().toISOString();
            const params: Record<string, number> = {
                pm25: s.pm25,
                pm10: s.pm10,
                no2: s.no2,
                so2: s.so2,
                co: s.co,
            };
            return Object.entries(params)
                .filter(([, v]) => v != null && !isNaN(v))
                .map(([param, value]) => ({
                    station_source: 'waqi',
                    station_source_id: s.id,
                    parameter: param,
                    value,
                    unit: param === 'co' ? 'mg/m3' : 'ug/m3',
                    measured_at: measuredAt,
                    quality_flag: 'estimated',
                }));
        });

        if (readings.length > 0) {
            // Batch insert in chunks of 500
            for (let i = 0; i < readings.length; i += 500) {
                await insforge.database
                    .from('historical_readings')
                    .insert(readings.slice(i, i + 500));
            }
        }
    } catch (err) {
        console.error('Failed to persist WAQI readings:', err);
    }
}

export async function fetchLiveAQI(region: Region): Promise<AQIStation[]> {
    const token = process.env.WAQI_API_TOKEN;

    if (!token) {
        console.warn('WAQI_API_TOKEN is missing. Falling back to simulated data.');
        return [];
    }

    const keyword = REGION_KEYWORDS[region];
    const url = `${WAQI_BASE_URL}?keyword=${keyword}&token=${token}`;

    try {
        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            console.error(`WAQI API Error: ${res.statusText}`);
            return [];
        }

        const json: WAQIResponse = await res.json();

        if (json.status !== 'ok') {
            console.error('WAQI API returned non-ok status');
            return [];
        }

        const stations: AQIStation[] = json.data
            .filter(item => item.station.geo && item.station.geo.length === 2 && !isNaN(Number(item.aqi)))
            .map(item => {
                const aqi = Number(item.aqi);
                return {
                    id: `waqi-${item.uid}`,
                    name: item.station.name,
                    location: {
                        lat: item.station.geo[0],
                        lng: item.station.geo[1],
                    },
                    aqi,
                    pm25: aqi,
                    pm10: Math.round(aqi * 1.2),
                    no2: Math.round(aqi * 0.1),
                    so2: Math.round(aqi * 0.05),
                    co: Math.round(aqi * 0.15),
                    lastUpdated: item.time.stime,
                    source: 'CPCB',
                };
            });

        // Persist to DB asynchronously (fire-and-forget)
        if (stations.length > 0) {
            persistWAQIReadings(stations);
        }

        return stations;
    } catch (err) {
        console.error('Failed to fetch WAQI data:', err);
        return [];
    }
}
