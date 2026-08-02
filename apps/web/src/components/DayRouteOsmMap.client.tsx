'use client';

import * as React from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from 'leaflet';

export type DayRouteMapStop = {
  id: string;
  title: string;
  index: number;
  latitude: number;
  longitude: number;
};

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function numberedMarkerHtml(n: number, selected: boolean): string {
  const label = String(n);
  const bg = selected ? '#059669' : '#0f172a';
  const ring = selected ? '#a7f3d0' : '#fff';
  return (
    '<div style="width:28px;height:28px;border-radius:9999px;background:' +
    bg +
    ';color:#fff;' +
    'border:2px solid ' +
    ring +
    ';box-shadow:0 1px 4px rgba(15,23,42,.35);' +
    'display:flex;align-items:center;justify-content:center;' +
    'font:700 12px/1 system-ui,sans-serif;cursor:pointer">' +
    label +
    '</div>'
  );
}

/**
 * Planner map for /my-day: numbered OSM markers + polyline in stop order.
 * External Yandex remains for turn-by-turn navigation.
 */
export function DayRouteOsmMap({
  stops,
  className,
  selectedStopId = null,
  onStopClick,
}: {
  stops: DayRouteMapStop[];
  className?: string;
  selectedStopId?: string | null;
  onStopClick?: (stopId: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markersRef = React.useRef<LeafletMarker[]>([]);
  const lineRef = React.useRef<LeafletPolyline | null>(null);
  const onStopClickRef = React.useRef(onStopClick);
  onStopClickRef.current = onStopClick;

  const stopsKey = stops
    .map((s) => `${s.id}:${s.index}:${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`)
    .join('|');

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || stops.length === 0) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !node) return;
      const L = leaflet.default;

      let map = mapRef.current;
      if (!map) {
        map = L.map(node, {
          center: [stops[0].latitude, stops[0].longitude],
          zoom: 13,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          scrollWheelZoom: true,
          zoomControl: false,
        });
        mapRef.current = map;
        L.control
          .zoom({
            position: 'topright',
            zoomInTitle: 'Приблизить',
            zoomOutTitle: 'Отдалить',
          })
          .addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
          maxZoom: MAX_ZOOM,
        }).addTo(map);
        resizeObserver = new ResizeObserver(() => {
          map?.invalidateSize({ animate: false });
        });
        resizeObserver.observe(node);
      }

      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }

      const latLngs: [number, number][] = [];
      for (const stop of stops) {
        const latLng: [number, number] = [stop.latitude, stop.longitude];
        latLngs.push(latLng);
        const selected = Boolean(selectedStopId && selectedStopId === stop.id);
        const icon = L.divIcon({
          className: 'daibilet-day-route-marker',
          html: numberedMarkerHtml(stop.index + 1, selected),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker(latLng, {
          icon,
          title: `${stop.index + 1}. ${stop.title}`,
          keyboard: true,
        }).addTo(map);
        marker.on('click', () => {
          onStopClickRef.current?.(stop.id);
        });
        markersRef.current.push(marker);
      }

      if (latLngs.length >= 2) {
        lineRef.current = L.polyline(latLngs, {
          color: '#0f172a',
          weight: 3,
          opacity: 0.75,
          dashArray: '6 8',
        }).addTo(map);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [36, 36], maxZoom: 15 });
      }
      requestAnimationFrame(() => map?.invalidateSize({ animate: false }));
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [stopsKey, stops, selectedStopId]);

  React.useEffect(() => {
    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      lineRef.current?.remove();
      lineRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (stops.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label="Карта маршрута дня"
      data-day-route-map="leaflet"
    />
  );
}
