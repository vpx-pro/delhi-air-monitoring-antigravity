import { AQIStation, CitizenSensor, CitizenReport, Coordinates, TimeRange } from './types';

// Bounds for random generation (rough approximations)
const REGION_BOUNDS = {
    'Delhi': { north: 28.88, south: 28.40, east: 77.35, west: 76.83 },
    'Haryana': { north: 29.5, south: 28.0, east: 77.5, west: 76.0 }, // Broad area covering Gurugram/Panipat
    'Punjab': { north: 31.0, south: 30.0, east: 76.8, west: 75.5 }, // Ludhiana/Chandigarh area
};

// Base Stations for all regions
const BASE_STATIONS: AQIStation[] = [
    // --- DELHI ---
    {
        id: 'cpcb-001', name: 'Anand Vihar', location: { lat: 28.6469, lng: 77.3160 },
        aqi: 450, pm25: 380, pm10: 450, no2: 85, so2: 20, co: 110, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'cpcb-002', name: 'R.K. Puram', location: { lat: 28.5632, lng: 77.1869 },
        aqi: 320, pm25: 150, pm10: 220, no2: 45, so2: 12, co: 60, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'cpcb-003', name: 'Punjabi Bagh', location: { lat: 28.66197, lng: 77.12415 },
        aqi: 380, pm25: 210, pm10: 310, no2: 65, so2: 18, co: 90, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'cpcb-004', name: 'ITO', location: { lat: 28.6285, lng: 77.2410 },
        aqi: 410, pm25: 290, pm10: 390, no2: 95, so2: 25, co: 120, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'cpcb-005', name: 'Mandir Marg', location: { lat: 28.6364, lng: 77.1987 },
        aqi: 290, pm25: 120, pm10: 200, no2: 40, so2: 10, co: 50, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },

    // --- HARYANA (Gurugram, Faridabad, Panipat) ---
    {
        id: 'hry-001', name: 'Vikas Sadan, Gurugram', location: { lat: 28.4595, lng: 77.0266 },
        aqi: 310, pm25: 140, pm10: 200, no2: 40, so2: 10, co: 55, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'hry-002', name: 'Sector 16A, Faridabad', location: { lat: 28.4089, lng: 77.3178 },
        aqi: 340, pm25: 180, pm10: 250, no2: 55, so2: 15, co: 70, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'hry-003', name: 'GT Road, Panipat', location: { lat: 29.3909, lng: 76.9635 },
        aqi: 280, pm25: 110, pm10: 160, no2: 30, so2: 8, co: 40, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },

    // --- PUNJAB (Ludhiana, Amritsar, Chandigarh/Mohali) ---
    {
        id: 'pjb-001', name: 'Punjab Ag. University, Ludhiana', location: { lat: 30.9010, lng: 75.8573 },
        aqi: 220, pm25: 160, pm10: 190, no2: 25, so2: 5, co: 30, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'pjb-002', name: 'Golden Temple, Amritsar', location: { lat: 31.6200, lng: 74.8765 },
        aqi: 190, pm25: 90, pm10: 140, no2: 20, so2: 5, co: 25, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
    {
        id: 'pjb-003', name: 'Sector 25, Chandigarh', location: { lat: 30.7333, lng: 76.7794 },
        aqi: 150, pm25: 60, pm10: 110, no2: 15, so2: 5, co: 20, lastUpdated: new Date().toISOString(), source: 'CPCB',
    },
];

// Helper to adjust values based on time range
function adjustForRange(val: number, range: TimeRange): number {
    switch (range) {
        case '24h': return Math.floor(val * 0.9);
        case '7d': return Math.floor(val * 0.85);
        case '30d': return Math.floor(val * 0.75);
        case 'live':
        default: return val;
    }
}

export function getStations(range: TimeRange = 'live'): AQIStation[] {
    return BASE_STATIONS.map(s => ({
        ...s,
        aqi: adjustForRange(s.aqi, range),
        pm25: adjustForRange(s.pm25, range),
        pm10: adjustForRange(s.pm10, range),
        no2: adjustForRange(s.no2, range),
        so2: adjustForRange(s.so2, range),
        co: adjustForRange(s.co, range),
    }));
}

// Helper to generate random coordinates near a point
function randomLocationNear(center: Coordinates, radiusKm: number = 2): Coordinates {
    const r = (radiusKm * 1000) / 111300;
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    return {
        lat: center.lat + x,
        lng: center.lng + y,
    };
}

// Generate Citizen Sensors
export function generateSensors(range: TimeRange = 'live', count: number = 50): CitizenSensor[] {
    const sensors: CitizenSensor[] = [];
    const currentStations = getStations(range);

    for (let i = 0; i < count; i++) {
        // Pick a random reference station (randomly distributes sensors across all regions)
        const station = currentStations[Math.floor(Math.random() * currentStations.length)];
        const location = randomLocationNear(station.location, 5); // Broaden radius to 5km for spread

        const noise = (Math.random() - 0.5) * 0.4;
        const localBias = (Math.random() * 50) - 10;

        let valPm25 = station.pm25 * (1 + noise) + localBias;
        valPm25 = Math.max(0, parseFloat(valPm25.toFixed(1)));

        const confidence = parseFloat((0.7 + Math.random() * 0.3).toFixed(2));

        const valPm10 = parseFloat((valPm25 * 1.5 + (Math.random() * 20)).toFixed(1));
        const valNo2 = parseFloat((station.no2 * (1 + (Math.random() - 0.5) * 0.5)).toFixed(1));
        const valSo2 = parseFloat((station.so2 * (1 + (Math.random() - 0.5) * 0.5)).toFixed(1));
        const valCo = parseFloat((station.co * (1 + (Math.random() - 0.5) * 0.5)).toFixed(1));

        sensors.push({
            id: `sensor-${i + 1}`,
            location,
            pm25: valPm25,
            pm10: valPm10,
            no2: valNo2,
            so2: valSo2,
            co: valCo,
            confidence,
            lastUpdated: new Date().toISOString(),
        });
    }
    return sensors;
}

// Generate Citizen Reports
export function generateReports(range: TimeRange = 'live', count: number = 10): CitizenReport[] {
    const reports: CitizenReport[] = [];
    const types: ('GARBAGE_BURNING' | 'CONSTRUCTION_DUST' | 'TRAFFIC_CONGESTION')[] = [
        'GARBAGE_BURNING',
        'CONSTRUCTION_DUST',
        'TRAFFIC_CONGESTION'
    ];

    // Increase count for longer ranges to show "accumulation"
    let multiplier = 1;
    if (range === '24h') multiplier = 1.5;
    if (range === '7d') multiplier = 3;
    if (range === '30d') multiplier = 5;

    const totalCount = Math.floor(count * multiplier);

    for (let i = 0; i < totalCount; i++) {
        // Randomly pick a "Region Center" to spawn reports near
        const centers = [
            { lat: 28.6139, lng: 77.2090 }, // Delhi
            { lat: 28.4595, lng: 77.0266 }, // Gurugram
            { lat: 30.9010, lng: 75.8573 }, // Ludhiana
            { lat: 30.7333, lng: 76.7794 }, // Chandigarh
        ];
        const center = centers[Math.floor(Math.random() * centers.length)];

        // Spread by +/- 0.5 degrees (~50km)
        const lat = center.lat + (Math.random() - 0.5) * 1.0;
        const lng = center.lng + (Math.random() - 0.5) * 1.0;

        // Status Logic
        const rand = Math.random();
        let status: 'pending' | 'verified' | 'rejected' = 'pending';
        if (rand > 0.8) status = 'verified';
        if (rand > 0.95) status = 'rejected';

        reports.push({
            id: `report-${i + 1}`,
            type: types[Math.floor(Math.random() * types.length)],
            severity: Math.floor(Math.random() * 5) + 1,
            location: { lat, lng },
            timestamp: new Date(Date.now() - Math.random() * 3600 * 1000 * 4).toISOString(), // last 4 hours
            status,
        });
    }
    return reports;
}

// Generate Static Pollution Sources
import { PollutionSource, PollutionSourceCategory } from './types';

const SOURCE_TYPES: { category: PollutionSourceCategory; subtypes: string[] }[] = [
    { category: 'Power & Energy', subtypes: ['Coal Thermal Power Plant', 'Diesel Generator (DG) Set'] },
    { category: 'Industrial Manufacturing', subtypes: ['Cement Plant', 'Chemical Manufacturing Unit'] },
    { category: 'Brick & Construction Materials', subtypes: ['Brick Kiln', 'Stone Crusher Unit'] },
    { category: 'Waste & Burning', subtypes: ['Open Waste Burning Site', 'Garbage Dump / Landfill'] },
    { category: 'Construction & Urban Dust', subtypes: ['Active Construction Site', 'Unpaved Road'] },
    { category: 'Fuel Combustion', subtypes: ['Industrial Boiler', 'Roadside Food Stall'] },
    { category: 'Agriculture-Linked', subtypes: ['Crop Residue Burning', 'Rice Mill'] },
    { category: 'Public & Institutional', subtypes: ['Hospital Diesel Generator', 'Bus Depot'] },
];

export function generatePollutionSources(count: number = 80): PollutionSource[] {
    const sources: PollutionSource[] = [];

    // Distribution Centers (Same as reports/sensors but can be tweaked)
    const centers = [
        { lat: 28.6139, lng: 77.2090 }, // Delhi
        { lat: 28.4595, lng: 77.0266 }, // Gurugram
        { lat: 30.9010, lng: 75.8573 }, // Punjab (Ludhiana)
        { lat: 29.3909, lng: 76.9635 }, // Haryana (Panipat)
    ];

    for (let i = 0; i < count; i++) {
        const typeGroup = SOURCE_TYPES[Math.floor(Math.random() * SOURCE_TYPES.length)];
        const subType = typeGroup.subtypes[Math.floor(Math.random() * typeGroup.subtypes.length)];

        const center = centers[Math.floor(Math.random() * centers.length)];
        // Spread wider for agriculture/brick kilns, tighter for urban
        const spread = (typeGroup.category === 'Agriculture-Linked' || typeGroup.category === 'Brick & Construction Materials') ? 0.8 : 0.3;

        const lat = center.lat + (Math.random() - 0.5) * spread;
        const lng = center.lng + (Math.random() - 0.5) * spread;

        sources.push({
            id: `src-${i}`,
            category: typeGroup.category,
            subType,
            label: subType,
            location: { lat, lng }
        });
    }
    return sources;
}
