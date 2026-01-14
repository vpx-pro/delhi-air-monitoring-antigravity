'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AQIStation, CitizenSensor, CitizenReport, LayerToggle, TimeRange, Pollutant, Region, PollutionSource, PollutionSourceCategory } from '@/lib/types';
import { Locate, ShieldAlert, Wifi, Users, Calendar, CloudFog, Flame, Droplets, Zap, Activity, Info, Map as MapIcon, Factory, Hammer, BrickWall, Trash2, HardHat, Wheat, Building2, Utensils } from 'lucide-react';
import clsx from 'clsx';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

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

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // Free simple dark basemap
            center: [77.2090, 28.6139], // Delhi
            zoom: 11,
            pitch: 45,
        });

        map.current.on('load', () => {
            setLoaded(true);
            map.current?.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        });

        return () => map.current?.remove();
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
                    // Dynamic color based on selected pollutant logic will be handled below or re-set
                    'circle-color': currentPollutantColor,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.9
                }
            });

            // Labels
            map.current.addLayer({
                id: 'cpcb-labels',
                type: 'symbol',
                source: 'cpcb-source',
                layout: {
                    'text-field': ['get', selectedPollutant], // Dynamic field
                    'text-size': 12,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                },
                paint: {
                    'text-color': '#ffffff',
                }
            });
        }

        // Update CPCB Color and Text dynamically
        if (map.current.getLayer('cpcb-layer')) {
            map.current.setPaintProperty('cpcb-layer', 'circle-color', currentPollutantColor);
        }
        if (map.current.getLayer('cpcb-labels')) {
            map.current.setLayoutProperty('cpcb-labels', 'text-field', ['get', selectedPollutant]);
        }


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
                    'circle-color': currentPollutantColor, // Match main pollutant color but dimmer?
                    'circle-opacity': 0.6,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff' // lighter
                }
            });
        }
        // Update Sensors color
        if (map.current.getLayer('sensors-layer')) {
            map.current.setPaintProperty('sensors-layer', 'circle-color', currentPollutantColor);
        }

        // --- 3. CITIZEN REPORTS (Clustered) ---
        // Filter reports if Fire Mode is active
        const visibleReports = fireMode
            ? reports.filter(r => r.type === 'GARBAGE_BURNING')
            : reports;

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

            // Clusters (Circles)
            map.current.addLayer({
                id: 'reports-clusters',
                type: 'circle',
                source: 'reports-source',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': fireMode ? '#ef4444' : [ // Red for fire mode
                        'step',
                        ['get', 'point_count'],
                        '#eab308', // yellow-500
                        10,
                        '#ca8a04', // yellow-600
                        30,
                        '#854d0e'  // yellow-800
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        100,
                        30,
                        750,
                        40
                    ]
                }
            });

            // Cluster Counts (Text)
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

            // Unclustered Points
            map.current.addLayer({
                id: 'reports-unclustered',
                type: 'circle',
                source: 'reports-source',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-radius': 6,
                    'circle-color': fireMode ? '#ef4444' : '#eab308',
                    'circle-opacity': 0.8,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        // Update Reports Colors dynamically if Fire Mode toggle changes
        if (map.current.getLayer('reports-clusters')) {
            map.current.setPaintProperty('reports-clusters', 'circle-color', fireMode ? '#dc2626' : [
                'step',
                ['get', 'point_count'],
                '#eab308',
                10,
                '#ca8a04',
                30,
                '#854d0e'
            ]);
        }
        if (map.current.getLayer('reports-unclustered')) {
            map.current.setPaintProperty('reports-unclustered', 'circle-color', fireMode ? '#dc2626' : '#eab308');
        }


        // Visibility toggling
        map.current.setLayoutProperty('cpcb-layer', 'visibility', layers.find(l => l.id === 'cpcb')?.active ? 'visible' : 'none');
        map.current.setLayoutProperty('cpcb-labels', 'visibility', layers.find(l => l.id === 'cpcb')?.active ? 'visible' : 'none');
        map.current.setLayoutProperty('sensors-layer', 'visibility', layers.find(l => l.id === 'sensors')?.active ? 'visible' : 'none');

        // Toggle all report layers
        const reportsActive = layers.find(l => l.id === 'reports')?.active ? 'visible' : 'none';
        map.current.setLayoutProperty('reports-clusters', 'visibility', reportsActive);
        map.current.setLayoutProperty('reports-cluster-count', 'visibility', reportsActive);
        map.current.setLayoutProperty('reports-unclustered', 'visibility', reportsActive);

        // Popups
        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        const installPointer = (layerId: string) => {
            if (!map.current) return;

            // Mouse Enter (Desktop Hover)
            map.current.on('mouseenter', layerId, (e: any) => {
                if (!map.current) return;
                map.current.getCanvas().style.cursor = 'pointer';
                showPopup(e, layerId);
            });

            // Mouse Leave (Desktop)
            map.current.on('mouseleave', layerId, () => {
                if (!map.current) return;
                map.current.getCanvas().style.cursor = '';
                popup.remove();
            });

            // Click (Mobile & Sticky)
            map.current.on('click', layerId, (e: any) => {
                showPopup(e, layerId);
            });
        }

        const showPopup = (e: any, layerId: string) => {
            if (!map.current || !e.features || e.features.length === 0) return;

            const coordinates = (e.features[0].geometry as any).coordinates.slice();
            const props = e.features[0].properties;

            let html = '';
            if (layerId === 'cpcb-layer') {
                // Dynamic value based on selected pollutant
                const value = props[selectedPollutant];

                let label: string = selectedPollutant;
                let unit = selectedPollutant === 'co' ? 'mg/m³' : 'µg/m³';

                // Honest Labeling for Live Data (WAQI Search API only gives AQI)
                if (isLive) {
                    label = 'AQI (Overall)';
                    unit = '';
                }

                html = `<div class="p-2 text-slate-900 min-w-[200px]">
                    <h3 class="font-bold text-lg leading-tight mb-1 text-black">${props.name}</h3>
                    <p class="uppercase text-xs font-bold text-gray-500 mb-2">${label}</p>
                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-bold" style="color:${currentPollutantColor}">${value}</span>
                        <span class="text-xs text-gray-500 font-medium">${unit}</span>
                    </div>
                    ${isLive ? '<p class="text-[10px] text-amber-600 font-medium mt-1">Note: Detailed breakdown not available in live feed.</p>' : ''}
                    <p class="text-[10px] text-gray-400 mt-2 border-t pt-1">Source: ${props.source}</p>
                </div>`;
            } else if (layerId === 'sensors-layer') {
                const value = props[selectedPollutant] || 'N/A';
                html = `<div class="p-2 text-slate-900">
                    <h3 class="font-bold text-sm text-black">Citizen Sensor</h3>
                    <p class="uppercase text-xs font-bold text-gray-500">${selectedPollutant}</p>
                    <p class="text-lg font-bold" style="color:${currentPollutantColor}">${value}</p>
                    <p class="text-xs text-gray-500">Conf: ${props.confidence}</p>
                </div>`;
            } else if (layerId === 'reports-unclustered') {
                html = `<div class="p-2 text-slate-900">
                    <h3 class="font-bold text-sm text-black">${props.type.replace('_', ' ')}</h3>
                    <p>Severity: ${props.severity}/5</p>
                </div>`;
            } else if (layerId === 'reports-clusters') {
                html = `<div class="p-2 text-slate-900">
                    <p class="font-bold text-sm text-black">Cluster</p>
                    <p>${props.point_count} Reports</p>
                </div>`;
            }

            // Correction for zoomed out clusters
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            popup.setLngLat(coordinates).setHTML(html).addTo(map.current!);
        };

        // Re-install pointers cleanly? Actually MapLibre handles multiple listeners ok, but cleaner to remove old ones if this effect runs frequently. 
        // For now, this is efficient enough as dependencies change mainly on data update/layer toggle.

        installPointer('cpcb-layer');
        installPointer('sensors-layer');
        installPointer('reports-unclustered');
        installPointer('reports-clusters');

    }, [loaded, stations, sensors, reports, layers, selectedPollutant, fireMode, isLive]);

    // Render Pollution Source Markers
    useEffect(() => {
        if (!map.current || !loaded) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Filter sources
        const visibleSources = sources.filter(s => activeSourceCategories[s.category]);

        visibleSources.forEach(source => {
            const el = document.createElement('div');
            el.className = 'w-6 h-6 rounded-full flex items-center justify-center border border-white shadow-md transform hover:scale-110 transition-transform cursor-pointer';

            // Color and Icon logic based on category
            let color = '#64748b'; // default slate-500
            let iconSvg = '';

            switch (source.category) {
                case 'Power & Energy':
                    color = '#ef4444'; // red-500
                    // Factory Icon SVG
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`;
                    break;
                case 'Industrial Manufacturing':
                    color = '#f97316'; // orange-500
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H14c-.55 0-1 .45-1 1v3.86c0 .85-.33 1.65-.93 2.25L10.82 15"/></svg>`; // Hammer
                    break;
                case 'Waste & Burning':
                    color = '#84cc16'; // lime-500
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`; // Trash
                    break;
                case 'Brick & Construction Materials':
                    color = '#78350f'; // amber-900
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 9v6"/><path d="M16 15v6"/><path d="M16 3v6"/><path d="M3 15h18"/><path d="M3 9h18"/><path d="M8 15v6"/><path d="M8 3v6"/></svg>`; // BrickWall
                    break;
                case 'Construction & Urban Dust':
                    color = '#eab308'; // yellow-500
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M6 16v-4"/><path d="M18 16v-4"/><path d="M10 2v4"/><path d="M14 2v4"/><path d="M12 22V12"/></svg>`; // HardHat/Generic
                    break;
                case 'Fuel Combustion':
                    color = '#dc2626'; // red-600
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.3.3 1.1 1 2 2 3.3z"/></svg>`; // Flame
                    break;
                case 'Agriculture-Linked':
                    color = '#15803d'; // green-700
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 16.53 9 15l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 23l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M12.47 21.53 14 20l1.53 1.53a3.5 3.5 0 0 1 0 4.94L14 28l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M13 8l9 9"/><path d="M5 2 2 5"/><path d="M19 19 22 22"/></svg>`; // Wheat
                    break;
                case 'Public & Institutional':
                    color = '#3b82f6'; // blue-500
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`; // Building
                    break;
            }

            el.style.backgroundColor = color;
            el.innerHTML = iconSvg;

            const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
                <div class="p-2 text-slate-900">
                    <p class="text-xs font-bold text-gray-500 uppercase">${source.category}</p>
                    <h3 class="font-bold text-sm">${source.subType}</h3>
                    <p class="text-xs text-gray-400 mt-1">Status: Active</p>
                </div>
            `);

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([source.location.lng, source.location.lat])
                .setPopup(popup)
                .addTo(map.current!);

            // Add interaction
            el.addEventListener('mouseenter', () => marker.togglePopup());
            el.addEventListener('mouseleave', () => marker.togglePopup());

            markersRef.current.push(marker);
        });

    }, [sources, activeSourceCategories, loaded]);

    const toggleLayer = useCallback((id: string) => {
        setLayers(current => current.map(l => l.id === id ? { ...l, active: !l.active } : l));
    }, []);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSourcesOpen, setIsSourcesOpen] = useState(false);

    return (
        <div className="relative w-full h-full font-sans">
            <div ref={mapContainer} className="absolute inset-0 z-0 bg-slate-900" style={{ height: '100%', width: '100%' }} />

            {/* --- DESKTOP CONTROLS (Top-Left) --- */}
            <div className="hidden md:flex absolute top-4 left-4 z-10 flex-col gap-3 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar pb-4">
                {/* TITLE CARD */}
                <div className="bg-black/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-2xl shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-white font-bold text-xl tracking-tight">Delhi Pollution</h2>
                        {/* Live/Sim Indicator */}
                        <div className={clsx(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                            isLive ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-amber-500/20 text-amber-500 border-amber-500/50"
                        )}>
                            {isLive ? 'LIVE' : 'SIM'}
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Real-time emission monitoring</p>
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
        </div>
    );
}
