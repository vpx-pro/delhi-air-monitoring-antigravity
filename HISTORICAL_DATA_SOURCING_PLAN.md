# Historical Data Sourcing Pipeline — Implementation Plan (Insforge)

## Context

The Delhi Pollution dashboard currently relies on **simulated data** for most layers. To become a real data platform, we need to backfill years of historical data and set up ongoing ingestion pipelines from open data sources.

**Backend**: Insforge (PostgreSQL + PostgREST)
- **URL**: `https://4w6464gr.ap-southeast.insforge.app`
- **SDK**: `@insforge/sdk` — `insforge.database.from('table')` for queries
- **Schema management**: `run-raw-sql` MCP tool
- **Storage**: `create-bucket` MCP tool + SDK `insforge.storage.from('bucket')`
- **Edge Functions**: Deno-based, deployed via `create-function` MCP tool
- **Current state**: Empty DB (no tables), no buckets, no functions

**Key Insforge SDK patterns**:
```typescript
import { createClient } from '@insforge/sdk';
const insforge = createClient({
  baseUrl: 'https://4w6464gr.ap-southeast.insforge.app',
  anonKey: 'your-anon-key'
});
// Read:  insforge.database.from('table').select().eq('col', val)
// Write: insforge.database.from('table').insert([{...}]).select()
// RPC:   insforge.database.rpc('function_name', { args })
```

This plan covers **7 data sources** across **10 steps**, executed one at a time.

---

## Step 0: Foundation — Database Schema & Pipeline Infrastructure

### 0A. Create all base tables on Insforge

Use `run-raw-sql` MCP tool to create the app schema on Insforge. Adapt from `supabase/schema.sql` — remove `auth.users` FK references, use `float` lat/lon instead of PostGIS geometry.

**Tables to create**:
1. Existing app tables (adapted): `cpcb_stations`, `cpcb_readings`, `citizen_sensors`, `citizen_sensor_readings`, `citizen_reports`, `profiles`
2. Pipeline tracking: `data_sources`

### 0B. Pipeline scripts directory

```
scripts/
  pipeline/
    lib/
      insforge-admin.ts   -- Insforge client for pipeline scripts
      rate-limiter.ts      -- Token-bucket rate limiter
      logger.ts            -- Structured logging
      geo-utils.ts         -- Bounding boxes for Delhi/Haryana/Punjab
    openaq/
    cpcb/
    weather/
    fire/
    satellite/
    traffic/
```

### 0C. `scripts/pipeline/lib/insforge-admin.ts`

```typescript
import { createClient } from '@insforge/sdk';
export const insforge = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL!,
  anonKey: process.env.INSFORGE_ANON_KEY!
});
```

### 0D. Environment variables (`.env.local`)

```
INSFORGE_BASE_URL=https://4w6464gr.ap-southeast.insforge.app
INSFORGE_ANON_KEY=<from get-anon-key tool>
OPENAQ_API_KEY=                        # Optional
NASA_FIRMS_MAP_KEY=                    # Free registration
TOMTOM_API_KEY=                        # For traffic (Step 7)
```

### 0E. Install dependencies

```bash
npm install @insforge/sdk@latest
npm install -D tsx
```

### 0F. Replace Supabase client with Insforge across app

Update `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` → export Insforge clients. Update all imports in API routes and pages.

---

## Step 1: OpenAQ Historical Air Quality (2015–present)

**Source**: `https://api.openaq.org/v3` — Free, 30+ Delhi stations, hourly PM2.5/PM10/NO2/SO2/CO/O3

**Tables**: `openaq_locations`, `historical_readings` (unified for all AQ sources)

**Scripts**:
- `scripts/pipeline/openaq/sync-locations.ts` — Fetch & upsert stations
- `scripts/pipeline/openaq/backfill.ts` — 30-day windows, 1 req/sec, resumable
- `scripts/pipeline/openaq/incremental.ts` — Last 2 hours, hourly

**API**: `GET /api/historical/readings?station_id=X&parameter=pm25&from=...&to=...&granularity=hourly|daily`

**Volume**: ~15M rows. Backfill ~4-5 hours.

---

## Step 2: CPCB CSV Historical Data

**Source**: CSV from `app.cpcbccr.com` / `data.gov.in` — Official govt data

**Tables**: `cpcb_csv_imports` (tracking). Data → `historical_readings` with `station_source = 'cpcb_csv'`

**Scripts**:
- `scripts/pipeline/cpcb/import-csv.ts` — Parse & batch insert
- `scripts/pipeline/cpcb/station-map.json` — Name-to-ID mapping

---

## Step 3: WAQI Live Data Persistence

**Goal**: Persist every WAQI fetch to DB, building history going forward.

**Changes**:
- `src/lib/api.ts` → Insert into `historical_readings` after each WAQI fetch
- `src/app/api/stations/route.ts` → Query DB for historical ranges instead of simulation

---

## Step 4: Open-Meteo Weather Data (1940–present)

**Source**: `https://archive-api.open-meteo.com/v1/archive` — Free, no API key

**Parameters**: temperature, humidity, wind speed/direction, precipitation, pressure, cloud cover, boundary layer height

**Tables**: `weather_stations` (7 locations), `weather_readings`

**Scripts**:
- `scripts/pipeline/weather/backfill.ts` — 1-year chunks, ~70 API calls total
- `scripts/pipeline/weather/incremental.ts` — Last 48h every 6 hours

**API**: `GET /api/historical/weather?lat=28.6&lon=77.2&from=...&to=...`

**Volume**: ~613K rows. Backfill ~10 minutes.

---

## Step 5: NASA FIRMS Fire/Crop Burning Data (2000–present)

**Source**: `https://firms.modaps.eosdis.nasa.gov/api/` — MODIS + VIIRS. Free MAP_KEY.

**Tables**: `fire_hotspots`, `fire_daily_summary`

**Scripts**:
- `scripts/pipeline/fire/backfill.ts` — Archive for bbox `74.5,28.0,78.0,32.5`
- `scripts/pipeline/fire/incremental.ts` — Last 2 days every 6 hours

**API**: `GET /api/historical/fires?from=...&to=...&state=Punjab`

**Volume**: ~500K–1M rows.

---

## Step 6: Sentinel-5P Satellite Air Quality (2018–present)

**Source**: Google Earth Engine `COPERNICUS/S5P/OFFL/L3_NO2`

**Tables**: `satellite_observations`

**Scripts**:
- `scripts/pipeline/satellite/extract-gee.py` — Python (GEE SDK), exports CSV
- `scripts/pipeline/satellite/ingest.ts` — CSV → Insforge DB

**Alternative**: Copernicus CAMS API (pure HTTP, no Python needed).

---

## Step 7: Traffic Data (Forward-looking)

**Source**: TomTom Traffic Flow API — 2,500 free requests/day

**Tables**: `traffic_corridors`, `traffic_readings`

**Scripts**:
- `scripts/pipeline/traffic/corridors.json` — 15-20 major Delhi roads
- `scripts/pipeline/traffic/sync.ts` — Every 30 min peak, 2h off-peak

---

## Step 8: Unified Data Access Layer

**Goal**: Replace all simulation with real Insforge DB queries.

- `src/lib/data/historical.ts` — Query module using Insforge SDK
- Update `src/app/map/page.tsx` — DB for all ranges, simulation as fallback
- New API routes: `/api/historical/readings`, `/api/historical/weather`, `/api/historical/fires`, `/api/historical/correlated`

---

## Step 9: Pipeline Orchestration & Monitoring

- `scripts/pipeline/run-all.ts` — CLI runner
- Deploy incremental scripts as **Insforge edge functions** (cron-triggered)
- `pipeline_runs` table for tracking
- `datasets` storage bucket for CSV exports
- Pipeline status panel in admin dashboard

---

## Step 10: AI Training Data Export

- RPC function joining `historical_readings` + `weather_readings` + `fire_daily_summary` by hour
- Update `src/lib/ai/prediction_model.ts` to train on real data
- Daily CSV export to Insforge Storage `datasets` bucket

---

## Execution Order

| Step | Source | Independent? | Est. Backfill |
|------|--------|-------------|---------------|
| 0 | Infrastructure + Insforge setup | **Must be first** | N/A |
| 1 | OpenAQ | Yes | ~4-5 hours |
| 2 | CPCB CSV | Yes | Manual per file |
| 3 | WAQI Persist | Yes | Forward only |
| 4 | Open-Meteo | Yes | ~10 minutes |
| 5 | NASA FIRMS | Yes | ~1-2 hours |
| 6 | Sentinel-5P | Yes | ~30 min |
| 7 | TomTom Traffic | Yes | Forward only |
| 8 | Unified API | After Step 1+ | N/A |
| 9 | Orchestration | After Steps 1-7 | N/A |
| 10 | AI Training | After Steps 1,4,5 | N/A |

## Verification Strategy

After each step:
1. Run script locally: `npx tsx scripts/pipeline/<source>/backfill.ts`
2. Verify via `run-raw-sql`: `SELECT COUNT(*) FROM <table>`
3. Test API route returns correct JSON
4. Check map/chart renders with real data
