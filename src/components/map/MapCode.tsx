'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { AQIStation, CitizenSensor, CitizenReport, LayerToggle } from '@/lib/types';
import { Locate, ShieldAlert, Wifi, Users } from 'lucide-react';
import clsx from 'clsx';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type Props = {
    stations: AQIStation[];
    sensors: CitizenSensor[];
    reports: CitizenReport[];
};

export default function MapCode({ stations, sensors, reports }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [loaded, setLoaded] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

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

    // Sync URL when layers change
    useEffect(() => {
        const activeLayerIds = layers.filter(l => l.active).map(l => l.id);
        const params = new URLSearchParams(searchParams.toString());

        if (activeLayerIds.length > 0) {
            params.set('layers', activeLayerIds.join(','));
        } else {
            params.delete('layers');
        }

        // Replace URL without reloading
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [layers, pathname, router, searchParams]);


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

    // Handle Data & Layers
    useEffect(() => {
        if (!loaded || !map.current) return;

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
                    'circle-color': '#ef4444',
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
                    'text-field': ['get', 'aqi'],
                    'text-size': 12,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                },
                paint: {
                    'text-color': '#ffffff',
                }
            });
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
                    'circle-color': '#3b82f6',
                    'circle-opacity': 0.6,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#93c5fd'
                }
            });
        }

        // --- 3. CITIZEN REPORTS (Clustered) ---
        const reportsGeoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: reports.map(r => ({
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
                    'circle-color': [
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
                    'circle-color': '#eab308',
                    'circle-opacity': 0.8,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fde047'
                }
            });
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
            map.current.on('mouseenter', layerId, (e: any) => { // Type as any for quick fix, or maplibregl.MapLayerMouseEvent
                if (!map.current) return;
                map.current.getCanvas().style.cursor = 'pointer';

                // Ensure we have features
                if (!e.features || e.features.length === 0) return;

                const coordinates = (e.features[0].geometry as any).coordinates.slice();
                const props = e.features[0].properties;

                let html = '';
                if (layerId === 'cpcb-layer') {
                    html = `<div class="p-2 text-slate-900">
                    <h3 class="font-bold">${props.name}</h3>
                    <p>AQI: <span class="font-bold ${props.aqi > 300 ? 'text-red-600' : 'text-orange-500'}">${props.aqi}</span></p>
                    <p class="text-xs text-gray-500">Source: ${props.source}</p>
                </div>`;
                } else if (layerId === 'sensors-layer') {
                    html = `<div class="p-2 text-slate-900">
                    <h3 class="font-bold text-sm">Citizen Sensor</h3>
                    <p>PM2.5: ${props.pm25}</p>
                    <p class="text-xs text-gray-500">Conf: ${props.confidence}</p>
                </div>`;
                } else if (layerId === 'reports-unclustered') {
                    html = `<div class="p-2 text-slate-900">
                    <h3 class="font-bold text-sm">${props.type.replace('_', ' ')}</h3>
                    <p>Severity: ${props.severity}/5</p>
                </div>`;
                } else if (layerId === 'reports-clusters') {
                    html = `<div class="p-2 text-slate-900">
                    <p class="font-bold text-sm">Cluster</p>
                    <p>${props.point_count} Reports</p>
                </div>`;
                }

                // Correction for zoomed out clusters
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                popup.setLngLat(coordinates).setHTML(html).addTo(map.current);
            });

            map.current.on('mouseleave', layerId, () => {
                if (!map.current) return;
                map.current.getCanvas().style.cursor = '';
                popup.remove();
            });
        }

        installPointer('cpcb-layer');
        installPointer('sensors-layer');
        installPointer('reports-unclustered');
        installPointer('reports-clusters');

    }, [loaded, stations, sensors, reports, layers]);

    const toggleLayer = useCallback((id: string) => {
        setLayers(current => current.map(l => l.id === id ? { ...l, active: !l.active } : l));
    }, []);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="absolute inset-0 z-0" />

            {/* Controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl w-64">
                <h2 className="text-white font-bold text-lg mb-2">Delhi Pollution Map</h2>

                <div className="space-y-2">
                    {layers.map(layer => (
                        <button
                            key={layer.id}
                            onClick={() => toggleLayer(layer.id)}
                            className={clsx(
                                "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all border",
                                layer.active ? "bg-white/10 border-white/30" : "bg-transparent border-transparent hover:bg-white/5 opacity-60"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {layer.id === 'cpcb' && <ShieldAlert className="w-4 h-4" style={{ color: layer.color }} />}
                                {layer.id === 'sensors' && <Wifi className="w-4 h-4" style={{ color: layer.color }} />}
                                {layer.id === 'reports' && <Users className="w-4 h-4" style={{ color: layer.color }} />}
                                <span className="text-white">{layer.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
