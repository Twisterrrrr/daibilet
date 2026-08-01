'use client';

import * as React from 'react';
import type { Map as LeafletMap } from 'leaflet';

const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

const MARKER_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">' +
  '<path fill="#22c55e" stroke="#ffffff" stroke-width="2" ' +
  'd="M14 1.5C7.1 1.5 1.5 7.1 1.5 14c0 9.4 12.5 24 12.5 24S26.5 23.4 26.5 14C26.5 7.1 20.9 1.5 14 1.5z"/>' +
  '<circle cx="14" cy="14" r="5" fill="#ffffff"/>' +
  '</svg>';

/**
 * Interactive OSM map (Leaflet). Replaces openstreetmap.org/export/embed.html:
 * upstream MapLibre embed effectively floors zoom at fitBounds, so native "-" often no-ops.
 */
export function OsmMapEmbed({
  lat,
  lng,
  title,
  className,
}: {
  lat: number;
  lng: number;
  title: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let cancelled = false;
    let map: LeafletMap | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !node) return;

      const L = leaflet.default;

      map = L.map(node, {
        center: [lat, lng],
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        scrollWheelZoom: false,
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

      const icon = L.divIcon({
        className: 'daibilet-osm-marker',
        html: MARKER_HTML,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
      });
      L.marker([lat, lng], { icon, title, keyboard: false }).addTo(map);

      const syncSize = () => {
        map?.invalidateSize({ animate: false });
      };
      requestAnimationFrame(syncSize);
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(node);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, title]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label={title}
      data-osm-map="leaflet"
    />
  );
}
