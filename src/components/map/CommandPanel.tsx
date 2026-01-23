import React, { useState } from 'react';
import {
    ShieldAlert, Wifi, Users, Globe, Car,
    Flame, CloudFog, Zap, Droplets, Activity,
    Calendar, Map as MapIcon, ChevronLeft, ChevronRight,
    LayoutDashboard, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { Region, Pollutant, TimeRange, LayerToggle, AQIStation, CitizenReport } from '@/lib/types';
import dynamic from 'next/dynamic';

const PollutionChart = dynamic(() => import('./PollutionChart'), { ssr: false });

type Props = {
    isLive: boolean;
    selectedRegion: Region;
    setSelectedRegion: (r: Region) => void;
    selectedPollutant: Pollutant;
    setSelectedPollutant: (p: Pollutant) => void;
    currentRange: TimeRange;
    setTimeRange: (t: TimeRange) => void;
    layers: LayerToggle[];
    toggleLayer: (id: string) => void;
    isFireMode: boolean;
    setFireMode: (mode: boolean) => void;
    stations: AQIStation[];
    reports: CitizenReport[];
    mobileOpen?: boolean;
    setMobileOpen?: (open: boolean) => void;
};

const REGIONS: { id: Region; label: string }[] = [
    { id: 'Delhi', label: 'Delhi' },
    { id: 'Haryana', label: 'Haryana' },
    { id: 'Punjab', label: 'Punjab' },
];

const POLLUTANTS: { id: Pollutant; label: string; color: string; icon: any }[] = [
    { id: 'pm25', label: 'PM2.5', color: '#ef4444', icon: CloudFog },
    { id: 'pm10', label: 'PM10', color: '#f97316', icon: CloudFog },
    { id: 'no2', label: 'NO₂', color: '#a855f7', icon: Zap },
    { id: 'so2', label: 'SO₂', color: '#3b82f6', icon: Droplets },
    { id: 'co', label: 'CO', color: '#eab308', icon: Activity },
];

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: 'live', label: 'Live' },
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
];

export default function CommandPanel({
    isLive,
    selectedRegion, setSelectedRegion,
    selectedPollutant, setSelectedPollutant,
    currentRange, setTimeRange,
    layers, toggleLayer,
    isFireMode, setFireMode,
    stations, reports,
    mobileOpen = false,
    setMobileOpen
}: Props) {
    const [collapsed, setCollapsed] = useState(false);

    // Calculate Stats
    const avgAQI = Math.round(stations.reduce((acc, s) => acc + s.aqi, 0) / (stations.length || 1));
    const activeFires = reports.filter(r => r.type === 'GARBAGE_BURNING').length;

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileOpen?.(false)}
                />
            )}

            <div className={clsx(
                "flex flex-col bg-slate-950/90 backdrop-blur-md border-r border-white/10 transition-all duration-300 font-sans z-50",
                // Desktop Styles
                "hidden md:flex md:relative md:h-full",
                collapsed ? "md:w-16" : "md:w-80",
                // Mobile Styles (Drawer)
                "md:flex-col", // Reset
                mobileOpen ? "!flex fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-3xl border-t w-full" : "hidden"
            )}>
                {/* Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-white/20 rounded-full flex items-center justify-center text-slate-400 hover:text-white z-50 shadow-lg"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Header */}
                <div className="p-4 border-b border-white/10 shrink-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="font-bold text-white text-base leading-tight">Command Centre</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Online</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Analytics Chart (Lazy Loaded to avoid SSR issues) */}
                {!collapsed && (
                    <div className="px-4 pt-4 shrink-0">
                        <PollutionChart currentAQI={avgAQI} region={selectedRegion} />
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {!collapsed ? (
                        <div className="p-4 space-y-6">

                            {/* Global Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold text-center mb-1">Avg AQI</p>
                                    <p className={clsx("text-2xl font-bold text-center", avgAQI > 300 ? "text-red-500" : "text-white")}>
                                        {avgAQI}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold text-center mb-1">Active Fires</p>
                                    <p className="text-2xl font-bold text-center text-orange-500">
                                        {activeFires}
                                    </p>
                                </div>
                            </div>

                            {/* Region */}
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 px-1">Target Region</p>
                                <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                                    {REGIONS.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setSelectedRegion(r.id)}
                                            className={clsx(
                                                "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all",
                                                selectedRegion === r.id ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"
                                            )}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pollutants */}
                            <div>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pollutants</p>
                                    <button
                                        onClick={() => setFireMode(!isFireMode)}
                                        className={clsx(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all",
                                            isFireMode ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-white/5 text-slate-500 border-transparent hover:text-red-400"
                                        )}
                                    >
                                        <Flame size={10} /> Mode
                                    </button>
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                    {POLLUTANTS.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedPollutant(p.id)}
                                            className={clsx(
                                                "flex flex-col items-center justify-center py-2 rounded-lg border transition-all",
                                                selectedPollutant === p.id
                                                    ? "bg-white/10 border-white/20 shadow-inner"
                                                    : "bg-transparent border-transparent hover:bg-white/5 opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ backgroundColor: p.color }} />
                                            <span className={clsx("text-[9px] font-bold", selectedPollutant === p.id ? "text-white" : "text-slate-400")}>
                                                {p.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Range */}
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 px-1">Time Horizon</p>
                                <div className="grid grid-cols-4 gap-1">
                                    {TIME_RANGES.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTimeRange(t.id)}
                                            className={clsx(
                                                "py-1.5 rounded-md text-[10px] font-bold transition-all border",
                                                currentRange === t.id
                                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                    : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layers */}
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 px-1">Data Layers</p>
                                <div className="space-y-1">
                                    {layers.map(l => (
                                        <button
                                            key={l.id}
                                            onClick={() => toggleLayer(l.id)}
                                            className={clsx(
                                                "w-full flex items-center justify-between p-2 rounded-lg border transition-all group",
                                                l.active ? "bg-white/10 border-white/20" : "bg-transparent border-transparent hover:bg-white/5 opacity-60"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={clsx("p-1.5 rounded-md", l.active ? "bg-white/10" : "bg-white/5")}>
                                                    {l.id === 'cpcb' && <ShieldAlert size={14} style={{ color: l.color }} />}
                                                    {l.id === 'sensors' && <Wifi size={14} style={{ color: l.color }} />}
                                                    {l.id === 'reports' && <Users size={14} style={{ color: l.color }} />}
                                                    {l.id === 'satellite' && <Globe size={14} className="text-purple-400" />}
                                                    {l.id === 'traffic' && <Car size={14} className="text-red-400" />}
                                                </div>
                                                <span className="text-xs font-medium text-slate-200">{l.label}</span>
                                            </div>
                                            <div className={clsx(
                                                "w-2 h-2 rounded-full transition-all",
                                                l.active ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-700"
                                            )} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Alerts */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 text-red-500 mb-1">
                                    <AlertTriangle size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Critical Alerts</span>
                                </div>
                                <p className="text-xs text-red-200">
                                    4 High Severity Fires detected in Punjab region.
                                </p>
                            </div>

                        </div>
                    ) : (
                        // Collapsed View
                        <div className="flex flex-col items-center py-4 gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white text-xs font-bold">
                                {avgAQI}
                            </div>
                            <div className="h-px w-8 bg-white/10" />
                            {layers.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => toggleLayer(l.id)}
                                    title={l.label}
                                    className={clsx(
                                        "p-2 rounded-lg transition-all",
                                        l.active ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
                                    )}
                                >
                                    {l.id === 'cpcb' && <ShieldAlert size={16} />}
                                    {l.id === 'sensors' && <Wifi size={16} />}
                                    {l.id === 'reports' && <Users size={16} />}
                                    {l.id === 'satellite' && <Globe size={16} />}
                                    {l.id === 'traffic' && <Car size={16} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 shrink-0">
                    <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                        {!collapsed ? "Export Report" : <MapIcon size={14} />}
                    </button>
                </div>
            </div>
        </>
    );
}
