import { insforge } from '../lib/insforge-admin';
import { logger } from '../lib/logger';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

const BATCH_SIZE = 500;
const DATA_DIR = path.resolve(__dirname, '../../../data/kaggle_aq');

// Parameters we care about (column name → normalized name)
const PARAM_MAP: Record<string, string> = {
  'PM2.5': 'pm25',
  'PM10': 'pm10',
  'NO2': 'no2',
  'SO2': 'so2',
  'CO': 'co',
  'O3': 'o3',
  'NO': 'no',
  'NOx': 'nox',
  'NH3': 'nh3',
  'Benzene': 'benzene',
  'Toluene': 'toluene',
  'Xylene': 'xylene',
};

// Only Delhi station IDs
const DELHI_PREFIX = 'DL';

interface CSVRow {
  StationId: string;
  Datetime: string;
  [key: string]: string;
}

async function processStationHourly() {
  const filePath = path.join(DATA_DIR, 'station_hour.csv');
  if (!fs.existsSync(filePath)) {
    logger.error('kaggle-import', `File not found: ${filePath}`);
    return;
  }

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  let batch: any[] = [];
  let totalInserted = 0;
  let totalSkipped = 0;
  let lineNum = 0;
  let delhiStations = new Set<string>();

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      // Parse header — handle BOM
      headers = line.replace(/^\uFEFF/, '').split(',');
      continue;
    }

    // Parse CSV line (simple — no quoted commas in this dataset)
    const values = line.split(',');
    const stationId = values[0];

    // Only Delhi stations
    if (!stationId.startsWith(DELHI_PREFIX)) {
      totalSkipped++;
      continue;
    }

    delhiStations.add(stationId);
    const datetime = values[1];

    // Extract each parameter
    for (let i = 2; i < headers.length; i++) {
      const colName = headers[i];
      const paramName = PARAM_MAP[colName];
      if (!paramName) continue;

      const val = values[i];
      if (!val || val === '' || val === 'NA' || val === 'None') continue;

      const numVal = parseFloat(val);
      if (isNaN(numVal)) continue;

      // Unit mapping
      let unit = 'µg/m³';
      if (paramName === 'co') unit = 'mg/m³';

      batch.push({
        station_source: 'cpcb_kaggle',
        station_source_id: stationId,
        parameter: paramName,
        value: numVal,
        unit,
        measured_at: datetime,
        quality_flag: null,
      });
    }

    // Flush batch
    if (batch.length >= BATCH_SIZE) {
      const { error } = await insforge.database.from('historical_readings').insert(batch);
      if (error) {
        logger.error('kaggle-import', `Insert error at line ${lineNum}`, { error: error.message });
      } else {
        totalInserted += batch.length;
      }
      batch = [];

      if (totalInserted % 50000 === 0) {
        logger.info('kaggle-import', `Progress: ${totalInserted} readings inserted, line ${lineNum}`);
      }
    }
  }

  // Final batch
  if (batch.length > 0) {
    const { error } = await insforge.database.from('historical_readings').insert(batch);
    if (error) {
      logger.error('kaggle-import', `Final batch error`, { error: error.message });
    } else {
      totalInserted += batch.length;
    }
  }

  logger.info('kaggle-import', `=== COMPLETE ===`);
  logger.info('kaggle-import', `Total readings inserted: ${totalInserted}`);
  logger.info('kaggle-import', `Lines skipped (non-Delhi): ${totalSkipped}`);
  logger.info('kaggle-import', `Delhi stations found: ${delhiStations.size} — ${Array.from(delhiStations).sort().join(', ')}`);
}

async function main() {
  logger.info('kaggle-import', '=== Kaggle Delhi AQ Data Import ===');
  logger.info('kaggle-import', `Source: station_hour.csv (hourly per-station readings)`);

  // Check if we already imported
  const { data: existing } = await insforge.database
    .from('historical_readings')
    .select('id')
    .eq('station_source', 'cpcb_kaggle')
    .limit(1);

  if (existing && existing.length > 0) {
    logger.warn('kaggle-import', 'cpcb_kaggle data already exists. Skipping to avoid duplicates.');
    logger.info('kaggle-import', 'To re-import, first delete: DELETE FROM historical_readings WHERE station_source = \'cpcb_kaggle\'');
    return;
  }

  await processStationHourly();

  // Update data_sources sync state
  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString(), sync_cursor: JSON.stringify({ source: 'kaggle', file: 'station_hour.csv' }) })
    .eq('name', 'openaq');
}

main().catch((err) => {
  logger.error('kaggle-import', 'Fatal error', { error: String(err) });
  process.exit(1);
});
