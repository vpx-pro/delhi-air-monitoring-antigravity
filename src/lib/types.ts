export type Coordinates = {
  lat: number;
  lng: number;
};

export type PollutantValue = {
  value: number;
  unit: string;
};

export type AQIStation = {
  id: string;
  name: string;
  location: Coordinates;
  aqi: number;
  pm25: number;
  pm10: number;
  lastUpdated: string;
  source: 'CPCB' | 'SAFAR' | 'DPCC';
};

export type CitizenSensor = {
  id: string;
  location: Coordinates;
  pm25: number;
  confidence: number; // 0-1
  lastUpdated: string;
};

export type ReportType = 'GARBAGE_BURNING' | 'CONSTRUCTION_DUST' | 'TRAFFIC_CONGESTION' | 'INDUSTRIAL_SMOKE';

export type CitizenReport = {
  id: string;
  type: ReportType;
  severity: number; // 1-5
  location: Coordinates;
  timestamp: string;
  verified: boolean;
};

export interface LayerToggle {
  id: string;
  label: string;
  active: boolean;
  color: string;
}
