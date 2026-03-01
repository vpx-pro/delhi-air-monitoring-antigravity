'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { STATION_NAMES, POLLUTANTS, TOOLTIP_STYLE, YEAR_COLORS } from './constants';
import { format, parseISO } from 'date-fns';

interface TrendRow {
  station_source_id: string;
  period: string;
  avg_value: number;
}

interface StationDetailProps {
  stationId: string;
  parameter: string;
}

export default function StationDetail({ stationId, parameter }: StationDetailProps) {
  const [data, setData] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareYears, setCompareYears] = useState<[number, number]>([2017, 2019]);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    setLoading(true);

    if (showOverlay) {
      // Fetch all pollutants for this station
      const promises = ['pm25', 'pm10', 'no2', 'so2', 'co'].map(p =>
        fetch(`/api/analytics/trends?view=station&parameter=${p}&station_id=${stationId}&from=2015-01-01&to=2020-07-01`)
          .then(r => r.json())
          .then(res => ({ parameter: p, rows: res.data || [] }))
      );
      Promise.all(promises).then(results => {
        // Merge into single dataset keyed by period
        const merged: Record<string, Record<string, number>> = {};
        for (const { parameter: p, rows } of results) {
          for (const row of rows) {
            if (!merged[row.period]) merged[row.period] = {};
            merged[row.period][p] = row.avg_value;
          }
        }
        const mergedData = Object.entries(merged)
          .map(([period, values]) => ({ period, ...values }))
          .sort((a, b) => a.period.localeCompare(b.period));
        setData(mergedData as unknown as TrendRow[]);
        setLoading(false);
      });
    } else {
      fetch(`/api/analytics/trends?view=station&parameter=${parameter}&station_id=${stationId}&from=2015-01-01&to=2020-07-01`)
        .then(r => r.json())
        .then(res => {
          setData(res.data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [stationId, parameter, showOverlay]);

  const pollutant = POLLUTANTS.find(p => p.value === parameter)!;
  const stationName = STATION_NAMES[stationId] || stationId;

  // For year comparison view: restructure data by month (1-12) with year columns
  const yearCompareData = (() => {
    if (showOverlay) return null;
    const [y1, y2] = compareYears;
    const y1prefix = String(y1);
    const y2prefix = String(y2);
    const months: Record<string, { month: string; [key: string]: number | string }> = {};
    for (const row of data) {
      const monthNum = row.period.slice(5, 7);
      if (!months[monthNum]) months[monthNum] = { month: monthNum };
      if (row.period.startsWith(y1prefix)) months[monthNum][y1prefix] = row.avg_value;
      if (row.period.startsWith(y2prefix)) months[monthNum][y2prefix] = row.avg_value;
    }
    return Object.values(months).sort((a, b) => String(a.month).localeCompare(String(b.month)));
  })();

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{stationName}</h2>
          <p className="text-sm text-slate-400 mt-1">Station detail — {stationId}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showOverlay
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {showOverlay ? 'All Pollutants' : 'Overlay All'}
          </button>
        </div>
      </div>

      {/* Year comparison selectors */}
      {!showOverlay && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-slate-500">Compare:</span>
          <select
            value={compareYears[0]}
            onChange={e => setCompareYears([Number(e.target.value), compareYears[1]])}
            className="bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
          >
            {[2015, 2016, 2017, 2018, 2019, 2020].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-slate-600">vs</span>
          <select
            value={compareYears[1]}
            onChange={e => setCompareYears([compareYears[0], Number(e.target.value)])}
            className="bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
          >
            {[2015, 2016, 2017, 2018, 2019, 2020].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="h-72 flex items-center justify-center text-slate-500">Loading station data...</div>
      ) : showOverlay ? (
        /* Multi-pollutant overlay */
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data as unknown as Record<string, unknown>[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="period"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(v: string) => {
                try { return format(parseISO(`${v}-01`), 'MMM yy'); } catch { return v; }
              }}
              interval={5}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(label) => {
                try { return format(parseISO(`${String(label)}-01`), 'MMMM yyyy'); } catch { return String(label); }
              }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            {POLLUTANTS.slice(0, 5).map(p => (
              <Line
                key={p.value}
                type="monotone"
                dataKey={p.value}
                stroke={p.color}
                strokeWidth={1.5}
                dot={false}
                name={p.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        /* Year comparison */
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yearCompareData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(v: string) => {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return monthNames[parseInt(v) - 1] || v;
              }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
              label={{ value: pollutant.unit, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(label) => {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return monthNames[parseInt(String(label)) - 1] || String(label);
              }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey={String(compareYears[0])}
              stroke={YEAR_COLORS[compareYears[0]] || '#3b82f6'}
              strokeWidth={2}
              dot={{ r: 3, fill: YEAR_COLORS[compareYears[0]] || '#3b82f6' }}
              name={String(compareYears[0])}
            />
            <Line
              type="monotone"
              dataKey={String(compareYears[1])}
              stroke={YEAR_COLORS[compareYears[1]] || '#ef4444'}
              strokeWidth={2}
              dot={{ r: 3, fill: YEAR_COLORS[compareYears[1]] || '#ef4444' }}
              name={String(compareYears[1])}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
