import { insforge } from '../lib/insforge-admin';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';

const OPENAQ_BASE = 'https://api.openaq.org/v3';
const rateLimiter = new RateLimiter(1);
const BATCH_SIZE = 500;

async function main() {
  logger.info('openaq-incremental', 'Starting incremental sync (last 2 hours)');

  const { data: locations } = await insforge.database
    .from('openaq_locations')
    .select('openaq_id, name')
    .eq('is_active', true);

  if (!locations || locations.length === 0) {
    logger.warn('openaq-incremental', 'No locations found');
    return;
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  let totalInserted = 0;

  for (const loc of locations) {
    await rateLimiter.wait();

    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (process.env.OPENAQ_API_KEY) {
      headers['X-API-Key'] = process.env.OPENAQ_API_KEY;
    }

    try {
      const url = `${OPENAQ_BASE}/locations/${loc.openaq_id}/measurements?date_from=${twoHoursAgo}&date_to=${now}&limit=1000`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        logger.warn('openaq-incremental', `Skipping ${loc.name}: HTTP ${res.status}`);
        continue;
      }

      const { results } = await res.json();
      if (!results || results.length === 0) continue;

      const rows = results.map((m: any) => ({
        station_source: 'openaq',
        station_source_id: String(loc.openaq_id),
        parameter: m.parameter?.name || m.parameter || 'unknown',
        value: m.value,
        unit: m.parameter?.units || m.unit || 'ug/m3',
        measured_at: m.date?.utc || m.datetime || new Date().toISOString(),
        quality_flag: null,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await insforge.database.from('historical_readings').insert(batch);
      }

      totalInserted += results.length;
      logger.info('openaq-incremental', `${loc.name}: ${results.length} new readings`);
    } catch (err) {
      logger.error('openaq-incremental', `Error for ${loc.name}`, { error: String(err) });
    }
  }

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'openaq');

  logger.info('openaq-incremental', `Complete. ${totalInserted} readings ingested.`);
}

main().catch((err) => {
  logger.error('openaq-incremental', 'Fatal error', { error: String(err) });
  process.exit(1);
});
