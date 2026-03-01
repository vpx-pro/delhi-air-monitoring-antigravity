import { insforge } from '../lib/insforge-admin';
import { logger } from '../lib/logger';

const OPENAQ_BASE = 'https://api.openaq.org/v3';
const BATCH_SIZE = 500;

// OpenAQ free tier: ~10 req/min. We'll do 1 request every 7 seconds.
const REQUEST_DELAY_MS = 7000;

interface SensorInfo {
  sensorId: number;
  parameter: string;
  unit: string;
  locationId: number;
  locationName: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getDelhiSensors(): Promise<SensorInfo[]> {
  // Only CPCB Delhi stations
  const { data: locations, error } = await insforge.database
    .from('openaq_locations')
    .select('openaq_id, name, sensors, source_name')
    .eq('is_active', true)
    .eq('source_name', 'CPCB');

  if (error || !locations) throw new Error(`Failed to fetch locations: ${error?.message}`);

  // Filter to Delhi stations only
  const delhiLocations = (locations as any[]).filter((loc) => {
    const n = loc.name.toLowerCase();
    return n.includes('delhi') || n.includes('new delhi') || n.includes('dpcc') || n.includes('imd') || n.includes('iitm');
  });

  // CLI flag: --param pm25 (default) or --param all
  const paramArg = process.argv.includes('--param')
    ? process.argv[process.argv.indexOf('--param') + 1]
    : 'all';
  const targetParams = paramArg === 'all'
    ? ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'pm2.5']
    : [paramArg];

  const sensors: SensorInfo[] = [];
  for (const loc of delhiLocations) {
    if (!loc.sensors) continue;
    for (const sensor of loc.sensors) {
      const param = sensor.parameter?.name?.toLowerCase();
      if (targetParams.includes(param)) {
        sensors.push({
          sensorId: sensor.id,
          parameter: param === 'pm2.5' ? 'pm25' : param,
          unit: sensor.parameter?.units || 'µg/m³',
          locationId: loc.openaq_id,
          locationName: loc.name,
        });
      }
    }
  }

  logger.info('openaq-backfill', `${delhiLocations.length} Delhi CPCB stations, ${sensors.length} sensors`);
  return sensors;
}

async function getSyncCursor(): Promise<{ lastSensorId: number } | null> {
  const { data } = await insforge.database
    .from('data_sources')
    .select('sync_cursor')
    .eq('name', 'openaq')
    .single();
  if (data?.sync_cursor) {
    try { return JSON.parse(data.sync_cursor); } catch { return null; }
  }
  return null;
}

async function updateSyncCursor(cursor: object) {
  await insforge.database
    .from('data_sources')
    .update({ sync_cursor: JSON.stringify(cursor), last_synced_at: new Date().toISOString() })
    .eq('name', 'openaq');
}

async function fetchWithRetry(sensorId: number, dateFrom: string, dateTo: string, page: number = 1, retries: number = 3): Promise<any> {
  const url = `${OPENAQ_BASE}/sensors/${sensorId}/measurements?date_from=${dateFrom}&date_to=${dateTo}&limit=1000&page=${page}`;

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (process.env.OPENAQ_API_KEY) {
    headers['X-API-Key'] = process.env.OPENAQ_API_KEY;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    await sleep(REQUEST_DELAY_MS);

    try {
      const res = await fetch(url, { headers });

      if (res.ok) {
        return res.json();
      }

      if (res.status === 429) {
        const waitSec = 30 * Math.pow(2, attempt); // 30s, 60s, 120s, 240s
        logger.warn('openaq-backfill', `Rate limited (attempt ${attempt + 1}), waiting ${waitSec}s`);
        await sleep(waitSec * 1000);
        continue;
      }

      if (res.status === 408) {
        // Timeout — the API returned partial data or none. Skip this window.
        logger.warn('openaq-backfill', `Timeout on sensor ${sensorId} ${dateFrom}, skipping window`);
        return { results: [] };
      }

      if (res.status === 404 || res.status === 422) {
        return { results: [] };
      }

      const text = await res.text();
      logger.error('openaq-backfill', `API ${res.status}: ${text.substring(0, 200)}`);
      return { results: [] };
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn('openaq-backfill', `Network error (attempt ${attempt + 1}), retrying in 15s`);
      await sleep(15000);
    }
  }

  return { results: [] };
}

// Use 30-day windows to minimize API calls
function generateMonthlyWindows(startDate: string, endDate: string): Array<[string, string]> {
  const windows: Array<[string, string]> = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const windowEnd = new Date(current);
    windowEnd.setMonth(windowEnd.getMonth() + 1);
    const actualEnd = windowEnd > end ? end : windowEnd;
    windows.push([current.toISOString().split('T')[0], actualEnd.toISOString().split('T')[0]]);
    current = actualEnd;
  }
  return windows;
}

async function backfillSensor(sensor: SensorInfo, startDate: string, endDate: string): Promise<number> {
  const windows = generateMonthlyWindows(startDate, endDate);
  let totalInserted = 0;

  for (const [from, to] of windows) {
    let page = 1;
    let windowCount = 0;

    while (true) {
      try {
        const response = await fetchWithRetry(sensor.sensorId, from, to, page);
        const results = response.results || [];
        if (results.length === 0) break;

        const rows = results.map((m: any) => ({
          station_source: 'openaq',
          station_source_id: String(sensor.locationId),
          parameter: sensor.parameter,
          value: m.value,
          unit: sensor.unit,
          measured_at: m.period?.datetimeFrom?.utc || m.date?.utc || m.datetime || new Date().toISOString(),
          quality_flag: null,
        }));

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const { error } = await insforge.database.from('historical_readings').insert(batch);
          if (error) {
            logger.error('openaq-backfill', `DB insert error`, { error: error.message });
          }
        }

        windowCount += results.length;
        if (results.length < 1000) break;
        page++;
      } catch (err) {
        logger.error('openaq-backfill', `Error sensor ${sensor.sensorId} ${from}-${to}`, { error: String(err) });
        break;
      }
    }

    totalInserted += windowCount;
    if (windowCount > 0) {
      logger.info('openaq-backfill', `  ${sensor.locationName} [${sensor.parameter}] ${from}: ${windowCount} readings`);
    }
  }

  return totalInserted;
}

async function main() {
  const startYear = process.argv.includes('--from')
    ? process.argv[process.argv.indexOf('--from') + 1]
    : '2024';
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = `${startYear}-01-01`;

  logger.info('openaq-backfill', `=== Delhi AQ Backfill: ${startDate} to ${endDate} ===`);
  logger.info('openaq-backfill', `Rate: 1 request every ${REQUEST_DELAY_MS / 1000}s (~${Math.round(60000 / REQUEST_DELAY_MS)} req/min)`);

  const cursor = await getSyncCursor();
  const resumeSensorId = cursor?.lastSensorId || 0;
  if (resumeSensorId > 0) {
    logger.info('openaq-backfill', `Resuming after sensor ${resumeSensorId}`);
  }

  const sensors = await getDelhiSensors();

  // Deduplicate
  const uniqueSensors = new Map<number, SensorInfo>();
  for (const s of sensors) {
    if (!uniqueSensors.has(s.sensorId)) {
      uniqueSensors.set(s.sensorId, s);
    }
  }
  const sensorList = Array.from(uniqueSensors.values()).sort((a, b) => a.sensorId - b.sensorId);

  // Estimate: each sensor needs ~24 monthly windows × 1 API call = ~24 calls
  // At 7s per call: ~168s per sensor, ~sensorList.length × 168 / 3600 hours total
  const estHours = (sensorList.length * 24 * REQUEST_DELAY_MS / 1000 / 3600).toFixed(1);
  logger.info('openaq-backfill', `${sensorList.length} unique sensors. Estimated time: ~${estHours} hours`);

  let grandTotal = 0;
  let processed = 0;
  let skipped = 0;

  for (const sensor of sensorList) {
    if (sensor.sensorId <= resumeSensorId) {
      skipped++;
      continue;
    }

    const count = await backfillSensor(sensor, startDate, endDate);
    grandTotal += count;
    processed++;

    await updateSyncCursor({ lastSensorId: sensor.sensorId, date: endDate });

    logger.info('openaq-backfill', `[${processed + skipped}/${sensorList.length}] ${sensor.locationName} ${sensor.parameter}: ${count} rows (total: ${grandTotal})`);
  }

  logger.info('openaq-backfill', `=== COMPLETE: ${grandTotal} readings from ${processed} sensors ===`);
}

main().catch((err) => {
  logger.error('openaq-backfill', 'Fatal error', { error: String(err) });
  process.exit(1);
});
