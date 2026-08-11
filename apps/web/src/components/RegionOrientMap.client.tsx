'use client';

import * as React from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

import { loadDaibiletLeaflet } from '@/lib/leaflet-daibilet';

export type RegionMapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  active?: boolean;
};

/**
 * Compact orientation map for region hub. Click marker → parent filters affiche by city.
 */
export function RegionOrientMap({
  points,
  center,
  onSelect,
  className = '',
}: {
  points: RegionMapPoint[];
  center: { lat: number; lng: number };
  onSelect: (point: RegionMapPoint) => void;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markersRef = React.useRef<Marker[]>([]);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || points.length === 0) return;

    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      const L = await loadDaibiletLeaflet();
      if (cancelled || !node) return;

      map = L.map(node, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([center.lat, center.lng], 8);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      const markers: Marker[] = [];
      for (const point of points) {
        const marker = L.marker([point.lat, point.lng], {
          title: point.name,
          opacity: point.active ? 1 : 0.85,
        });
        marker.bindTooltip(point.name, { direction: 'top', offset: [0, -12] });
        marker.on('click', () => onSelectRef.current(point));
        marker.addTo(map);
        markers.push(marker);
        bounds.extend([point.lat, point.lng]);
      }
      markersRef.current = markers;
      if (points.length > 1) {
        map.fitBounds(bounds.pad(0.2));
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [points, center.lat, center.lng]);

  if (!points.length) return null;

  return (
    <div
      ref={containerRef}
      className={`h-48 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-56 ${className}`.trim()}
      data-region-orient-map
    />
  );
}
