'use client';

import * as React from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

import { loadDaibiletLeaflet } from '@/lib/leaflet-daibilet';

export type LocationsCatalogMapPin = {
  id: string;
  title: string;
  href: string;
  latitude: number;
  longitude: number;
  typeLabel?: string;
};

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function pinMarkerHtml(selected: boolean): string {
  const bg = selected ? '#2563eb' : '#0f172a';
  const ring = selected ? '#bfdbfe' : '#fff';
  return (
    '<div style="width:22px;height:22px;border-radius:9999px;background:' +
    bg +
    ';border:2px solid ' +
    ring +
    ';box-shadow:0 1px 4px rgba(15,23,42,.35);cursor:pointer"></div>'
  );
}

/**
 * Multi-pin OSM map for `/locations` catalog (Leaflet already in apps/web).
 * Click selects a pin; parent can scroll the list.
 */
export function LocationsCatalogMap({
  pins,
  className,
  selectedId = null,
  onPinClick,
  layoutKey,
}: {
  pins: LocationsCatalogMapPin[];
  className?: string;
  selectedId?: string | null;
  onPinClick?: (id: string) => void;
  layoutKey?: string | number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markersRef = React.useRef<LeafletMarker[]>([]);
  const onPinClickRef = React.useRef(onPinClick);
  onPinClickRef.current = onPinClick;

  const pinsKey = pins
    .map((p) => `${p.id}:${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`)
    .join('|');

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 220);
    return () => window.clearTimeout(id);
  }, [layoutKey]);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || pins.length === 0) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const L = await loadDaibiletLeaflet();
      if (cancelled || !node) return;

      let map = mapRef.current;
      if (!map) {
        map = L.map(node, {
          center: [pins[0].latitude, pins[0].longitude],
          zoom: 12,
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

      const latLngs: [number, number][] = [];
      for (const pin of pins) {
        const latLng: [number, number] = [pin.latitude, pin.longitude];
        latLngs.push(latLng);
        const selected = Boolean(selectedId && selectedId === pin.id);
        const icon = L.divIcon({
          className: 'daibilet-locations-catalog-marker',
          html: pinMarkerHtml(selected),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker(latLng, {
          icon,
          title: pin.typeLabel ? `${pin.title} · ${pin.typeLabel}` : pin.title,
          keyboard: true,
        }).addTo(map);
        marker.on('click', () => {
          onPinClickRef.current?.(pin.id);
        });
        markersRef.current.push(marker);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [36, 36], maxZoom: 14 });
      }
      requestAnimationFrame(() => map?.invalidateSize({ animate: false }));
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [pinsKey, pins, selectedId]);

  React.useEffect(() => {
    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (pins.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label="Карта локаций"
      data-locations-catalog-map="leaflet"
    />
  );
}
