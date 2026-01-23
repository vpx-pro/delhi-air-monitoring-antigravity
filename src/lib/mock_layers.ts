import { SatelliteData, TrafficData } from './types';

// Helper to generate a random polygon circle
function createPolygon(center: [number, number], radius: number, points: number = 32): GeoJSON.Polygon {
    const coords: number[][] = [];
    for (let i = 0; i <= points; i++) {
        const theta = (i / points) * 2 * Math.PI;
        const latOffset = (radius / 111.32) * Math.cos(theta);
        const lngOffset = (radius / (111.32 * Math.cos(center[1] * (Math.PI / 180)))) * Math.sin(theta);
        coords.push([center[0] + lngOffset, center[1] + latOffset]);
    }
    return {
        type: 'Polygon',
        coordinates: [coords],
    };
}

export const MOCK_SATELLITE_DATA: SatelliteData[] = [
    // Punjab - Intense Stubble Burning Plume
    {
        id: 'sat-1',
        type: 'AOD',
        geometry: createPolygon([75.8573, 30.9000], 50),
        value: 0.9,
        timestamp: new Date().toISOString()
    },
    // Haryana - Industrial Plume
    {
        id: 'sat-2',
        type: 'NO2',
        geometry: createPolygon([77.0266, 29.0000], 30),
        value: 0.7,
        timestamp: new Date().toISOString()
    },
    // Delhi - Urban Smog Cover
    {
        id: 'sat-3',
        type: 'AOD',
        geometry: createPolygon([77.2090, 28.6139], 15),
        value: 0.5,
        timestamp: new Date().toISOString()
    }
];

// Helper for LineStrings
function createLine(start: [number, number], end: [number, number], jitter: number = 0.005): GeoJSON.LineString {
    const mid: [number, number] = [
        (start[0] + end[0]) / 2 + (Math.random() - 0.5) * jitter,
        (start[1] + end[1]) / 2 + (Math.random() - 0.5) * jitter
    ];
    return {
        type: 'LineString',
        coordinates: [start, mid, end]
    };
}

export const MOCK_TRAFFIC_DATA: TrafficData[] = [
    // Ring Road (Severe)
    {
        id: 'tr-1',
        geometry: createLine([77.2100, 28.5700], [77.2300, 28.5800]),
        congestionLevel: 'severe',
        speed: 10
    },
    // Outer Ring Road (High)
    {
        id: 'tr-2',
        geometry: createLine([77.1800, 28.5500], [77.1900, 28.5600]),
        congestionLevel: 'high',
        speed: 25
    },
    // Connaught Place Inner Circle (Moderate)
    {
        id: 'tr-3',
        geometry: createLine([77.2150, 28.6310], [77.2180, 28.6320]),
        congestionLevel: 'moderate',
        speed: 40
    }
];
