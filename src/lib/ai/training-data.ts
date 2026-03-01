import { createClient } from '@insforge/sdk';

function getClient() {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY!,
  });
}

export interface TrainingRow {
  hour: string;
  pm25: number;
  temp: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDir: number | null;
  pressure: number | null;
  cloudCover: number | null;
  fireCount: number;
  frp: number;
}

export async function getTrainingData(from: string, to: string): Promise<TrainingRow[]> {
  const insforge = getClient();

  // Fetch PM2.5 readings
  const { data: aqData } = await insforge.database
    .from('historical_readings')
    .select()
    .eq('parameter', 'pm25')
    .gte('measured_at', from)
    .lte('measured_at', to)
    .order('measured_at', { ascending: true })
    .limit(10000);

  // Fetch weather
  const { data: weatherData } = await insforge.database
    .from('weather_readings')
    .select()
    .gte('measured_at', from)
    .lte('measured_at', to)
    .order('measured_at', { ascending: true })
    .limit(10000);

  // Fetch fire summaries
  const { data: fireData } = await insforge.database
    .from('fire_daily_summary')
    .select()
    .gte('date', from.split('T')[0])
    .lte('date', to.split('T')[0]);

  if (!aqData || aqData.length === 0) return [];

  // Index weather by hour
  const weatherByHour = new Map<string, any>();
  for (const w of (weatherData || []) as any[]) {
    const hour = new Date(w.measured_at).toISOString().substring(0, 13);
    weatherByHour.set(hour, w);
  }

  // Index fires by date
  const fireByDate = new Map<string, { count: number; frp: number }>();
  for (const f of (fireData || []) as any[]) {
    const key = f.date;
    const existing = fireByDate.get(key) || { count: 0, frp: 0 };
    existing.count += f.fire_count;
    existing.frp += f.total_frp || 0;
    fireByDate.set(key, existing);
  }

  // Join by hour
  const results: TrainingRow[] = [];
  for (const reading of aqData as any[]) {
    const dt = new Date(reading.measured_at);
    const hour = dt.toISOString().substring(0, 13);
    const date = dt.toISOString().split('T')[0];
    const weather = weatherByHour.get(hour);
    const fire = fireByDate.get(date) || { count: 0, frp: 0 };

    results.push({
      hour: dt.toISOString(),
      pm25: reading.value,
      temp: weather?.temperature_2m ?? null,
      humidity: weather?.relative_humidity_2m ?? null,
      windSpeed: weather?.wind_speed_10m ?? null,
      windDir: weather?.wind_direction_10m ?? null,
      pressure: weather?.surface_pressure ?? null,
      cloudCover: weather?.cloud_cover ?? null,
      fireCount: fire.count,
      frp: fire.frp,
    });
  }

  return results;
}

export function toCSV(rows: TrainingRow[]): string {
  if (rows.length === 0) return '';
  const header = Object.keys(rows[0]).join(',');
  const lines = rows.map((r) =>
    Object.values(r)
      .map((v) => (v === null ? '' : v))
      .join(',')
  );
  return [header, ...lines].join('\n');
}
