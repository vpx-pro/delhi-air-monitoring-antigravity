import * as fs from 'fs';
import { insforge } from '../lib/insforge-admin';
import { logger } from '../lib/logger';

const BATCH_SIZE = 500;

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/pipeline/satellite/ingest.ts <csv-file>');
    console.error('Example: npx tsx scripts/pipeline/satellite/ingest.ts data/sentinel5p_no2.csv');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    logger.warn('satellite-ingest', 'CSV file is empty');
    return;
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row: Record<string, any> = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx]?.trim();
    });

    rows.push({
      satellite: row.satellite || 'Sentinel-5P',
      product: row.product || 'NO2',
      center_lat: parseFloat(row.center_lat) || null,
      center_lon: parseFloat(row.center_lon) || null,
      value: parseFloat(row.value),
      unit: row.unit || 'mol/m2',
      quality_value: row.quality_value ? parseFloat(row.quality_value) : null,
      observed_at: row.observed_at,
    });
  }

  logger.info('satellite-ingest', `Parsed ${rows.length} rows from ${filePath}`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await insforge.database.from('satellite_observations').insert(batch);
    if (error) {
      logger.error('satellite-ingest', 'Insert error', { error: error.message });
    } else {
      inserted += batch.length;
    }
  }

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'sentinel5p');

  logger.info('satellite-ingest', `Ingested ${inserted} satellite observations.`);
}

main().catch((err) => {
  logger.error('satellite-ingest', 'Fatal error', { error: String(err) });
  process.exit(1);
});
