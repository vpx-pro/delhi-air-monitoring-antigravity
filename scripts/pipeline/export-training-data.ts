import * as fs from 'fs';
import * as path from 'path';
import { insforge } from './lib/insforge-admin';
import { logger } from './lib/logger';

const BATCH_SIZE = 500;

interface TrainingRow {
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

async function getTrainingData(from: string, to: string): Promise<TrainingRow[]> {
  const { data: aqData } = await insforge.database
    .from('historical_readings')
    .select()
    .eq('parameter', 'pm25')
    .gte('measured_at', from)
    .lte('measured_at', to)
    .order('measured_at', { ascending: true })
    .limit(10000);

  const { data: weatherData } = await insforge.database
    .from('weather_readings')
    .select()
    .gte('measured_at', from)
    .lte('measured_at', to)
    .order('measured_at', { ascending: true })
    .limit(10000);

  const { data: fireData } = await insforge.database
    .from('fire_daily_summary')
    .select()
    .gte('date', from.split('T')[0])
    .lte('date', to.split('T')[0]);

  if (!aqData || aqData.length === 0) return [];

  const weatherByHour = new Map<string, any>();
  for (const w of (weatherData || []) as any[]) {
    const hour = new Date(w.measured_at).toISOString().substring(0, 13);
    weatherByHour.set(hour, w);
  }

  const fireByDate = new Map<string, { count: number; frp: number }>();
  for (const f of (fireData || []) as any[]) {
    const existing = fireByDate.get(f.date) || { count: 0, frp: 0 };
    existing.count += f.fire_count;
    existing.frp += f.total_frp || 0;
    fireByDate.set(f.date, existing);
  }

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

function toCSV(rows: TrainingRow[]): string {
  if (rows.length === 0) return '';
  const header = Object.keys(rows[0]).join(',');
  const lines = rows.map((r) =>
    Object.values(r)
      .map((v) => (v === null ? '' : v))
      .join(',')
  );
  return [header, ...lines].join('\n');
}

async function main() {
  const from = process.argv[2] || '2020-01-01';
  const to = process.argv[3] || new Date().toISOString().split('T')[0];

  logger.info('export', `Exporting training data from ${from} to ${to}`);

  const data = await getTrainingData(from, to);
  if (data.length === 0) {
    logger.warn('export', 'No training data found');
    return;
  }

  const csv = toCSV(data);
  const filename = `training_data_${from}_${to}.csv`;
  const localPath = path.resolve(__dirname, '../../data', filename);

  // Ensure data directory exists
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, csv);
  logger.info('export', `Saved ${data.length} rows to ${localPath}`);

  // Upload to Insforge Storage
  try {
    const blob = new Blob([csv], { type: 'text/csv' });
    const { data: uploadResult, error } = await insforge.storage
      .from('datasets')
      .upload(filename, blob);

    if (error) {
      logger.error('export', 'Upload to storage failed', { error: error.message });
    } else {
      logger.info('export', `Uploaded to datasets/${filename}`);
    }
  } catch (err) {
    logger.error('export', 'Storage upload error', { error: String(err) });
  }

  logger.info('export', `Export complete. ${data.length} training rows.`);
}

main().catch((err) => {
  logger.error('export', 'Fatal error', { error: String(err) });
  process.exit(1);
});
