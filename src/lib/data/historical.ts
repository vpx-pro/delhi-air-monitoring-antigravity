import { createClient } from '@insforge/sdk';

function getClient() {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY!,
  });
}

export interface HistoricalReadingQuery {
  stationSourceId?: string;
  source?: string;
  parameter?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function getHistoricalReadings(query: HistoricalReadingQuery) {
  const insforge = getClient();
  let q = insforge.database
    .from('historical_readings')
    .select()
    .order('measured_at', { ascending: false })
    .limit(query.limit || 1000);

  if (query.stationSourceId) q = q.eq('station_source_id', query.stationSourceId);
  if (query.source) q = q.eq('station_source', query.source);
  if (query.parameter) q = q.eq('parameter', query.parameter);
  if (query.from) q = q.gte('measured_at', query.from);
  if (query.to) q = q.lte('measured_at', query.to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getWeatherReadings(options: {
  stationId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const insforge = getClient();
  let q = insforge.database
    .from('weather_readings')
    .select()
    .order('measured_at', { ascending: false })
    .limit(options.limit || 500);

  if (options.stationId) q = q.eq('station_id', options.stationId);
  if (options.from) q = q.gte('measured_at', options.from);
  if (options.to) q = q.lte('measured_at', options.to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getFireSummary(options: {
  from?: string;
  to?: string;
  state?: string;
}) {
  const insforge = getClient();
  let q = insforge.database
    .from('fire_daily_summary')
    .select()
    .order('date', { ascending: false })
    .limit(365);

  if (options.from) q = q.gte('date', options.from);
  if (options.to) q = q.lte('date', options.to);
  if (options.state) q = q.eq('state', options.state);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getStationsFromDB() {
  const insforge = getClient();
  const { data, error } = await insforge.database
    .from('cpcb_stations')
    .select();

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getOpenAQLocations() {
  const insforge = getClient();
  const { data, error } = await insforge.database
    .from('openaq_locations')
    .select()
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCorrelatedData(options: {
  from: string;
  to: string;
  stationSourceId?: string;
}) {
  // Join AQ readings + weather + fire data for the same time period
  const [readings, weather, fires] = await Promise.all([
    getHistoricalReadings({
      parameter: 'pm25',
      from: options.from,
      to: options.to,
      stationSourceId: options.stationSourceId,
      limit: 5000,
    }),
    getWeatherReadings({ from: options.from, to: options.to, limit: 5000 }),
    getFireSummary({ from: options.from, to: options.to }),
  ]);

  return { readings, weather, fires };
}
