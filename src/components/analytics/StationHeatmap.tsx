'use client';

import { useEffect, useState } from 'react';
import { STATION_NAMES, getHeatmapColor } from './constants';

interface HeatmapRow {
  station_source_id: string;
  year: number;
  pm25_avg: number | null;
  pm10_avg: number | null;
  no2_avg: number | null;
}

interface StationHeatmapProps {
  onStationSelect: (stationId: string) => void;
  selectedPollutant: string;
}

type PollutantKey = 'pm25_avg' | 'pm10_avg' | 'no2_avg' | 'so2_avg' | 'co_avg';

const POLLUTANT_KEY_MAP: Record<string, PollutantKey> = {
  pm25: 'pm25_avg',
  pm10: 'pm10_avg',
  no2: 'no2_avg',
  so2: 'so2_avg',
  co: 'co_avg',
};

export default function StationHeatmap({ onStationSelect, selectedPollutant }: StationHeatmapProps) {
  const [data, setData] = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/trends?view=heatmap&from=2015-01-01&to=2020-07-01')
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const years = [2015, 2016, 2017, 2018, 2019, 2020];
  const stations = Object.keys(STATION_NAMES);
  const key = POLLUTANT_KEY_MAP[selectedPollutant] || 'pm25_avg';

  // Build lookup: stationId -> year -> value
  const lookup: Record<string, Record<number, number>> = {};
  for (const row of data) {
    if (!lookup[row.station_source_id]) lookup[row.station_source_id] = {};
    const val = row[key as keyof HeatmapRow];
    if (typeof val === 'number') lookup[row.station_source_id][row.year] = val;
  }

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Station Heatmap</h2>
        <p className="text-sm text-slate-400 mt-1">
          Yearly averages per station — click a station to drill down
        </p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading heatmap data...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4 sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10">
                  Station
                </th>
                {years.map(y => (
                  <th key={y} className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 px-2 min-w-[64px]">
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(stationId => {
                const stationData = lookup[stationId];
                if (!stationData) return null;
                return (
                  <tr
                    key={stationId}
                    onClick={() => onStationSelect(stationId)}
                    className="cursor-pointer hover:bg-white/5 transition-colors group"
                  >
                    <td className="py-1.5 pr-4 text-slate-300 font-medium whitespace-nowrap sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10 group-hover:bg-white/5 transition-colors">
                      {STATION_NAMES[stationId]}
                    </td>
                    {years.map(y => {
                      const val = stationData[y];
                      if (val == null) {
                        return (
                          <td key={y} className="py-1.5 px-2 text-center">
                            <div className="w-full h-8 rounded bg-slate-800 flex items-center justify-center text-xs text-slate-600">
                              —
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={y} className="py-1.5 px-2 text-center">
                          <div
                            className="w-full h-8 rounded flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: getHeatmapColor(val) + '25',
                              color: getHeatmapColor(val),
                            }}
                          >
                            {val.toFixed(0)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/5">
        <span className="text-xs text-slate-500">Scale:</span>
        {[
          { label: 'Good', color: '#22c55e' },
          { label: 'Moderate', color: '#eab308' },
          { label: 'Poor', color: '#f97316' },
          { label: 'Very Poor', color: '#ef4444' },
          { label: 'Severe', color: '#7f1d1d' },
        ].map(b => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
