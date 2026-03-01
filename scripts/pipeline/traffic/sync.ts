import * as fs from 'fs';
import * as path from 'path';
import { insforge } from '../lib/insforge-admin';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';

const TOMTOM_BASE = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';
const rateLimiter = new RateLimiter(2); // 2 requests per second

interface Corridor {
  name: string;
  road_type: string;
  waypoints: [number, number][];
  db_id?: string;
}

async function ensureCorridors(): Promise<Corridor[]> {
  const corridorsPath = path.resolve(__dirname, 'corridors.json');
  const corridors: Corridor[] = JSON.parse(fs.readFileSync(corridorsPath, 'utf-8'));

  // Check if corridors exist in DB
  const { data: existing } = await insforge.database
    .from('traffic_corridors')
    .select();

  if (!existing || existing.length === 0) {
    // Seed corridors
    for (const c of corridors) {
      const { data } = await insforge.database
        .from('traffic_corridors')
        .insert({
          name: c.name,
          road_type: c.road_type,
          waypoints: c.waypoints,
        })
        .select();
      if (data?.[0]) {
        c.db_id = (data[0] as any).id;
      }
    }
    logger.info('traffic-sync', `Seeded ${corridors.length} corridors`);
  } else {
    // Map existing to corridors
    for (const c of corridors) {
      const match = (existing as any[]).find((e) => e.name === c.name);
      if (match) c.db_id = match.id;
    }
  }

  return corridors.filter((c) => c.db_id);
}

async function fetchTrafficFlow(lat: number, lon: number): Promise<{ currentSpeed: number; freeFlowSpeed: number; congestion: number } | null> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return null;

  await rateLimiter.wait();
  const url = `${TOMTOM_BASE}?point=${lat},${lon}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn('traffic-sync', `TomTom API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const flow = data.flowSegmentData;
    if (!flow) return null;

    return {
      currentSpeed: flow.currentSpeed,
      freeFlowSpeed: flow.freeFlowSpeed,
      congestion: 1 - (flow.currentSpeed / flow.freeFlowSpeed),
    };
  } catch (err) {
    logger.error('traffic-sync', `Fetch error`, { error: String(err) });
    return null;
  }
}

async function main() {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    logger.warn('traffic-sync', 'TOMTOM_API_KEY not set. Skipping.');
    return;
  }

  logger.info('traffic-sync', 'Starting traffic data sync');

  const corridors = await ensureCorridors();
  const now = new Date().toISOString();
  let synced = 0;

  for (const corridor of corridors) {
    // Use midpoint of first waypoint pair
    const [lat, lon] = corridor.waypoints[0];
    const flow = await fetchTrafficFlow(lat, lon);

    if (flow) {
      await insforge.database.from('traffic_readings').insert({
        corridor_id: corridor.db_id,
        measured_at: now,
        congestion_level: Math.round(flow.congestion * 100) / 100,
        average_speed: flow.currentSpeed,
        free_flow_speed: flow.freeFlowSpeed,
      });
      synced++;
    }
  }

  await insforge.database
    .from('data_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('name', 'tomtom');

  logger.info('traffic-sync', `Synced ${synced}/${corridors.length} corridors.`);
}

main().catch((err) => {
  logger.error('traffic-sync', 'Fatal error', { error: String(err) });
  process.exit(1);
});
