'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { POLLUTANTS, MONTHS, TOOLTIP_STYLE, YEAR_COLORS } from './constants';

interface YoYRow {
  period: string;
  avg_value: number;
}

interface YearComparisonProps {
  parameter: string;
}

export default function YearComparison({ parameter }: YearComparisonProps) {
  const [month, setMonth] = useState(11); // November (Diwali season)
  const [data, setData] = useState<{ year: string; avg_value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      view: 'yoy',
      parameter,
      from: '2015-01-01',
      to: '2020-07-01',
      month: String(month),
    });

    fetch(`/api/analytics/trends?${params}`)
      .then(r => r.json())
      .then(res => {
        const rows: YoYRow[] = res.data || [];
        const mapped = rows.map(r => ({
          year: r.period.slice(0, 4),
          avg_value: r.avg_value,
        }));
        setData(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [parameter, month]);

  const pollutant = POLLUTANTS.find(p => p.value === parameter)!;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Year-over-Year Comparison</h2>
          <p className="text-sm text-slate-400 mt-1">
            Compare {pollutant.label} for the same month across years
          </p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading comparison data...</div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">No data for {MONTHS[month - 1]}</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="year"
              tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
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
              formatter={(value) => [`${Number(value).toFixed(1)} ${pollutant.unit}`, pollutant.label]}
              labelFormatter={(label) => `${MONTHS[month - 1]} ${label}`}
            />
            <Legend
              formatter={() => `${MONTHS[month - 1]} — ${pollutant.label}`}
              wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
            />
            <Bar
              dataKey="avg_value"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
              fill={pollutant.color}
              // Color each bar by year
              label={false}
            >
              {data.map(entry => (
                <rect
                  key={entry.year}
                  fill={YEAR_COLORS[Number(entry.year)] || pollutant.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
