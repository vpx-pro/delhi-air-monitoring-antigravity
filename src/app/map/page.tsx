import MapCode from '@/components/map/MapCode';
import { Suspense } from 'react';
import { TimeRange } from '@/lib/types';
import { getStations, generateSensors, generateReports, generatePollutionSources } from '@/lib/simulation';
import { fetchLiveAQI } from '@/lib/api';
import { AQIStation } from '@/lib/types';

// Force dynamic since we're using randomized simulation
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

async function getData(range: TimeRange = 'live') {
  let stations: AQIStation[] = [];
  const useLive = range === 'live' && !!process.env.WAQI_API_TOKEN;

  if (useLive) {
    try {
      // Fetch all regions in parallel
      const [delhi, haryana, punjab] = await Promise.all([
        fetchLiveAQI('Delhi'),
        fetchLiveAQI('Haryana'),
        fetchLiveAQI('Punjab')
      ]);
      stations = [...delhi, ...haryana, ...punjab];

      if (stations.length === 0) {
        console.warn('Live fetch returned 0 stations, falling back to sim');
        stations = getStations(range).map(s => ({ ...s, name: s.name + ' (Sim)' }));
      }
    } catch (e) {
      console.error('Live fetch failed', e);
      stations = getStations(range);
    }
  } else {
    stations = getStations(range);
  }

  const sensors = generateSensors(range, 50);

  // FETCH REPORTS FROM SUPABASE
  const supabase = await createClient();
  const { data: dbReports } = await supabase
    .from('citizen_reports')
    .select('*')
    .order('reported_at', { ascending: false })
    .limit(50);

  let reports = [];
  if (dbReports && dbReports.length > 0) {
    reports = dbReports.map((r: any) => ({
      id: r.id,
      type: r.report_type, // Assuming FE maps this string to icon/color
      severity: r.severity,
      description: r.description,
      // Parse GeoJSON-like object if using Supabase client, or fallback
      location: r.location?.coordinates ? { lat: r.location.coordinates[1], lng: r.location.coordinates[0] } : { lat: 28.6139, lng: 77.2090 },
      timestamp: r.reported_at,
      verified: r.verified || false
    }));
  } else {
    reports = generateReports(range, 20);
  }

  return { stations, sensors, reports, isLive: useLive && stations.length > 0 && !stations[0].name.includes('(Sim)') };
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: Props) {
  const resolvedParams = await searchParams; // Await the promise
  const range = (resolvedParams['range'] as TimeRange) || 'live';
  const { stations, sensors, reports, isLive } = await getData(range);
  const sources = generatePollutionSources();

  return (
    <main className="w-screen h-screen bg-slate-900">
      <Suspense fallback={<div className="text-white p-10">Loading map...</div>}>
        <MapCode
          stations={stations}
          sensors={sensors}
          reports={reports}
          sources={sources}
          isLive={isLive}
        />
      </Suspense>
    </main>
  );
}
