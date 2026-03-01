export const STATION_NAMES: Record<string, string> = {
  DL001: 'Alipur',
  DL002: 'Anand Vihar',
  DL003: 'Ashok Vihar',
  DL004: 'Aya Nagar',
  DL005: 'Bawana',
  DL006: 'Burari Crossing',
  DL007: 'CRRI Mathura Road',
  DL008: 'DTU',
  DL009: 'Dr. Karni Singh Shooting Range',
  DL010: 'Dwarka-Sector 8',
  DL011: 'East Arjun Nagar',
  DL012: 'IGI Airport (T3)',
  DL013: 'IHBAS, Dilshad Garden',
  DL014: 'ITO',
  DL015: 'Jahangirpuri',
  DL016: 'Jawaharlal Nehru Stadium',
  DL017: 'Lodhi Road',
  DL018: 'Major Dhyan Chand Stadium',
  DL019: 'Mandir Marg',
  DL020: 'Mundka',
  DL021: 'NSIT Dwarka',
  DL022: 'Najafgarh',
  DL023: 'Narela',
  DL024: 'Nehru Nagar',
  DL025: 'North Campus, DU',
  DL026: 'Okhla Phase-2',
  DL027: 'Patparganj',
  DL028: 'Punjabi Bagh',
  DL029: 'Pusa (DPCC)',
  DL030: 'Pusa (IMD)',
  DL031: 'R K Puram',
  DL032: 'Rohini',
  DL033: 'Shadipur',
  DL034: 'Sirifort',
  DL035: 'Sonia Vihar',
  DL036: 'Sri Aurobindo Marg',
};

export const POLLUTANTS = [
  { value: 'pm25', label: 'PM2.5', unit: 'µg/m³', color: '#ef4444' },
  { value: 'pm10', label: 'PM10', unit: 'µg/m³', color: '#f97316' },
  { value: 'no2', label: 'NO₂', unit: 'µg/m³', color: '#a855f7' },
  { value: 'so2', label: 'SO₂', unit: 'µg/m³', color: '#3b82f6' },
  { value: 'co', label: 'CO', unit: 'mg/m³', color: '#eab308' },
  { value: 'o3', label: 'O₃', unit: 'µg/m³', color: '#22c55e' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// AQI bands based on PM2.5 (µg/m³) — India NAQI standards
export const AQI_BANDS = [
  { label: 'Good', max: 30, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { label: 'Satisfactory', max: 60, color: '#84cc16', bg: 'rgba(132,204,22,0.12)' },
  { label: 'Moderate', max: 90, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  { label: 'Poor', max: 120, color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { label: 'Very Poor', max: 250, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { label: 'Severe', max: 500, color: '#7f1d1d', bg: 'rgba(127,29,29,0.15)' },
];

export function getAqiBand(pm25: number) {
  return AQI_BANDS.find(b => pm25 <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
}

export function getHeatmapColor(value: number): string {
  if (value <= 30) return '#22c55e';
  if (value <= 60) return '#84cc16';
  if (value <= 90) return '#eab308';
  if (value <= 120) return '#f97316';
  if (value <= 250) return '#ef4444';
  return '#7f1d1d';
}

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '13px',
  },
  labelStyle: { color: '#94a3b8' },
};

export const YEAR_COLORS: Record<number, string> = {
  2015: '#3b82f6',
  2016: '#8b5cf6',
  2017: '#ec4899',
  2018: '#f97316',
  2019: '#eab308',
  2020: '#22c55e',
};
