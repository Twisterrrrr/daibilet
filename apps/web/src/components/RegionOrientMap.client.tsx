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

function regionMarkerHtml(active: boolean): string {
  const fill = active ? '#059669' : '#10b981';
  const ring = active ? '0 0 0 3px rgba(5,150,105,0.35)' : '0 1px 3px rgba(15,23,42,0.28)';
  return `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${fill};border:2px solid #fff;box-shadow:${ring};"></span>`;
}

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
        const icon = L.divIcon({
          className: 'daibilet-region-orient-marker',
          html: regionMarkerHtml(Boolean(point.active)),
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          tooltipAnchor: [0, -10],
        });
        const marker = L.marker([point.lat, point.lng], {
          icon,
          title: point.name,
          opacity: 1,
          keyboard: true,
        });
        marker.bindTooltip(point.name, {
          direction: 'top',
          offset: [0, -8],
          opacity: 0.95,
        });
        marker.on('click', () => onSelectRef.current(point));
        marker.addTo(map);
        markers.push(marker);
        bounds.extend([point.lat, point.lng]);
      }
      markersRef.current = markers;
      if (points.length > 1) {
        map.fitBounds(bounds.pad(0.2));
      }
      requestAnimationFrame(() => map?.invalidateSize({ animate: false }));
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
