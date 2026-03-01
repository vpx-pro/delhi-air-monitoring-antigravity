import { insforge } from '../lib/insforge-admin';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';
import { NCR_EXTENDED_BBOX } from '../lib/geo-utils';

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api';
const rateLimiter = new RateLimiter(0.5);
const BATCH_SIZE = 500;

function classifyState(lat: number, lon: number): string {
  if (lat >= 28.4 && lat <= 28.9 && lon >= 76.8 && lon <= 77.4) return 'Delhi';
  if (lat >= 27.6 && lat <= 30.9 && lon >= 74.5 && lon <= 77.6) return 'Haryana';
  if (lat >= 29.5 && lat <= 32.5 && lon >= 73.8 && lon <= 76.9) return 'Punjab';
  return 'Other';
}

async function main() {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    logger.warn('fire-incremental', 'NASA_FIRMS_MAP_KEY not set');
    return;
  }

  const bbox = `${NCR_EXTENDED_BBOX.west},${NCR_EXTENDED_BBOX.south},${NCR_EXTENDED_BBOX.east},${NCR_EXTENDED_BBOX.north}`;
  const sources = ['MODIS_NRT', 'VIIRS_NOAA20_NRT'];
  const dayRange = 2; // Last 2 days

  logger.info('fire-incremental', 'Starting incremental fire sync (last 2 days)');

  let totalInserted = 0;

  for (const source of sources) {
    try {
      await rateLimiter.wait();
      const url = `${FIRMS_BASE}/area/csv/${mapKey}/${source}/${bbox}/${dayRange}`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn('fire-incremental', `Skipping ${source}: HTTP ${res.status}`);
        continue;
      }

      const csv = await res.text();
      const lines = csv.trim().split('\n');
      if (lines.length < 2) continue;

      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const latIdx = header.indexOf('latitude');
      const lonIdx = header.indexOf('longitude');
      const brightIdx = header.findIndex((h) => h === 'brightness' || h === 'bright_ti4');
      const frpIdx = header.indexOf('frp');
      const confIdx = header.indexOf('confidence');
      const satIdx = header.indexOf('satellite');
      const instrIdx = header.indexOf('instrument');
      const dateIdx = header.indexOf('acq_date');
      const timeIdx = header.indexOf('acq_time');
      const dnIdx = header.indexOf('daynight');

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 5) continue;
        const lat = parseFloat(cols[latIdx]);
        const lon = parseFloat(cols[lonIdx]);
        rows.push({
          source,
          latitude: lat,
          longitude: lon,
          brightness: brightIdx >= 0 ? parseFloat(cols[brightIdx]) || null : null,
          frp: frpIdx >= 0 ? parseFloat(cols[frpIdx]) || 0 : 0,
          confidence: confIdx >= 0 ? cols[confIdx] : 'unknown',
          satellite: satIdx >= 0 ? cols[satIdx] : 'unknown',
          instrument: instrIdx >= 0 ? cols[instrIdx] : 'unknown',
          acq_date: dateIdx >= 0 ? cols[dateIdx] : new Date().toISOString().split('T')[0],
          acq_time: timeIdx >= 0 ? cols[timeIdx] : '',
          daynight: dnIdx >= 0 ? cols[dnIdx] : '',
          state: classifyState(lat, lon),
        });
      }

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await insforge.database.from('fire_hotspots').insert(rows.slice(i, i + BATCH_SIZE));
      }

      totalInserted += rows.length;
      logger.info('fire-incremental', `${source}: ${rows.length} hotspots`);
    } catch (err) {
      logger.error('fire-incremental', `Error for ${source}`, { error: String(err) });
    }
  }

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'nasa_firms');

  logger.info('fire-incremental', `Complete. ${totalInserted} hotspots ingested.`);
}

main().catch((err) => {
  logger.error('fire-incremental', 'Fatal error', { error: String(err) });
  process.exit(1);
});
