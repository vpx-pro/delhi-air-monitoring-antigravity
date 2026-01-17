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
  reported_at timestamptz default now(),
  user_id uuid references auth.users(id) -- Linked to auth user
);

-- 4. User Profiles (Linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  role text check (role in ('VOLUNTEER', 'OFFICIAL', 'ADMIN')) default 'VOLUNTEER',
  email text,
  updated_at timestamptz
);

-- Indexes for Geo Queries
create index idx_cpcb_location on cpcb_stations using gist(location);
create index idx_sensors_location on citizen_sensors using gist(location);
create index idx_reports_location on citizen_reports using gist(location);

-- RLS Policies
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check ((select auth.uid()) = id);
create policy "Users can update own profile." on profiles for update using ((select auth.uid()) = id);

alter table citizen_reports enable row level security;
create policy "Reports are viewable by everyone." on citizen_reports for select using (true);
create policy "Authenticated users can create reports." on citizen_reports for insert with check (auth.role() = 'authenticated');

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', 'VOLUNTEER', new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
