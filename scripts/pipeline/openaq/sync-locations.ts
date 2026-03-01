import { insforge } from '../lib/insforge-admin';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';
import { DELHI_BBOX, bboxToString } from '../lib/geo-utils';

const OPENAQ_BASE = 'https://api.openaq.org/v3';
const rateLimiter = new RateLimiter(1);

interface OpenAQLocation {
  id: number;
  name: string;
  coordinates: { latitude: number; longitude: number };
  locality?: string;
  provider?: { name: string };
  sensors?: Array<{ id: number; name: string; parameter: { name: string; units: string } }>;
  isActive?: boolean;
}

async function fetchLocations(page: number = 1): Promise<{ results: OpenAQLocation[]; meta: { found: number } }> {
  await rateLimiter.wait();
  const bbox = bboxToString(DELHI_BBOX);
  const url = `${OPENAQ_BASE}/locations?bbox=${bbox}&limit=100&page=${page}`;

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (process.env.OPENAQ_API_KEY) {
    headers['X-API-Key'] = process.env.OPENAQ_API_KEY;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OpenAQ API error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  logger.info('openaq-sync', 'Starting location sync');

  let page = 1;
  let total = 0;

  while (true) {
    const { results, meta } = await fetchLocations(page);
    if (!results || results.length === 0) break;

    const rows = results.map((loc) => ({
      openaq_id: loc.id,
      name: loc.name,
      latitude: loc.coordinates.latitude,
      longitude: loc.coordinates.longitude,
      city: loc.locality || null,
      source_name: loc.provider?.name || null,
      sensors: loc.sensors || null,
      is_active: loc.isActive ?? true,
    }));

    // Upsert by openaq_id — use insert with conflict handling via raw approach
    // Since Insforge SDK doesn't have upsert, we'll insert and skip conflicts
    for (const row of rows) {
      const { data: existing } = await insforge.database
        .from('openaq_locations')
        .select('id')
        .eq('openaq_id', row.openaq_id)
        .maybeSingle();

      if (existing) {
        await insforge.database
          .from('openaq_locations')
          .update({ ...row })
          .eq('openaq_id', row.openaq_id);
      } else {
        await insforge.database
          .from('openaq_locations')
          .insert(row);
      }
    }

    total += results.length;
    logger.info('openaq-sync', `Page ${page}: ${results.length} locations (total: ${total})`);

    if (results.length < 100) break;
    page++;
  }

  // Update sync state
  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'openaq');

  logger.info('openaq-sync', `Sync complete. ${total} locations processed.`);
}

main().catch((err) => {
  logger.error('openaq-sync', 'Fatal error', { error: String(err) });
  process.exit(1);
});
