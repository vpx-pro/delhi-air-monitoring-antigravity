'use client';

import { POLLUTANTS, STATION_NAMES } from './constants';

interface AnalyticsFiltersProps {
  parameter: string;
  onParameterChange: (p: string) => void;
  stationId: string | null;
  onStationChange: (s: string | null) => void;
}

export default function AnalyticsFilters({
  parameter,
  onParameterChange,
  stationId,
  onStationChange,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Pollutant Picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pollutant</label>
        <select
          value={parameter}
          onChange={e => onParameterChange(e.target.value)}
          className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {POLLUTANTS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Station Picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Station</label>
        <select
          value={stationId || ''}
          onChange={e => onStationChange(e.target.value || null)}
          className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Delhi (Average)</option>
          {Object.entries(STATION_NAMES).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
