export type Coordinates = {
  lat: number;
  lng: number;
};

export type Region = 'Delhi' | 'Haryana' | 'Punjab';

export type Pollutant = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co';

export type AQIStation = {
  id: string;
  name: string;
  location: Coordinates;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  lastUpdated: string;
  source: 'CPCB';
};

export type CitizenSensor = {
  id: string;
  location: Coordinates;
  pm25: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  confidence: number;
  lastUpdated: string;
};

export type CitizenReport = {
  id: string;
  type: 'GARBAGE_BURNING' | 'CONSTRUCTION_DUST' | 'TRAFFIC_CONGESTION';
  severity: number; // 1-5
  location: Coordinates;
  timestamp: string;
  status: 'pending' | 'verified' | 'rejected';
};

export type PollutionSourceCategory =
  | 'Power & Energy'
  | 'Industrial Manufacturing'
  | 'Brick & Construction Materials'
  | 'Waste & Burning'
  | 'Construction & Urban Dust'
  | 'Fuel Combustion'
  | 'Agriculture-Linked'
  | 'Public & Institutional';

export type PollutionSource = {
  id: string;
  category: PollutionSourceCategory;
  subType: string;
  label: string;
  location: Coordinates;
};

export type SatelliteData = {
  id: string;
  type: 'AOD' | 'NO2' | 'FIRE';
  geometry: GeoJSON.Polygon;
  value: number; // intensity 0-1
  timestamp: string;
};

export type TrafficData = {
  id: string;
  geometry: GeoJSON.LineString;
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
  speed: number;
};

export type LayerToggle = {
  id: 'cpcb' | 'sensors' | 'reports' | 'satellite' | 'traffic';
  label: string;
  active: boolean;
  color: string;
};

export type TimeRange = 'live' | '24h' | '7d' | '30d';
