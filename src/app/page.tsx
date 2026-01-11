import MapCode from '@/components/map/MapCode';
import { Suspense } from 'react';
import { TimeRange } from '@/lib/types';
import { getStations, generateSensors, generateReports, generatePollutionSources } from '@/lib/simulation';

// Force dynamic since we're using randomized simulation
export const dynamic = 'force-dynamic';

async function getData(range: TimeRange = 'live') {
  // Direct call eliminates network overhead and "localhost" resolution errors
  const stations = getStations(range);
  const sensors = generateSensors(range, 50);
  const reports = generateReports(range, 20);

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
