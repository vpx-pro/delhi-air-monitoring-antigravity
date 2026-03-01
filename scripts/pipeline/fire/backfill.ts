import { insforge } from '../lib/insforge-admin';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';
import { NCR_EXTENDED_BBOX } from '../lib/geo-utils';

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api';
const rateLimiter = new RateLimiter(0.5); // 1 request per 2 seconds
const BATCH_SIZE = 500;

// State boundaries (approximate) for classification
function classifyState(lat: number, lon: number): string {
  if (lat >= 28.4 && lat <= 28.9 && lon >= 76.8 && lon <= 77.4) return 'Delhi';
  if (lat >= 27.6 && lat <= 30.9 && lon >= 74.5 && lon <= 77.6) return 'Haryana';
  if (lat >= 29.5 && lat <= 32.5 && lon >= 73.8 && lon <= 76.9) return 'Punjab';
  return 'Other';
}

interface FIRMSRow {
  latitude: number;
  longitude: number;
  brightness?: number;
  bright_ti4?: number;
  frp: number;
  confidence: string;
  satellite: string;
  instrument: string;
  acq_date: string;
  acq_time: string;
  daynight: string;
}

function parseCSVResponse(csv: string): FIRMSRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

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

  const rows: FIRMSRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;
    rows.push({
      latitude: parseFloat(cols[latIdx]),
      longitude: parseFloat(cols[lonIdx]),
      brightness: brightIdx >= 0 ? parseFloat(cols[brightIdx]) : undefined,
      frp: frpIdx >= 0 ? parseFloat(cols[frpIdx]) : 0,
      confidence: confIdx >= 0 ? cols[confIdx] : 'unknown',
      satellite: satIdx >= 0 ? cols[satIdx] : 'unknown',
      instrument: instrIdx >= 0 ? cols[instrIdx] : 'unknown',
      acq_date: dateIdx >= 0 ? cols[dateIdx] : '',
      acq_time: timeIdx >= 0 ? cols[timeIdx] : '',
      daynight: dnIdx >= 0 ? cols[dnIdx] : '',
    });
  }
  return rows;
}

async function fetchFIRMS(source: string, bbox: string, dayRange: number): Promise<FIRMSRow[]> {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    logger.warn('fire-backfill', 'NASA_FIRMS_MAP_KEY not set — using demo data endpoint');
    return [];
  }

  await rateLimiter.wait();
  const url = `${FIRMS_BASE}/area/csv/${mapKey}/${source}/${bbox}/${dayRange}`;
  logger.info('fire-backfill', `Fetching: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FIRMS API error: ${res.status} ${text}`);
  }

  const csv = await res.text();
  return parseCSVResponse(csv);
}

async function main() {
  const bbox = `${NCR_EXTENDED_BBOX.west},${NCR_EXTENDED_BBOX.south},${NCR_EXTENDED_BBOX.east},${NCR_EXTENDED_BBOX.north}`;
  const sources = ['MODIS_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT'];

  // FIRMS API allows max 10 days per request for area queries
  // For backfill, we'd need the archive endpoint which requires different approach
  // Using the NRT endpoint for recent data (last 10 days)
  const dayRange = 10;

  logger.info('fire-backfill', `Starting fire data backfill for bbox: ${bbox}`);

  let grandTotal = 0;

  for (const source of sources) {
    try {
      const rows = await fetchFIRMS(source, bbox, dayRange);
      if (rows.length === 0) {
        logger.info('fire-backfill', `No data from ${source}`);
        continue;
      }

      const dbRows = rows.map((r) => ({
        source,
        latitude: r.latitude,
        longitude: r.longitude,
        brightness: r.brightness ?? null,
        frp: r.frp,
        confidence: r.confidence,
        satellite: r.satellite,
        instrument: r.instrument,
        acq_date: r.acq_date,
        acq_time: r.acq_time,
        daynight: r.daynight,
        state: classifyState(r.latitude, r.longitude),
      }));

      for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
        const batch = dbRows.slice(i, i + BATCH_SIZE);
        const { error } = await insforge.database.from('fire_hotspots').insert(batch);
        if (error) {
          logger.error('fire-backfill', `Insert error`, { error: error.message });
        }
      }

      grandTotal += dbRows.length;
      logger.info('fire-backfill', `${source}: ${dbRows.length} hotspots ingested`);
    } catch (err) {
      logger.error('fire-backfill', `Error for ${source}`, { error: String(err) });
    }
  }

  // Generate daily summaries
  await generateDailySummaries();

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'nasa_firms');

  logger.info('fire-backfill', `Backfill complete. Total: ${grandTotal} hotspots.`);
}

async function generateDailySummaries() {
  logger.info('fire-backfill', 'Generating daily summaries...');

  const { data: hotspots } = await insforge.database
    .from('fire_hotspots')
    .select('acq_date, state, frp, confidence');

  if (!hotspots || hotspots.length === 0) return;

  const summaryMap = new Map<string, { count: number; totalFrp: number; confSum: number }>();

  for (const h of hotspots as any[]) {
    const key = `${h.acq_date}|${h.state}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, { count: 0, totalFrp: 0, confSum: 0 });
    }
    const entry = summaryMap.get(key)!;
    entry.count++;
    entry.totalFrp += h.frp || 0;
    const conf = h.confidence === 'high' ? 90 : h.confidence === 'nominal' ? 60 : parseFloat(h.confidence) || 50;
    entry.confSum += conf;
  }

  const rows = Array.from(summaryMap.entries()).map(([key, val]) => {
    const [date, state] = key.split('|');
    return {
      date,
      state,
      fire_count: val.count,
      total_frp: Math.round(val.totalFrp * 100) / 100,
      avg_confidence: Math.round((val.confSum / val.count) * 100) / 100,
    };
  });

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insforge.database.from('fire_daily_summary').insert(rows.slice(i, i + BATCH_SIZE));
  }

  logger.info('fire-backfill', `Generated ${rows.length} daily summaries`);
}

main().catch((err) => {
  logger.error('fire-backfill', 'Fatal error', { error: String(err) });
  process.exit(1);
});
