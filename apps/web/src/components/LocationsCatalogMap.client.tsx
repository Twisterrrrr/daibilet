'use client';

import * as React from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

import { loadDaibiletLeaflet } from '@/lib/leaflet-daibilet';
import type { CityMapCoords } from '@/lib/city-map-coords';

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
  /** Leaflet fitBounds padding [x, y] in px. */
  fitPadding = [36, 36],
  /** Cap zoom-in after fitBounds. */
  fitMaxZoom = 14,
  /**
   * Floor zoom after fitBounds (e.g. Russia-wide pins on mobile: without this,
   * fitBounds zooms out so far that city dots vanish).
   */
  fitMinZoom,
  /** When set with defaultZoom, multi-pin maps open here instead of fitBounds. */
  defaultCenter,
  defaultZoom,
}: {
  pins: LocationsCatalogMapPin[];
  className?: string;
  selectedId?: string | null;
  onPinClick?: (id: string) => void;
  layoutKey?: string | number;
  fitPadding?: [number, number];
  fitMaxZoom?: number;
  fitMinZoom?: number;
  defaultCenter?: CityMapCoords | null;
  defaultZoom?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markersRef = React.useRef<LeafletMarker[]>([]);
  const onPinClickRef = React.useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const fitPaddingKey = `${fitPadding[0]}x${fitPadding[1]}`;

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
          center: defaultCenter
            ? [defaultCenter.latitude, defaultCenter.longitude]
            : [pins[0].latitude, pins[0].longitude],
          zoom: defaultCenter && typeof defaultZoom === 'number' ? defaultZoom : 12,
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
        const tooltipLabel = pin.typeLabel ? `${pin.title} · ${pin.typeLabel}` : pin.title;
        const icon = L.divIcon({
          className: 'daibilet-locations-catalog-marker',
          html: pinMarkerHtml(selected),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          tooltipAnchor: [0, -10],
        });
        const marker = L.marker(latLng, {
          icon,
          title: tooltipLabel,
          keyboard: true,
          riseOnHover: true,
        }).addTo(map);
        marker.bindTooltip(tooltipLabel, {
          direction: 'top',
          offset: [0, -8],
          opacity: 0.95,
        });
        marker.on('click', () => {
          onPinClickRef.current?.(pin.id);
        });
        markersRef.current.push(marker);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else if (defaultCenter && typeof defaultZoom === 'number') {
        map.setView([defaultCenter.latitude, defaultCenter.longitude], defaultZoom);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), {
          padding: fitPadding,
          maxZoom: fitMaxZoom,
        });
        if (typeof fitMinZoom === 'number' && map.getZoom() < fitMinZoom) {
          map.setZoom(fitMinZoom);
        }
      }
      requestAnimationFrame(() => map?.invalidateSize({ animate: false }));
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [pinsKey, pins, selectedId, fitPaddingKey, fitMaxZoom, fitMinZoom, defaultCenter, defaultZoom]);

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
