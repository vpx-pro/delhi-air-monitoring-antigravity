import { NextResponse } from 'next/server';
import { generateReports } from '@/lib/simulation';

export async function GET() {
    const reports = generateReports(20); // Generate 20 simulated reports
    return NextResponse.json(reports);
}
