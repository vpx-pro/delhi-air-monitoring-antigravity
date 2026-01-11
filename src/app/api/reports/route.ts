import { NextResponse } from 'next/server';
import { generateReports } from '@/lib/simulation';
import { TimeRange } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'live';

    const reports = generateReports(range, 20); // Generate 20 simulated reports
    return NextResponse.json(reports);
}
