'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { POLLUTANTS, AQI_BANDS, TOOLTIP_STYLE } from './constants';
import { format, parseISO } from 'date-fns';

interface TrendRow {
  period: string;
  avg_value: number;
  max_value: number;
  min_value: number;
}

interface TrendHeroProps {
  parameter: string;
  stationId: string | null;
}

export default function TrendHero({ parameter, stationId }: TrendHeroProps) {
  const [data, setData] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const view = stationId ? 'station' : 'overview';
    const params = new URLSearchParams({ view, parameter, from: '2015-01-01', to: '2020-07-01' });
    if (stationId) params.set('station_id', stationId);

    fetch(`/api/analytics/trends?${params}`)
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [parameter, stationId]);

  const pollutant = POLLUTANTS.find(p => p.value === parameter)!;
  const firstYear = data.filter(d => d.period.startsWith('2015'));
  const lastYear = data.filter(d => d.period.startsWith('2020') || d.period.startsWith('2019'));
  const firstAvg = firstYear.length ? firstYear.reduce((s, d) => s + d.avg_value, 0) / firstYear.length : 0;
  const lastAvg = lastYear.length ? lastYear.reduce((s, d) => s + d.avg_value, 0) / lastYear.length : 0;
  const pctChange = firstAvg ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;
  const isDown = pctChange < 0;

  // Find Y-axis max for reference areas
  const maxY = data.length ? Math.max(...data.map(d => d.avg_value), 250) : 500;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Delhi&apos;s Air Over the Years</h2>
          <p className="text-sm text-slate-400 mt-1">
            Monthly average {pollutant.label} across all stations, 2015&ndash;2020
          </p>
        </div>
        {data.length > 0 && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            isDown ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isDown ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            {pollutant.label} {isDown ? '↓' : '↑'} {Math.abs(pctChange).toFixed(0)}% since 2015
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center text-slate-500">Loading trend data...</div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {/* AQI band backgrounds */}
            {AQI_BANDS.map((band, i) => {
              const prevMax = i === 0 ? 0 : AQI_BANDS[i - 1].max;
              if (prevMax > maxY) return null;
              return (
                <ReferenceArea
                  key={band.label}
                  y1={prevMax}
                  y2={Math.min(band.max, maxY)}
                  fill={band.bg}
                  fillOpacity={1}
                />
              );
            })}
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
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
              domain={[0, maxY]}
              label={{ value: pollutant.unit, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [`${Number(value).toFixed(1)} ${pollutant.unit}`, pollutant.label]}
              labelFormatter={(label) => {
                try { return format(parseISO(`${String(label)}-01`), 'MMMM yyyy'); } catch { return String(label); }
              }}
            />
            <Area
              type="monotone"
              dataKey="avg_value"
              stroke={pollutant.color}
              strokeWidth={2}
              fill={pollutant.color}
              fillOpacity={0.15}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: pollutant.color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* AQI Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/5">
        {AQI_BANDS.map(band => (
          <div key={band.label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: band.color }} />
            {band.label} (&le;{band.max})
          </div>
        ))}
      </div>
    </div>
  );
}
