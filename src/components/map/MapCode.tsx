'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AQIStation, CitizenSensor, CitizenReport, LayerToggle, TimeRange, Pollutant, Region, PollutionSource, PollutionSourceCategory } from '@/lib/types';
import { Locate, ShieldAlert } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ReportModal from './ReportModal';
import CommandPanel from './CommandPanel';
import { createClient } from '@/lib/supabase/client';
import { MOCK_SATELLITE_DATA, MOCK_TRAFFIC_DATA } from '@/lib/mock_layers';
import { calculateDistance, getAQIStatus, AQIStatus } from '@/lib/utils';

type Props = {
    stations: AQIStation[];
    sensors: CitizenSensor[];
    reports: CitizenReport[];
    sources: PollutionSource[];
    isLive?: boolean;
};

const REGIONS: { id: Region; label: string; center: [number, number]; zoom: number }[] = [
    { id: 'Delhi', label: 'Delhi', center: [77.2090, 28.6139], zoom: 11 },
    { id: 'Haryana', label: 'Haryana', center: [77.0266, 28.9000], zoom: 9 },
    { id: 'Punjab', label: 'Punjab', center: [75.8573, 31.0000], zoom: 8.5 },
];

const POLLUTANTS: { id: Pollutant; label: string; color: string }[] = [
    { id: 'pm25', label: 'PM2.5', color: '#ef4444' },
    { id: 'pm10', label: 'PM10', color: '#f97316' },
    { id: 'no2', label: 'NO₂', color: '#a855f7' },
    { id: 'so2', label: 'SO₂', color: '#3b82f6' },
    { id: 'co', label: 'CO', color: '#eab308' },
];

export default function MapCode({ stations, sensors, reports, sources, isLive = false }: Props) {
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
    const [mobileOpen, setMobileOpen] = useState(false);

    // Safety Alert State
    const [userSafety, setUserSafety] = useState<{ status: AQIStatus, station: AQIStation, distance: number } | null>(null);

    const [layers, setLayers] = useState<LayerToggle[]>([
        { id: 'cpcb', label: 'Official CPCB', active: true, color: '#ef4444' },
        { id: 'sensors', label: 'Citizen Sensors', active: false, color: '#3b82f6' },
        { id: 'reports', label: 'Citizen Reports', active: false, color: '#eab308' },
        { id: 'satellite', label: 'Satellite (Mock)', active: false, color: '#a855f7' },
        { id: 'traffic', label: 'Traffic (Mock)', active: false, color: '#ef4444' },
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

    const setTimeRange = (range: TimeRange) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', range);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const toggleLayer = useCallback((id: string) => {
        setLayers(current => current.map(l => l.id === id ? { ...l, active: !l.active } : l));
    }, []);

    // Initialize Map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

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

        const resizeObserver = new ResizeObserver(() => {
            if (map.current) map.current.resize();
        });
        resizeObserver.observe(mapContainer.current);

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

    // Render Data Layers
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
        }
        if (map.current.getLayer('cpcb-layer')) map.current.setPaintProperty('cpcb-layer', 'circle-color', currentPollutantColor);

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

        // --- 4. SATELLITE LAYER (MOCK) ---
        const satelliteGeoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: MOCK_SATELLITE_DATA.map(s => ({
                type: 'Feature',
                geometry: s.geometry,
                properties: { ...s }
            }))
        };
        if (map.current.getSource('satellite-source')) {
            (map.current.getSource('satellite-source') as maplibregl.GeoJSONSource).setData(satelliteGeoJSON);
        } else {
            map.current.addSource('satellite-source', { type: 'geojson', data: satelliteGeoJSON });
            map.current.addLayer({
                id: 'satellite-layer',
                type: 'fill',
                source: 'satellite-source',
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'type'],
                        'AOD', '#a855f7', // Purple for Aerosol
                        'NO2', '#f97316', // Orange/Brown for NO2
                        '#888888'
                    ],
                    'fill-opacity': ['get', 'value'], // Use intensity for opacity
                }
            });
        }

        // --- 5. TRAFFIC LAYER (MOCK) ---
        const trafficGeoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: MOCK_TRAFFIC_DATA.map(t => ({
                type: 'Feature',
                geometry: t.geometry,
                properties: { ...t }
            }))
        };
        if (map.current.getSource('traffic-source')) {
            (map.current.getSource('traffic-source') as maplibregl.GeoJSONSource).setData(trafficGeoJSON);
        } else {
            map.current.addSource('traffic-source', { type: 'geojson', data: trafficGeoJSON });
            map.current.addLayer({
                id: 'traffic-layer',
                type: 'line',
                source: 'traffic-source',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': [
                        'match',
                        ['get', 'congestionLevel'],
                        'low', '#22c55e',
                        'moderate', '#eab308',
                        'high', '#f97316',
                        'severe', '#dc2626',
                        '#888888'
                    ],
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });
        }

        // --- VISIBILITY TOGGLES ---
        map.current.setLayoutProperty('cpcb-layer', 'visibility', layers.find(l => l.id === 'cpcb')?.active ? 'visible' : 'none');
        map.current.setLayoutProperty('sensors-layer', 'visibility', layers.find(l => l.id === 'sensors')?.active ? 'visible' : 'none');

        const reportsActive = layers.find(l => l.id === 'reports')?.active ? 'visible' : 'none';
        map.current.setLayoutProperty('reports-clusters', 'visibility', reportsActive);
        map.current.setLayoutProperty('reports-cluster-count', 'visibility', reportsActive);
        map.current.setLayoutProperty('reports-unclustered', 'visibility', reportsActive);

        map.current.setLayoutProperty('satellite-layer', 'visibility', layers.find(l => l.id === 'satellite')?.active ? 'visible' : 'none');
        map.current.setLayoutProperty('traffic-layer', 'visibility', layers.find(l => l.id === 'traffic')?.active ? 'visible' : 'none');

    }, [loaded, stations, sensors, reports, layers, selectedPollutant, fireMode, isLive]);

    // Hover Effects & Tooltips
    useEffect(() => {
        if (!map.current || !loaded) return;

        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'aqi-popup',
            maxWidth: '240px'
        });

        // Handler for Stations
        const handleStationHover = (e: any) => {
            map.current!.getCanvas().style.cursor = 'pointer';

            const coordinates = e.features[0].geometry.coordinates.slice();
            const props = e.features[0].properties;

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const html = `
                <div class="px-2 py-1 text-slate-800">
                    <h3 class="font-bold text-sm">${props.name}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-200">AQI: ${props.aqi}</span>
                        <span class="text-xs text-slate-500">PM2.5: ${props.pm25}</span>
                    </div>
                </div>
            `;

            popup.setLngLat(coordinates).setHTML(html).addTo(map.current!);
        };

        // Handler for Citizen Sensors (if they have names/locations)
        const handleSensorHover = (e: any) => {
            map.current!.getCanvas().style.cursor = 'pointer';

            const coordinates = e.features[0].geometry.coordinates.slice();
            const props = e.features[0].properties; // CitizenSensor props

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const val = props.pm25 ? `PM2.5: ${props.pm25}` : 'No Data';

            const html = `
                <div class="px-2 py-1 text-slate-800">
                    <h3 class="font-bold text-sm text-blue-600">Citizen Sensor</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-100">${val}</span>
                        <span class="text-xs text-slate-500">Conf: ${(props.confidence * 100).toFixed(0)}%</span>
                    </div>
                </div>
            `;

            popup.setLngLat(coordinates).setHTML(html).addTo(map.current!);
        }

        const handleLeave = () => {
            map.current!.getCanvas().style.cursor = '';
            popup.remove();
        };

        map.current.on('mouseenter', 'cpcb-layer', handleStationHover);
        map.current.on('mouseleave', 'cpcb-layer', handleLeave);

        map.current.on('mouseenter', 'sensors-layer', handleSensorHover);
        map.current.on('mouseleave', 'sensors-layer', handleLeave);

        return () => {
            if (map.current) {
                map.current.off('mouseenter', 'cpcb-layer', handleStationHover);
                map.current.off('mouseleave', 'cpcb-layer', handleLeave);
                map.current.off('mouseenter', 'sensors-layer', handleSensorHover);
                map.current.off('mouseleave', 'sensors-layer', handleLeave);
                popup.remove();
            }
        };
    }, [loaded]);

    // Pollution Source Markers (Existing Logic preserved)
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
                // ... others
                default: color = '#64748b'; break;
            }
            el.style.backgroundColor = color;
            el.innerHTML = '<div style="width:8px;height:8px;background:white;border-radius:50%"></div>';
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([source.location.lng, source.location.lat])
                .addTo(map.current!);
            markersRef.current.push(marker);
        });
    }, [sources, activeSourceCategories, loaded]);

    // Auth & Reporting State (Preserved)
    const [user, setUser] = useState<any>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportLocation, setReportLocation] = useState<{ lat: number, lng: number } | null>(null);

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

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) { alert("Geolocation n/a"); return; }
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            map.current?.flyTo({ center: [longitude, latitude], zoom: 14 });

            // Find Nearest Station
            let minDist = Infinity;
            let nearest: AQIStation | null = null;

            stations.forEach(station => {
                const d = calculateDistance(latitude, longitude, station.location.lat, station.location.lng);
                if (d < minDist) {
                    minDist = d;
                    nearest = station;
                }
            });

            if (nearest) {
                const status = getAQIStatus((nearest as AQIStation).aqi);
                setUserSafety({ status, station: nearest, distance: minDist });
            }

            if (isReporting) {
                setReportLocation({ lng: longitude, lat: latitude });
                setReportModalOpen(true);
                setIsReporting(false);
                new maplibregl.Marker({ color: '#ec4899' }).setLngLat([longitude, latitude]).addTo(map.current!);
            }
        });
    };

    return (
        <div className="flex w-full h-full font-sans bg-slate-950 overflow-hidden">
            <CommandPanel
                isLive={isLive}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                selectedPollutant={selectedPollutant}
                setSelectedPollutant={setSelectedPollutant}
                currentRange={currentRange}
                setTimeRange={setTimeRange}
                layers={layers}
                toggleLayer={toggleLayer}
                isFireMode={fireMode}
                setFireMode={setFireMode}
                stations={stations}
                reports={reports}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <div className="relative flex-1 h-full">
                <div ref={mapContainer} className="absolute inset-0 z-0 bg-slate-900" style={{ width: '100%', height: '100%' }} />
                <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} location={reportLocation} />

                {/* Safety Alert Card */}
                {userSafety && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-md animate-in fade-in slide-in-from-top-4">
                        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                            <div className="flex items-stretch">
                                <div className="w-2" style={{ backgroundColor: userSafety.status.color }} />
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-white text-lg">
                                            {userSafety.status.isSafe ? "You are in a Safe Zone" : "Health Alert"}
                                        </h3>
                                        <button onClick={() => setUserSafety(null)} className="text-slate-400 hover:text-white">✕</button>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-3">{userSafety.status.message}</p>

                                    <div className="flex items-center justify-between text-xs bg-black/40 rounded-lg p-3">
                                        <div className="text-slate-400">
                                            Nearest Sensor: <span className="text-white font-semibold">{userSafety.station.name}</span>
                                            <div className="mt-0.5">{(userSafety.distance).toFixed(1)} km away</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold" style={{ color: userSafety.status.color }}>
                                                {userSafety.station.aqi} <span className="text-xs text-slate-500">AQI</span>
                                            </div>
                                            <div className="font-medium" style={{ color: userSafety.status.color }}>
                                                {userSafety.status.label}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reporting Instructions */}
                {isReporting && (
                    <div className="absolute top-48 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-max">
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
                )}

                {/* Mobile Controls & Report */}
                <div className="md:hidden absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-4 w-max">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="bg-black/80 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl active:scale-95 transition-transform"
                    >
                        <span className="text-sm font-bold">Controls</span>
                    </button>
                    <button
                        onClick={handleUseMyLocation}
                        className="bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105"
                    >
                        <Locate className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleReportClick}
                        className="bg-pink-600 hover:bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105"
                    >
                        <ShieldAlert className="w-6 h-6" />
                    </button>
                </div>

                {/* Desktop Locate Button */}
                <button
                    onClick={handleUseMyLocation}
                    className="hidden md:flex absolute bottom-24 right-8 z-30 items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-2xl transition-all hover:scale-105"
                >
                    <Locate className="w-5 h-5" />
                    <span>Check My Safety</span>
                </button>

                {/* Desktop Report Button */}
                <button
                    onClick={handleReportClick}
                    className="hidden md:flex absolute bottom-8 right-8 z-30 items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold shadow-2xl transition-all hover:scale-105"
                >
                    <ShieldAlert className="w-5 h-5" />
                    <span>Report Incident</span>
                </button>
            </div>
        </div>
    );
}
