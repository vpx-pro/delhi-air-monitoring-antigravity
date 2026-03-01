'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Map as MapIcon, BarChart3 } from 'lucide-react';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import TrendHero from '@/components/analytics/TrendHero';
import YearComparison from '@/components/analytics/YearComparison';
import StationHeatmap from '@/components/analytics/StationHeatmap';
import StationDetail from '@/components/analytics/StationDetail';

export default function AnalyticsPage() {
  const [parameter, setParameter] = useState('pm25');
  const [stationId, setStationId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <MapIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">Delhi<span className="text-blue-500">Air</span></span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/map" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Live Map
            </Link>
            <Link href="/analytics" className="text-sm font-medium text-white transition-colors">
              Analytics
            </Link>
            <Link href="/about" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              About
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Is Delhi&apos;s Air Getting Better or Worse?
            </h1>
          </div>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Analyzing 8.5 million hourly readings from 36 CPCB stations across Delhi (2015&ndash;2020).
            Explore trends day-by-day, month-by-month, year-by-year.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <AnalyticsFilters
            parameter={parameter}
            onParameterChange={setParameter}
            stationId={stationId}
            onStationChange={setStationId}
          />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1: Hero Trend */}
          <TrendHero parameter={parameter} stationId={stationId} />

          {/* Section 2: Year-over-Year */}
          <YearComparison parameter={parameter} />

          {/* Section 3: Station Heatmap */}
          <StationHeatmap
            onStationSelect={(id) => {
              setStationId(id);
              // Scroll to detail section
              setTimeout(() => {
                document.getElementById('station-detail')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            selectedPollutant={parameter}
          />

          {/* Section 4: Station Detail (shown when station selected) */}
          {stationId && (
            <div id="station-detail">
              <StationDetail stationId={stationId} parameter={parameter} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
