import { NextResponse } from 'next/server';
import { generateSensors } from '@/lib/simulation';
import { TimeRange } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'live';

    // Simulate live data fetch
    const sensors = generateSensors(range, 50); // Generate 50 simulated sensors
    return NextResponse.json(sensors);
}
