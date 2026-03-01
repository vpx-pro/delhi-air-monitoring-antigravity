import * as fs from 'fs';
import * as path from 'path';
import { insforge } from '../lib/insforge-admin';
import { logger } from '../lib/logger';

const BATCH_SIZE = 500;

// CPCB CSV format: "From Date","To Date","PM2.5","PM10","SO2","NO2","CO","Ozone","NH3"
// or sometimes: "Sampling Date","PM2.5 (ug/m3)","PM10 (ug/m3)",...

interface CSVRow {
  date: string;
  pm25?: number;
  pm10?: number;
  so2?: number;
  no2?: number;
  co?: number;
  o3?: number;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());

  // Find column indexes
  const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('from'));
  const pm25Idx = header.findIndex((h) => h.includes('pm2.5') || h === 'pm25');
  const pm10Idx = header.findIndex((h) => h.includes('pm10'));
  const so2Idx = header.findIndex((h) => h.includes('so2'));
  const no2Idx = header.findIndex((h) => h.includes('no2'));
  const coIdx = header.findIndex((h) => h === 'co' || h.includes('co ('));
  const o3Idx = header.findIndex((h) => h.includes('ozone') || h.includes('o3'));

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    if (!cols[dateIdx]) continue;

    const parseVal = (idx: number): number | undefined => {
      if (idx < 0 || !cols[idx] || cols[idx] === 'NA' || cols[idx] === 'None' || cols[idx] === '-') return undefined;
      const v = parseFloat(cols[idx]);
      return isNaN(v) ? undefined : v;
    };

    rows.push({
      date: cols[dateIdx],
      pm25: parseVal(pm25Idx),
      pm10: parseVal(pm10Idx),
      so2: parseVal(so2Idx),
      no2: parseVal(no2Idx),
      co: parseVal(coIdx),
      o3: parseVal(o3Idx),
    });
  }
  return rows;
}

function parseDate(dateStr: string): string {
  // Handle formats: "01/01/2020 00:00", "2020-01-01", "01-01-2020"
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();

  // Try DD/MM/YYYY HH:MM format
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:00Z`).toISOString();
  }
  return new Date().toISOString();
}

async function importFile(filePath: string, stationId: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCSV(content);
  const filename = path.basename(filePath);

  logger.info('cpcb-import', `Parsing ${filename}: ${rows.length} rows`);

  // Track import
  await insforge.database.from('cpcb_csv_imports').insert({
    filename,
    station_name: stationId,
    row_count: rows.length,
    status: 'processing',
  });

  const readings: any[] = [];
  for (const row of rows) {
    const measuredAt = parseDate(row.date);
    const params: Record<string, number | undefined> = {
      pm25: row.pm25,
      pm10: row.pm10,
      so2: row.so2,
      no2: row.no2,
      co: row.co,
      o3: row.o3,
    };

    for (const [param, value] of Object.entries(params)) {
      if (value === undefined) continue;
      readings.push({
        station_source: 'cpcb_csv',
        station_source_id: stationId,
        parameter: param,
        value,
        unit: param === 'co' ? 'mg/m3' : 'ug/m3',
        measured_at: measuredAt,
        quality_flag: null,
      });
    }
  }

  // Batch insert
  let inserted = 0;
  for (let i = 0; i < readings.length; i += BATCH_SIZE) {
    const batch = readings.slice(i, i + BATCH_SIZE);
    const { error } = await insforge.database.from('historical_readings').insert(batch);
    if (error) {
      logger.error('cpcb-import', `Batch insert error`, { error: error.message });
    } else {
      inserted += batch.length;
    }
  }

  // Update import status
  await insforge.database
    .from('cpcb_csv_imports')
    .update({ status: 'completed', row_count: inserted })
    .eq('filename', filename);

  logger.info('cpcb-import', `Imported ${inserted} readings from ${filename}`);
}

async function main() {
  const filePath = process.argv[2];
  const stationId = process.argv[3];

  if (!filePath || !stationId) {
    console.error('Usage: npx tsx scripts/pipeline/cpcb/import-csv.ts <csv-file> <station-id>');
    console.error('Example: npx tsx scripts/pipeline/cpcb/import-csv.ts data/anand_vihar_2020.csv cpcb-001');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  await importFile(filePath, stationId);
}

main().catch((err) => {
  logger.error('cpcb-import', 'Fatal error', { error: String(err) });
  process.exit(1);
});
