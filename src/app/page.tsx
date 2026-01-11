import MapCode from '@/components/map/MapCode';
import { Suspense } from 'react';
import { TimeRange } from '@/lib/types';
import { generatePollutionSources } from '@/lib/simulation';

// Force dynamic since we're using randomized simulation
export const dynamic = 'force-dynamic';

async function getData(range: TimeRange = 'live') {
  // In production, use absolute URL from env
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  // Fallback for build time if needed, though force-dynamic helps
  const host = process.env.VERCEL_URL || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  // Parallel fetch for speed
  const [stationsRes, sensorsRes, reportsRes] = await Promise.all([
    fetch(`${baseUrl}/api/stations?range=${range}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/sensors?range=${range}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/reports?range=${range}`, { cache: 'no-store' }),
  ]);

  const stations = await stationsRes.json();
  const sensors = await sensorsRes.json();
  const reports = await reportsRes.json();

  return { stations, sensors, reports };
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: Props) {
  const resolvedParams = await searchParams; // Await the promise
  const range = (resolvedParams['range'] as TimeRange) || 'live';
  const { stations, sensors, reports } = await getData(range);
  const sources = generatePollutionSources();

  return (
    <main className="w-screen h-screen bg-slate-900">
      <Suspense fallback={<div className="text-white p-10">Loading map...</div>}>
        <MapCode
          stations={stations}
          sensors={sensors}
          reports={reports}
          sources={sources}
        />
      </Suspense>
    </main>
  );
}
