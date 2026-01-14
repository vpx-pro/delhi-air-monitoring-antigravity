
import { AQIStation, Region } from './types';
import { getStations } from './simulation';

const WAQI_BASE_URL = 'https://api.waqi.info/search/';

// Region-specific keywords to finding station data
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

export async function fetchLiveAQI(region: Region): Promise<AQIStation[]> {
    const token = process.env.WAQI_API_TOKEN;

    if (!token) {
        console.warn('WAQI_API_TOKEN is missing. Falling back to simulated data.');
        return [];
    }

    const keyword = REGION_KEYWORDS[region];
    const url = `${WAQI_BASE_URL}?keyword=${keyword}&token=${token}`;

    try {
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        if (!res.ok) {
            console.error(`WAQI API Error: ${res.statusText}`);
            return [];
        }

        const json: WAQIResponse = await res.json();

        if (json.status !== 'ok') {
            console.error('WAQI API returned non-ok status');
            return [];
        }

        // Map WAQI data to our AQIStation format
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
                    // Estimate pollutants based on AQI if not available (WAQI search doesn't give details)
                    // This is a rough estimation for visualization only
                    pm25: aqi, // Major driver often
                    pm10: Math.round(aqi * 1.2),
                    no2: Math.round(aqi * 0.1),
                    so2: Math.round(aqi * 0.05),
                    co: Math.round(aqi * 0.15),
                    lastUpdated: item.time.stime,
                    source: 'CPCB', // WAQI aggregates CPCB
                };
            });

        return stations;
    } catch (err) {
        console.error('Failed to fetch WAQI data:', err);
        return [];
    }
}
