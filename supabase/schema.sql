-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- 1. Official CPCB AQI Stations
create table cpcb_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location geometry(Point, 4326) not null,
  source text default 'CPCB',
  last_updated timestamptz default now()
);

create table cpcb_readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references cpcb_stations(id),
  aqi int,
  pm25 float,
  pm10 float,
  measured_at timestamptz default now()
);

-- 2. Citizen Low-Cost Sensors
create table citizen_sensors (
  id uuid primary key default gen_random_uuid(),
  sensor_uid text unique not null,
  location geometry(Point, 4326) not null,
  owner_id text, -- placeholder for user auth
  is_active boolean default true,
  created_at timestamptz default now()
);

create table citizen_sensor_readings (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid references citizen_sensors(id),
  pm25 float,
  confidence_score float check (confidence_score >= 0 and confidence_score <= 1.0),
  recorded_at timestamptz default now()
);

-- 3. Citizen Pollution Reports (Crowdsourced)
create table citizen_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text check (report_type in ('GARBAGE_BURNING', 'CONSTRUCTION_DUST', 'TRAFFIC_CONGESTION', 'INDUSTRIAL_SMOKE')),
  severity int check (severity >= 1 and severity <= 5),
  description text,
  location geometry(Point, 4326) not null,
  verified boolean default false,
  reported_at timestamptz default now()
);

-- Indexes for Geo Queries
create index idx_cpcb_location on cpcb_stations using gist(location);
create index idx_sensors_location on citizen_sensors using gist(location);
create index idx_reports_location on citizen_reports using gist(location);
