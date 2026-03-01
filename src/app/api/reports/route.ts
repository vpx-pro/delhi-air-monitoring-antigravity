import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReports } from '@/lib/simulation';
import { TimeRange } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'live';

    const insforge = await createClient();
    const { data: dbReports, error } = await insforge.database
        .from('citizen_reports')
        .select()
        .order('reported_at', { ascending: false })
        .limit(50);

    if (!error && dbReports && dbReports.length > 0) {
        const mappedReports = dbReports.map((r: any) => ({
            id: r.id,
            type: r.report_type,
            severity: r.severity,
            description: r.description,
            location: { lat: r.latitude, lng: r.longitude },
            timestamp: r.reported_at,
            status: (r.verified ? 'verified' : 'pending') as 'pending' | 'verified' | 'rejected',
        }));
        return NextResponse.json(mappedReports);
    }

    // Fallback to simulation if DB empty or error
    const reports = generateReports(range, 20);
    return NextResponse.json(reports);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { category, severity, description, location } = body;

        const insforge = await createClient();

        const { data, error } = await insforge.database
            .from('citizen_reports')
            .insert({
                report_type: mapCategoryToDbEnum(category),
                severity,
                description,
                latitude: location.lat,
                longitude: location.lng,
                user_id: 'anonymous',
            })
            .select();

        if (error) {
            console.error('Insforge error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data?.[0] ?? {});
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function mapCategoryToDbEnum(uiCategory: string): string {
    if (uiCategory.includes('Burning') || uiCategory.includes('Agriculture') || uiCategory.includes('Fuel')) return 'GARBAGE_BURNING';
    if (uiCategory.includes('Construction') || uiCategory.includes('Brick') || uiCategory.includes('Dust')) return 'CONSTRUCTION_DUST';
    if (uiCategory.includes('Traffic') || uiCategory.includes('Public')) return 'TRAFFIC_CONGESTION';
    return 'INDUSTRIAL_SMOKE';
}
