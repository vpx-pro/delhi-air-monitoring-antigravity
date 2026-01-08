import { AQIStation, CitizenSensor, CitizenReport, Coordinates } from './types';

// Approximate bounds for Delhi
const DELHI_BOUNDS = {
    north: 28.88,
    south: 28.40,
    east: 77.35,
    west: 76.83,
};

// Official CPCB Stations (Static list for demo)
export const CPCB_STATIONS: AQIStation[] = [
    {
        id: 'cpcb-001',
        name: 'Anand Vihar',
        location: { lat: 28.6469, lng: 77.3160 },
        aqi: 450,
        pm25: 380,
        pm10: 450,
        lastUpdated: new Date().toISOString(),
        source: 'CPCB',
    },
    {
        id: 'cpcb-002',
        name: 'R.K. Puram',
        location: { lat: 28.5632, lng: 77.1869 },
        aqi: 320,
        pm25: 150,
        pm10: 220,
        lastUpdated: new Date().toISOString(),
        source: 'CPCB',
    },
    {
        id: 'cpcb-003',
        name: 'Punjabi Bagh',
        location: { lat: 28.66197, lng: 77.12415 },
        aqi: 380,
        pm25: 210,
        pm10: 310,
        lastUpdated: new Date().toISOString(),
        source: 'CPCB',
    },
    {
        id: 'cpcb-004',
        name: 'ITO',
        location: { lat: 28.6285, lng: 77.2410 },
        aqi: 410,
        pm25: 290,
        pm10: 390,
        lastUpdated: new Date().toISOString(),
        source: 'CPCB',
    },
    {
        id: 'cpcb-005',
        name: 'Mandir Marg',
        location: { lat: 28.6364, lng: 77.1987 },
        aqi: 290,
        pm25: 120,
        pm10: 200,
        lastUpdated: new Date().toISOString(),
        source: 'CPCB',
    },
];

// Helper to generate random coordinates near a point
function randomLocationNear(center: Coordinates, radiusKm: number = 2): Coordinates {
    const r = (radiusKm * 1000) / 111300; // rough conversion to degrees
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    // Scramble slightly to normalize
    return {
        lat: center.lat + x,
        lng: center.lng + y,
    };
}

// Generate Citizen Sensors
// Logic: Scatter them around CPCB stations with some correlation + noise
export function generateSensors(count: number = 20): CitizenSensor[] {
    const sensors: CitizenSensor[] = [];

    for (let i = 0; i < count; i++) {
        // Pick a random reference station
        const station = CPCB_STATIONS[Math.floor(Math.random() * CPCB_STATIONS.length)];
        const location = randomLocationNear(station.location, 3);

        // Simulate reading: Station Value +/- 20% noise + bias
        const noise = (Math.random() - 0.5) * 0.4; // +/- 20%
        const localBias = (Math.random() * 50) - 10; // Urban canyon effects
        let val = station.pm25 * (1 + noise) + localBias;
        val = Math.max(0, parseFloat(val.toFixed(1))); // clamp 0

        // Confidence drops if farther from station or very high variance
        const confidence = parseFloat((0.7 + Math.random() * 0.3).toFixed(2)); // 0.7 - 1.0

        sensors.push({
            id: `sensor-${i + 1}`,
            location,
            pm25: val,
            confidence,
            lastUpdated: new Date().toISOString(),
        });
    }
    return sensors;
}

// Generate Citizen Reports
export function generateReports(count: number = 10): CitizenReport[] {
    const reports: CitizenReport[] = [];
    const types: ('GARBAGE_BURNING' | 'CONSTRUCTION_DUST' | 'TRAFFIC_CONGESTION')[] = [
        'GARBAGE_BURNING',
        'CONSTRUCTION_DUST',
        'TRAFFIC_CONGESTION'
    ];

    for (let i = 0; i < count; i++) {
        // Spread randomly across Delhi
        const lat = DELHI_BOUNDS.south + Math.random() * (DELHI_BOUNDS.north - DELHI_BOUNDS.south);
        const lng = DELHI_BOUNDS.west + Math.random() * (DELHI_BOUNDS.east - DELHI_BOUNDS.west);

        reports.push({
            id: `report-${i + 1}`,
            type: types[Math.floor(Math.random() * types.length)],
            severity: Math.floor(Math.random() * 5) + 1,
            location: { lat, lng },
            timestamp: new Date(Date.now() - Math.random() * 3600 * 1000 * 4).toISOString(), // last 4 hours
            verified: Math.random() > 0.8,
        });
    }
    return reports;
}
