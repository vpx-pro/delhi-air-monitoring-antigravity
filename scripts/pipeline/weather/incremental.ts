import { insforge } from '../lib/insforge-admin';
import { logger } from '../lib/logger';

const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const BATCH_SIZE = 500;

const HOURLY_PARAMS = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'wind_direction_10m',
  'precipitation',
  'surface_pressure',
  'cloud_cover',
].join(',');

async function main() {
  logger.info('weather-incremental', 'Starting incremental weather sync (last 48h)');

  const { data: stations } = await insforge.database
    .from('weather_stations')
    .select();

  if (!stations || stations.length === 0) {
    logger.warn('weather-incremental', 'No weather stations found');
    return;
  }

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  let totalInserted = 0;

  for (const station of stations as any[]) {
    try {
      const url = `${OPEN_METEO_FORECAST}?latitude=${station.latitude}&longitude=${station.longitude}&hourly=${HOURLY_PARAMS}&start_date=${twoDaysAgo}&end_date=${today}&timezone=Asia/Kolkata&past_days=2`;

      const res = await fetch(url);
      if (!res.ok) {
        logger.warn('weather-incremental', `Skipping ${station.name}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (!data.hourly?.time) continue;

      const rows = data.hourly.time.map((t: string, i: number) => ({
        station_id: station.id,
        measured_at: new Date(t).toISOString(),
        temperature_2m: data.hourly.temperature_2m?.[i] ?? null,
        relative_humidity_2m: data.hourly.relative_humidity_2m?.[i] ?? null,
        wind_speed_10m: data.hourly.wind_speed_10m?.[i] ?? null,
        wind_direction_10m: data.hourly.wind_direction_10m?.[i] ?? null,
        precipitation: data.hourly.precipitation?.[i] ?? null,
        surface_pressure: data.hourly.surface_pressure?.[i] ?? null,
        cloud_cover: data.hourly.cloud_cover?.[i] ?? null,
        boundary_layer_height: null,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await insforge.database.from('weather_readings').insert(rows.slice(i, i + BATCH_SIZE));
      }

      totalInserted += rows.length;
      logger.info('weather-incremental', `${station.name}: ${rows.length} readings`);
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      logger.error('weather-incremental', `Error for ${station.name}`, { error: String(err) });
    }
  }

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'open_meteo');

  logger.info('weather-incremental', `Complete. ${totalInserted} readings ingested.`);
}

main().catch((err) => {
  logger.error('weather-incremental', 'Fatal error', { error: String(err) });
  process.exit(1);
});
