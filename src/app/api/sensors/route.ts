import { NextResponse } from 'next/server';
import { generateSensors } from '@/lib/simulation';

export async function GET() {
    // Simulate live data fetch
    const sensors = generateSensors(50); // Generate 50 simulated sensors
    return NextResponse.json(sensors);
}
