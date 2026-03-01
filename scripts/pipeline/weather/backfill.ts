import { insforge } from '../lib/insforge-admin';
import { logger } from '../lib/logger';

const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
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

interface WeatherStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

async function fetchWeatherData(lat: number, lon: number, startDate: string, endDate: string) {
  const url = `${OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=${HOURLY_PARAMS}&timezone=Asia/Kolkata`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Open-Meteo API error: ${res.status} ${text}`);
  }
  return res.json();
}

function generateYearWindows(startYear: number, endYear: number): Array<[string, string]> {
  const windows: Array<[string, string]> = [];
  for (let y = startYear; y <= endYear; y++) {
    const start = `${y}-01-01`;
    const end = y === new Date().getFullYear()
      ? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 6 days ago (archive delay)
      : `${y}-12-31`;
    windows.push([start, end]);
  }
  return windows;
}

async function backfillStation(station: WeatherStation, startYear: number, endYear: number) {
  const windows = generateYearWindows(startYear, endYear);
  let totalInserted = 0;

  for (const [startDate, endDate] of windows) {
    try {
      logger.info('weather-backfill', `Fetching ${station.name} ${startDate} to ${endDate}`);
      const data = await fetchWeatherData(station.latitude, station.longitude, startDate, endDate);

      if (!data.hourly?.time) {
        logger.warn('weather-backfill', `No hourly data for ${station.name} ${startDate}`);
        continue;
      }

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
        boundary_layer_height: null, // Not available in free tier
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await insforge.database.from('weather_readings').insert(batch);
        if (error) {
          logger.error('weather-backfill', `Insert error`, { error: error.message });
        } else {
          totalInserted += batch.length;
        }
      }

      logger.info('weather-backfill', `${station.name} ${startDate}: ${rows.length} rows`);

      // Small delay between API calls
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      logger.error('weather-backfill', `Error for ${station.name} ${startDate}`, { error: String(err) });
    }
  }

  return totalInserted;
}

async function main() {
  const startYear = parseInt(process.argv.includes('--from')
    ? process.argv[process.argv.indexOf('--from') + 1]
    : '2015', 10);
  const endYear = new Date().getFullYear();

  logger.info('weather-backfill', `Backfilling weather data from ${startYear} to ${endYear}`);

  const { data: stations, error } = await insforge.database
    .from('weather_stations')
    .select();

  if (error || !stations || stations.length === 0) {
    logger.error('weather-backfill', 'No weather stations found');
    return;
  }

  logger.info('weather-backfill', `Found ${stations.length} weather stations`);

  let grandTotal = 0;
  for (const station of stations as WeatherStation[]) {
    const count = await backfillStation(station, startYear, endYear);
    grandTotal += count;
    logger.info('weather-backfill', `Completed ${station.name}: ${count} readings`);
  }

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'open_meteo');

  logger.info('weather-backfill', `Backfill complete. Grand total: ${grandTotal} readings.`);
}

main().catch((err) => {
  logger.error('weather-backfill', 'Fatal error', { error: String(err) });
  process.exit(1);
});
