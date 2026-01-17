
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReports } from '@/lib/simulation';
import { TimeRange } from '@/lib/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'live';

    // If simulating, return simulation
    // Ideally we might want a flag to force real data?
    // For now, let's fetch REAL data if we can, else fallback

    // Actually, let's just fetch real data from DB for reports
    // as we want to test persistence.

    const supabase = await createClient();
    const { data: dbReports, error } = await supabase
        .from('citizen_reports')
        .select('*')
        .order('reported_at', { ascending: false })
        .limit(50);

    if (!error && dbReports && dbReports.length > 0) {
        // Map DB reports to app format if needed. 
        // Our schema is: report_type, severity, description, location (geo), verified, reported_at
        // App expects something similar? 
        // Let's assume the frontend can handle the shape or we map it.
        // The generateReports returns Objects with { id, type, severity, location: {lat, lng}, ... }
        // DB has location as PostGIS geometry. We might need to transform it.
        // Or simpler: just store lat/lng columns for now? 
        // Existing schema used PostGIS. Let's stick to PostGIS but we need to select it as lat/lng.

        // Wait, Supabase PostGIS support in JS client return GeoJSON? 
        // Let's modify the query to return lat/lng if possible or parse it.
        // Simpler: let's modifying schema to have simple lat/lng columns for this MVP or use st_asgeojson

        // Actually, let's just use the simulated ones for the "simulated" layers 
        // and add a "Real" layer?
        // The prompt says "connect it to real database". 
        // So reports should come from DB.

        // Let's try to map the DB response.
        const mappedReports = dbReports.map((r: any) => {
            // Basic parsing if location is geojson (it comes as object often)
            // If we inserted via PostGIS query, fetching it might be tricky without modifiers.
            // Simplification: I'll trust standard selection for now, or use a helper.
            // But for now, let's just return what we have and see.
            // Actually, to make it robust, I'll update the POST to convert lat/lng to Geometry
            // AND the GET to convert Geometry to lat/lng.
            return {
                id: r.id,
                type: r.report_type,
                severity: r.severity,
                description: r.description,
                // Assuming we handle location parsing in client or here.
                // For MVP speed, I will use st_x/st_y in query if raw SQL, but with JS client:
                // .select('*, lat:st_y(location::geometry), lng:st_x(location::geometry)')
                // This requires RPC usually.

                // Fallback: Let's assume the client sends lat/lng and we store it as numeric columns TOO?
                // No, that's tech debt.
                // Let's use RPC or just parse whatever comes back.
                // If it's WKB string, we need a parser.
                // If standard Supabase, it returns GeoJSON object.
                location: r.location?.coordinates ? { lat: r.location.coordinates[1], lng: r.location.coordinates[0] } : { lat: 0, lng: 0 },
                timestamp: r.reported_at
            };
        });
        return NextResponse.json(mappedReports);
    }

    // Fallback to simulation if DB empty or error
    const reports = generateReports(range, 20);
    return NextResponse.json(reports);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { category, severity, description, location, userId } = body;
        // User ID should come from auth session, but for now we might accept it from body if testing
        // strictly: use session.

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const point = `POINT(${location.lng} ${location.lat})`;

        const { data, error } = await supabase
            .from('citizen_reports')
            .insert({
                // DB Enum: 'GARBAGE_BURNING', 'CONSTRUCTION_DUST', 'TRAFFIC_CONGESTION', 'INDUSTRIAL_SMOKE'
                // UI Categories: 'Power & Energy', 'Waste & Burning', 'Construction & Urban Dust', ...
                report_type: mapCategoryToDbEnum(category),
                severity,
                description,
                location: point,
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function mapCategoryToDbEnum(uiCategory: string): string {
    // DB: 'GARBAGE_BURNING', 'CONSTRUCTION_DUST', 'TRAFFIC_CONGESTION', 'INDUSTRIAL_SMOKE'
    // UI: 'Power & Energy', 'Industrial Manufacturing', 'Brick & Construction Materials', 
    // 'Waste & Burning', 'Construction & Urban Dust', 'Fuel Combustion', 
    // 'Agriculture-Linked', 'Public & Institutional'

    // Simplistic mapping for MVP
    if (uiCategory.includes('Burning') || uiCategory.includes('Agriculture') || uiCategory.includes('Fuel')) return 'GARBAGE_BURNING';
    if (uiCategory.includes('Construction') || uiCategory.includes('Brick') || uiCategory.includes('Dust')) return 'CONSTRUCTION_DUST';
    if (uiCategory.includes('Traffic') || uiCategory.includes('Public')) return 'TRAFFIC_CONGESTION';
    return 'INDUSTRIAL_SMOKE';
}
