'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AQIStation, CitizenSensor, CitizenReport, LayerToggle, TimeRange, Pollutant, Region, PollutionSource, PollutionSourceCategory } from '@/lib/types';
import { Locate, ShieldAlert, Wifi, Users, Calendar, CloudFog, Flame, Droplets, Zap, Activity, Info, Map as MapIcon, Factory, Hammer, BrickWall, Trash2, HardHat, Wheat, Building2, Utensils } from 'lucide-react';
import clsx from 'clsx';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ReportModal from './ReportModal';
import { createClient } from '@/lib/supabase/client';

type Props = {
    stations: AQIStation[];
    sensors: CitizenSensor[];
    reports: CitizenReport[];
    sources: PollutionSource[];
    isLive?: boolean;
};

const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: 'live', label: 'Live' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
];

const REGIONS: { id: Region; label: string; center: [number, number]; zoom: number }[] = [
    { id: 'Delhi', label: 'Delhi', center: [77.2090, 28.6139], zoom: 11 },
    { id: 'Haryana', label: 'Haryana', center: [77.0266, 28.9000], zoom: 9 }, // Roughly centered between Gurugram/Panipat
    { id: 'Punjab', label: 'Punjab', center: [75.8573, 31.0000], zoom: 8.5 }, // Centered on Ludhiana/Amritsar
];

const POLLUTANTS: { id: Pollutant; label: string; color: string; icon: any }[] = [
    { id: 'pm25', label: 'PM2.5', color: '#ef4444', icon: CloudFog }, // Red
    { id: 'pm10', label: 'PM10', color: '#f97316', icon: CloudFog }, // Orange
    { id: 'no2', label: 'NO₂', color: '#a855f7', icon: Zap }, // Purple
    { id: 'so2', label: 'SO₂', color: '#3b82f6', icon: Droplets }, // Blue
    { id: 'co', label: 'CO', color: '#eab308', icon: Activity }, // Yellow
];

export default function MapCode({ stations, sensors, reports, sources, isLive }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const [loaded, setLoaded] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const currentRange = (searchParams.get('range') as TimeRange) || 'live';

    // Pollutant Selection State
    const [selectedPollutant, setSelectedPollutant] = useState<Pollutant>('pm25');
    const [selectedRegion, setSelectedRegion] = useState<Region>('Delhi');
    const [fireMode, setFireMode] = useState(false);

    // Initialize state from URL or defaults
    const [layers, setLayers] = useState<LayerToggle[]>([
        {
            id: 'cpcb',
            label: 'Official CPCB Stations',
            active: searchParams.get('layers') ? searchParams.get('layers')?.includes('cpcb') ?? true : true,
            color: '#ef4444'
        },
        {
            id: 'sensors',
            label: 'Citizen Sensors (Sim)',
            active: searchParams.get('layers') ? searchParams.get('layers')?.includes('sensors') ?? false : false,
            color: '#3b82f6'
        },
        {
            id: 'reports',
            label: 'Citizen Reports (Sim)',
            active: searchParams.get('layers') ? searchParams.get('layers')?.includes('reports') ?? false : false,
            color: '#eab308'
        },
    ]);

    // Source Categories State
    const [activeSourceCategories, setActiveSourceCategories] = useState<Record<PollutionSourceCategory, boolean>>({
        'Power & Energy': false,
        'Industrial Manufacturing': false,
        'Brick & Construction Materials': false,
        'Waste & Burning': false,
        'Construction & Urban Dust': false,
        'Fuel Combustion': false,
        'Agriculture-Linked': false,
        'Public & Institutional': false,
    });

    // Sync URL when layers change
    useEffect(() => {
        const activeLayerIds = layers.filter(l => l.active).map(l => l.id);
        const params = new URLSearchParams(searchParams.toString());

        const currentLayers = params.get('layers');
        const newLayers = activeLayerIds.join(',');

        if (activeLayerIds.length > 0) {
            params.set('layers', newLayers);
        } else {
            params.delete('layers');
        }

        // Only update if changes
        const currentLayersStr = searchParams.get('layers') || '';
        const newLayersStr = activeLayerIds.length > 0 ? activeLayerIds.join(',') : '';

        if (currentLayersStr !== newLayersStr) {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [layers, pathname, router, searchParams]);


    const setTimeRange = (range: TimeRange) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', range);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        if (mapContainer.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                center: [77.2090, 28.6139],
                zoom: 11,
                pitch: 45,
            });

            map.current.on('load', () => {
                setLoaded(true);
                map.current?.addControl(new maplibregl.NavigationControl(), 'bottom-right');
                map.current?.resize();
            });

            // Force aggressive resizing to handle race conditions
            const interval = setInterval(() => {
                map.current?.resize();
            }, 100);
            setTimeout(() => clearInterval(interval), 2000);
        }

        // Resize Observer to handle container resizing (e.g. route transitions)
        const resizeObserver = new ResizeObserver(() => {
            if (map.current) {
                map.current.resize();
            }
        });

        if (mapContainer.current) {
            resizeObserver.observe(mapContainer.current);
        }

        return () => {
            map.current?.remove();
            resizeObserver.disconnect();
        };
    }, []);

    // Handle Region FlyTo
    useEffect(() => {
        if (!map.current) return;
        const config = REGIONS.find(r => r.id === selectedRegion);
        if (config) {
            map.current.flyTo({
                center: config.center,
                zoom: config.zoom,
                pitch: 45,
                essential: true
            });
        }
    }, [selectedRegion]);

    // Handle Data & Layers
    useEffect(() => {
        if (!loaded || !map.current) return;

        const currentPollutantColor = POLLUTANTS.find(p => p.id === selectedPollutant)?.color || '#ef4444';

        // --- 1. CPCB STATIONS ---
        const stationsGeoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: stations.map(s => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.location.lng, s.location.lat] },
                properties: { ...s, icon: 'station' }
            }))
        };

        if (map.current.getSource('cpcb-source')) {
            (map.current.getSource('cpcb-source') as maplibregl.GeoJSONSource).setData(stationsGeoJSON);
        } else {
            map.current.addSource('cpcb-source', { type: 'geojson', data: stationsGeoJSON });
            map.current.addLayer({
                id: 'cpcb-layer',
                type: 'circle',
                source: 'cpcb-source',
                paint: {
                    'circle-radius': 8,
                    'circle-color': currentPollutantColor,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.9
                }
            });
            map.current.addLayer({
                id: 'cpcb-labels',
                type: 'symbol',
                source: 'cpcb-source',
                layout: {
                    'text-field': ['get', selectedPollutant],
                    'text-size': 12,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                },
                paint: { 'text-color': '#ffffff' }
            });
        }

        if (map.current.getLayer('cpcb-layer')) map.current.setPaintProperty('cpcb-layer', 'circle-color', currentPollutantColor);
        if (map.current.getLayer('cpcb-labels')) map.current.setLayoutProperty('cpcb-labels', 'text-field', ['get', selectedPollutant]);

        // --- 2. CITIZEN SENSORS ---
        const sensorsGeoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: sensors.map(s => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.location.lng, s.location.lat] },
                properties: { ...s, icon: 'sensor' }
            }))
        };

        if (map.current.getSource('sensors-source')) {
            (map.current.getSource('sensors-source') as maplibregl.GeoJSONSource).setData(sensorsGeoJSON);
        } else {
            map.current.addSource('sensors-source', { type: 'geojson', data: sensorsGeoJSON });
            map.current.addLayer({
                id: 'sensors-layer',
                type: 'circle',
                source: 'sensors-source',
                paint: {
                    'circle-radius': 5,
                    'circle-color': currentPollutantColor,
                    'circle-opacity': 0.6,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }
        if (map.current.getLayer('sensors-layer')) map.current.setPaintProperty('sensors-layer', 'circle-color', currentPollutantColor);

        // --- 3. CITIZEN REPORTS ---
        const visibleReports = fireMode ? reports.filter(r => r.type === 'GARBAGE_BURNING') : reports;
        const reportsGeoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: visibleReports.map(r => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [r.location.lng, r.location.lat] },
                properties: { ...r, icon: 'report' }
            }))
        };

        if (map.current.getSource('reports-source')) {
            (map.current.getSource('reports-source') as maplibregl.GeoJSONSource).setData(reportsGeoJSON);
        } else {
            map.current.addSource('reports-source', {
                type: 'geojson',
                data: reportsGeoJSON,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });
            map.current.addLayer({
                id: 'reports-clusters',
                type: 'circle',
                source: 'reports-source',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': fireMode ? '#dc2626' : ['step', ['get', 'point_count'], '#eab308', 10, '#ca8a04', 30, '#854d0e'],
                    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
                }
            });
            map.current.addLayer({
                id: 'reports-cluster-count',
                type: 'symbol',
                source: 'reports-source',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                }
            });
            map.current.addLayer({
                id: 'reports-unclustered',
                type: 'circle',
                source: 'reports-source',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-radius': 6,
                    'circle-color': fireMode ? '#dc2626' : '#eab308',
                    'circle-opacity': 0.8,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        if (map.current.getLayer('reports-clusters')) map.current.setPaintProperty('reports-clusters', 'circle-color', fireMode ? '#dc2626' : ['step', ['get', 'point_count'], '#eab308', 10, '#ca8a04', 30, '#854d0e']);
        if (map.current.getLayer('reports-unclustered')) map.current.setPaintProperty('reports-unclustered', 'circle-color', fireMode ? '#dc2626' : '#eab308');

        // Toggle Layers
        map.current.setLayoutProperty('cpcb-layer', 'visibility', layers.find(l => l.id === 'cpcb')?.active ? 'visible' : 'none');
        map.current.setLayoutProperty('cpcb-labels', 'visibility', layers.find(l => l.id === 'cpcb')?.active ? 'visible' : 'none');
        map.current.setLayoutProperty('sensors-layer', 'visibility', layers.find(l => l.id === 'sensors')?.active ? 'visible' : 'none');
        const reportsActive = layers.find(l => l.id === 'reports')?.active ? 'visible' : 'none';
        map.current.setLayoutProperty('reports-clusters', 'visibility', reportsActive);
        map.current.setLayoutProperty('reports-cluster-count', 'visibility', reportsActive);
        map.current.setLayoutProperty('reports-unclustered', 'visibility', reportsActive);

        // Popups
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
        const showPopup = (e: any, layerId: string) => {
            if (!map.current || !e.features || e.features.length === 0) return;
            const coordinates = (e.features[0].geometry as any).coordinates.slice();
            const props = e.features[0].properties;
            let html = '';

            if (layerId === 'cpcb-layer') {
                let value = props[selectedPollutant];
                let label: string = selectedPollutant;
                let unit = selectedPollutant === 'co' ? 'mg/m³' : 'µg/m³';
                if (isLive) { label = 'AQI (Overall)'; unit = ''; }
                html = `<div class="p-2 text-slate-900 min-w-[200px]">
                    <h3 class="font-bold text-lg leading-tight mb-1 text-black">${props.name}</h3>
                    <p class="uppercase text-xs font-bold text-gray-500 mb-2">${label}</p>
                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-bold" style="color:${currentPollutantColor}">${value}</span>
                        <span class="text-xs text-gray-500 font-medium">${unit}</span>
                    </div>
                </div>`;
            } else if (layerId === 'sensors-layer') {
                html = `<div class="p-2 text-slate-900"><h3 class="font-bold text-sm text-black">Citizen Sensor</h3><p class="text-lg font-bold" style="color:${currentPollutantColor}">${props[selectedPollutant] || 'N/A'}</p></div>`;
            } else if (layerId === 'reports-unclustered') {
                html = `<div class="p-2 text-slate-900"><h3 class="font-bold text-sm text-black">${props.type?.replace('_', ' ')}</h3><p>Severity: ${props.severity}/5</p></div>`;
            } else if (layerId === 'reports-clusters') {
                html = `<div class="p-2 text-slate-900"><p>${props.point_count} Reports</p></div>`;
            }

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            popup.setLngLat(coordinates).setHTML(html).addTo(map.current!);
        };

        ['cpcb-layer', 'sensors-layer', 'reports-unclustered', 'reports-clusters'].forEach(id => {
            map.current?.on('mouseenter', id, (e) => { map.current!.getCanvas().style.cursor = 'pointer'; showPopup(e, id); });
            map.current?.on('mouseleave', id, () => { map.current!.getCanvas().style.cursor = ''; popup.remove(); });
            map.current?.on('click', id, (e) => showPopup(e, id));
        });

    }, [loaded, stations, sensors, reports, layers, selectedPollutant, fireMode, isLive]);

    // Pollution Source Markers
    useEffect(() => {
        if (!map.current || !loaded) return;
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        const visibleSources = sources.filter(s => activeSourceCategories[s.category]);
        visibleSources.forEach(source => {
            const el = document.createElement('div');
            el.className = 'w-6 h-6 rounded-full flex items-center justify-center border border-white shadow-md transform hover:scale-110 transition-transform cursor-pointer';
            let color = '#64748b';
            switch (source.category) {
                case 'Power & Energy': color = '#ef4444'; break;
                case 'Industrial Manufacturing': color = '#f97316'; break;
                // ... others can default or be added fully later, keeping it simple for fix
                default: color = '#64748b'; break;
            }
            el.style.backgroundColor = color;
            el.innerHTML = '<div style="width:8px;height:8px;background:white;border-radius:50%"></div>'; // Simple dot for now
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([source.location.lng, source.location.lat])
                .addTo(map.current!);
            markersRef.current.push(marker);
        });
    }, [sources, activeSourceCategories, loaded]);

    const toggleLayer = useCallback((id: string) => {
        setLayers(current => current.map(l => l.id === id ? { ...l, active: !l.active } : l));
    }, []);

    // Volunteer / Auth State
    const [user, setUser] = useState<any>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportLocation, setReportLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSourcesOpen, setIsSourcesOpen] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        }
        checkUser();
    }, []);

    const handleReportClick = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        setIsReporting(true);
    };

    useEffect(() => {
        if (!map.current) return;
        const onMapClick = (e: any) => {
            if (isReporting) {
                const { lng, lat } = e.lngLat;
                setReportLocation({ lng, lat });
                setReportModalOpen(true);
                setIsReporting(false);
                new maplibregl.Marker({ color: '#ec4899' }).setLngLat([lng, lat]).addTo(map.current!);
            }
        };
        if (isReporting) {
            map.current.getCanvas().style.cursor = 'crosshair';
            map.current.on('click', onMapClick);
        } else {
            map.current.getCanvas().style.cursor = '';
            map.current.off('click', onMapClick);
        }
        return () => { if (map.current) map.current.off('click', onMapClick); };
    }, [isReporting]);

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) { alert("Geolocation n/a"); return; }
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            map.current?.flyTo({ center: [longitude, latitude], zoom: 15 });
            if (isReporting) {
                setReportLocation({ lng: longitude, lat: latitude });
                setReportModalOpen(true);
                setIsReporting(false);
                new maplibregl.Marker({ color: '#ec4899' }).setLngLat([longitude, latitude]).addTo(map.current!);
            }
        });
    };

    return (
        <div className="relative w-full h-full font-sans">
            <div ref={mapContainer} className="absolute inset-0 z-0 bg-slate-900" style={{ height: '100%', width: '100%' }} />
            <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} location={reportLocation} />

            {/* Reporting overlay instruction */}
            {
                isReporting && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-max">
                        <div className="bg-black/80 text-white px-6 py-3 rounded-full border border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-bounce font-bold flex items-center gap-3">
                            <span>📍 Tap location to report</span>
                            <button onClick={() => setIsReporting(false)} className="text-slate-400 hover:text-white text-xs uppercase border-l border-white/20 pl-3">Cancel</button>
                        </div>

                        <button
                            onClick={handleUseMyLocation}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all"
                        >
                            <Locate className="w-3 h-3" />
                            Use My Current Location
                        </button>
                    </div>
                )
            }

            {/* Report Button (Floating Bottom Right on Desktop, Top Right on Mobile to avoid drawer) */}
            <button
                onClick={handleReportClick}
                className="absolute bottom-8 right-8 z-30 hidden md:flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold shadow-2xl transition-all hover:scale-105"
            >
                <ShieldAlert className="w-5 h-5" />
                Report Incident
            </button>
            {/* Mobile Report Button (Top Right) */}
            <button
                onClick={handleReportClick}
                className="md:hidden absolute top-4 right-4 z-30 flex flex-col items-center justify-center w-12 h-12 bg-pink-600/90 backdrop-blur text-white rounded-full shadow-xl border border-pink-400"
            >
                <ShieldAlert className="w-6 h-6" />
            </button>

            {/* Mobile Home Button (Top Left) */}
            <button
                onClick={() => router.push('/')}
                className="md:hidden absolute top-4 left-4 z-30 flex flex-col items-center justify-center w-10 h-10 bg-black/50 backdrop-blur text-white rounded-full shadow-xl border border-white/10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </button>

            {/* --- DESKTOP CONTROLS (Top-Left) --- */}
            <div className="hidden md:flex absolute top-4 left-4 z-10 flex-col gap-3 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar pb-4">
                {/* TITLE CARD */}
                <div className="bg-black/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-2xl shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-white font-bold text-xl tracking-tight">Delhi Pollution</h2>
                            {/* Live/Sim Indicator */}
                            <div className={clsx(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                                isLive ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-amber-500/20 text-amber-500 border-amber-500/50"
                            )}>
                                {isLive ? 'LIVE' : 'SIM'}
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                            title="Go Home"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium tracking-wide uppercase leading-relaxed">Real-time emission monitoring</p>
                </div>

                {/* REGION SELECTOR */}
                <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg shrink-0">
                    <p className="text-[10px] text-slate-400 mb-2 px-1 font-bold tracking-wider uppercase">Region</p>
                    <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                        {REGIONS.map(region => (
                            <button
                                key={region.id}
                                onClick={() => setSelectedRegion(region.id)}
                                className={clsx(
                                    "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center",
                                    selectedRegion === region.id
                                        ? "bg-white text-black shadow-lg"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {region.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* POLLUTANT SELECTOR */}
                <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg shrink-0">
                    <div className="flex items-center justify-between mb-2 pl-1 pr-1">
                        <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Pollutant</p>
                        <button
                            onClick={() => {
                                const newMode = !fireMode;
                                setFireMode(newMode);
                                if (newMode) setLayers(l => l.map(x => x.id === 'reports' ? { ...x, active: true } : x));
                            }}
                            className={clsx(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all border",
                                fireMode ? "bg-red-500/20 text-red-500 border-red-500" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"
                            )}
                        >
                            <Flame className="w-3 h-3" />
                            FIRE
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                        {POLLUTANTS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPollutant(p.id)}
                                className={clsx(
                                    "flex flex-col items-center justify-center py-2 rounded-xl transition-all border",
                                    selectedPollutant === p.id
                                        ? "bg-white/10 border-white/20 shadow-inner"
                                        : "bg-transparent border-transparent hover:bg-white/5 opacity-60 hover:opacity-100"
                                )}
                            >
                                <div
                                    className="w-2 h-2 rounded-full mb-1.5 shadow-[0_0_8px_currentColor]"
                                    style={{ backgroundColor: p.color, color: p.color }}
                                />
                                <span className={clsx("text-[10px] font-bold", selectedPollutant === p.id ? "text-white" : "text-slate-400")}>
                                    {p.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TIME RANGE SELECTOR */}
                <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg shrink-0">
                    <p className="text-[10px] text-slate-400 mb-2 px-1 font-bold tracking-wider uppercase">Time Range</p>
                    <div className="grid grid-cols-4 gap-1">
                        {TIME_RANGES.map(range => (
                            <button
                                key={range.id}
                                onClick={() => setTimeRange(range.id)}
                                className={clsx(
                                    "py-2 rounded-lg text-[10px] font-bold transition-all text-center border",
                                    currentRange === range.id
                                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                                        : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"
                                )}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* LAYERS */}
                <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg shrink-0">
                    <p className="text-[10px] text-slate-400 mb-3 font-bold tracking-wider uppercase">Layers</p>
                    <div className="space-y-2">
                        {layers.map(layer => (
                            <button
                                key={layer.id}
                                onClick={() => toggleLayer(layer.id)}
                                className={clsx(
                                    "w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all border",
                                    layer.active ? "bg-white/10 border-white/20" : "bg-transparent border-transparent hover:bg-white/5 opacity-50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={clsx("p-1.5 rounded-lg", layer.active ? "bg-white/10" : "bg-white/5")}>
                                        {layer.id === 'cpcb' && <ShieldAlert className="w-4 h-4" style={{ color: layer.color }} />}
                                        {layer.id === 'sensors' && <Wifi className="w-4 h-4" style={{ color: layer.color }} />}
                                        {layer.id === 'reports' && <Users className="w-4 h-4" style={{ color: layer.color }} />}
                                    </div>
                                    <span className="text-white">{layer.label}</span>
                                </div>
                                {layer.active && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-3">
                        <button
                            onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                            className="w-full flex items-center justify-between group"
                        >
                            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase group-hover:text-white transition-colors">Pollution Sources</p>
                            <div className={clsx("transition-transform duration-300 text-slate-400", isSourcesOpen ? "rotate-180" : "")}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </button>

                        <div className={clsx(
                            "space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                            isSourcesOpen ? "max-h-[500px] mt-2 opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {(Object.keys(activeSourceCategories) as PollutionSourceCategory[]).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveSourceCategories(curr => ({ ...curr, [cat]: !curr[cat] }))}
                                    className={clsx(
                                        "w-full flex items-center gap-2 p-2 rounded-lg text-[10px] text-left transition-all border",
                                        activeSourceCategories[cat] ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    <div className={clsx("w-2 h-2 rounded-full", activeSourceCategories[cat] ? "bg-green-500" : "bg-slate-700")} />
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MOBILE CONTROLS (Bottom Drawer) --- */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 flex flex-col justify-end pointer-events-none">
                {/* Floating Toggle Button */}
                <div className="pointer-events-auto flex justify-center mb-4">
                    <button
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        className="bg-black/80 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl active:scale-95 transition-transform"
                    >
                        <span className="text-sm font-bold">Controls</span>
                    </button>
                </div>

                {/* Drawer Content */}
                <div className={clsx(
                    "pointer-events-auto bg-slate-900/95 backdrop-blur-xl border-t border-white/10 w-full p-6 pb-10 rounded-t-3xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
                    isDrawerOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                )}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8" />

                    {/* MOBILE REGION */}
                    <div className="mb-8">
                        <p className="text-xs text-slate-400 mb-4 font-bold uppercase tracking-wider">Region</p>
                        <div className="flex bg-white/5 rounded-2xl p-1.5 gap-2">
                            {REGIONS.map(region => (
                                <button
                                    key={region.id}
                                    onClick={() => setSelectedRegion(region.id)}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center",
                                        selectedRegion === region.id
                                            ? "bg-white text-black shadow-lg"
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {region.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MOBILE POLLUTANT */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pollutant</p>
                            <button
                                onClick={() => {
                                    const newMode = !fireMode;
                                    setFireMode(newMode);
                                    if (newMode) setLayers(l => l.map(x => x.id === 'reports' ? { ...x, active: true } : x));
                                }}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                    fireMode ? "bg-red-500/20 text-red-500 border-red-500" : "bg-white/5 text-slate-400 border-transparent"
                                )}
                            >
                                <Flame className="w-3.5 h-3.5" />
                                FIRE MODE
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {POLLUTANTS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPollutant(p.id)}
                                    className={clsx(
                                        "flex flex-col items-center justify-center py-3 rounded-xl transition-all border",
                                        selectedPollutant === p.id
                                            ? "bg-white/10 border-white/20"
                                            : "bg-white/5 border-transparent opacity-60"
                                    )}
                                >
                                    <div
                                        className="w-2.5 h-2.5 rounded-full mb-2 shadow-[0_0_8px_currentColor]"
                                        style={{ backgroundColor: p.color, color: p.color }}
                                    />
                                    <span className={clsx("text-[10px] font-bold", selectedPollutant === p.id ? "text-white" : "text-slate-400")}>
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MOBILE TIME RANGE */}
                    <div className="mb-8">
                        <p className="text-xs text-slate-400 mb-4 font-bold uppercase tracking-wider">Time Range</p>
                        <div className="grid grid-cols-4 gap-2">
                            {TIME_RANGES.map(range => (
                                <button
                                    key={range.id}
                                    onClick={() => setTimeRange(range.id)}
                                    className={clsx(
                                        "py-3 rounded-xl text-xs font-bold transition-all text-center border",
                                        currentRange === range.id
                                            ? "bg-blue-600 text-white border-blue-500"
                                            : "bg-white/5 text-slate-300 border-transparent"
                                    )}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <h2 className="text-white font-bold text-lg mb-4">Layers</h2>

                    <div className="space-y-3">
                        {layers.map(layer => (
                            <button
                                key={layer.id}
                                onClick={() => toggleLayer(layer.id)}
                                className={clsx(
                                    "w-full flex items-center justify-between p-4 rounded-xl text-base transition-all border",
                                    layer.active ? "bg-white/10 border-white/30" : "bg-white/5 border-transparent opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {layer.id === 'cpcb' && <ShieldAlert className="w-5 h-5" style={{ color: layer.color }} />}
                                    {layer.id === 'sensors' && <Wifi className="w-5 h-5" style={{ color: layer.color }} />}
                                    {layer.id === 'reports' && <Users className="w-5 h-5" style={{ color: layer.color }} />}
                                    <span className="text-white font-medium">{layer.label}</span>
                                </div>
                                <div className={clsx(
                                    "w-5 h-5 rounded-full border flex items-center justify-center",
                                    layer.active ? "border-green-500 bg-green-500/20" : "border-white/30"
                                )}>
                                    {layer.active && <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="mt-8 w-full py-4 bg-white text-black font-bold text-lg rounded-2xl active:scale-95 transition-transform shadow-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div >
    );
}
