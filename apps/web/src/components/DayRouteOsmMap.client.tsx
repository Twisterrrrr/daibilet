'use client';

import * as React from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from 'leaflet';

import { loadDaibiletLeaflet } from '@/lib/leaflet-daibilet';

export type DayRouteMapStop = {
  id: string;
  title: string;
  index: number;
  latitude: number;
  longitude: number;
};

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
/** Default bottom reserve for the focus card overlay (px). */
const DEFAULT_FOCUS_OVERLAY_RESERVE_PX = 180;

function panStopForFocusOverlay(
  map: LeafletMap,
  latitude: number,
  longitude: number,
  reserveBottomPx: number,
) {
  const size = map.getSize();
  if (size.x < 1 || size.y < 1) return;

  const point = map.latLngToContainerPoint([latitude, longitude]);
  const margin = 28;
  const targetX = size.x / 2;
  const targetY = Math.max(margin + 40, size.y - reserveBottomPx - margin);

  const deltaX =
    point.x < margin ? point.x - margin : point.x > size.x - margin ? point.x - (size.x - margin) : 0;
  const deltaY = point.y - targetY;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    map.panBy([deltaX, deltaY], { animate: true });
  }
}

function numberedMarkerHtml(n: number, selected: boolean): string {
  const label = String(n);
  const active = selected ? ' is-active' : '';
  return (
    '<div class="daibilet-day-pin' +
    active +
    '" data-day-map-pin>' +
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
  layoutKey,
  fallbackCenter = null,
  /** When set, pans the map so the stop stays above the focus-card overlay. */
  panToStopId = null,
  focusOverlayReservePx = DEFAULT_FOCUS_OVERLAY_RESERVE_PX,
}: {
  stops: DayRouteMapStop[];
  className?: string;
  selectedStopId?: string | null;
  onStopClick?: (stopId: string) => void;
  /** Bumps Leaflet invalidateSize after container height changes (mobile expand). */
  layoutKey?: string | number;
  /** Empty-route preview: city center without markers. */
  fallbackCenter?: { latitude: number; longitude: number } | null;
  panToStopId?: string | null;
  focusOverlayReservePx?: number;
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
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 220);
    return () => window.clearTimeout(id);
  }, [layoutKey]);

  const centerKey = fallbackCenter
    ? `${fallbackCenter.latitude.toFixed(5)},${fallbackCenter.longitude.toFixed(5)}`
    : '';

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (stops.length === 0 && !fallbackCenter) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const L = await loadDaibiletLeaflet();
      if (cancelled || !node) return;

      const initialCenter: [number, number] = stops[0]
        ? [stops[0].latitude, stops[0].longitude]
        : [fallbackCenter!.latitude, fallbackCenter!.longitude];

      let map = mapRef.current;
      if (!map) {
        map = L.map(node, {
          center: initialCenter,
          zoom: 13,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          scrollWheelZoom: true,
          zoomControl: false,
        });
        mapRef.current = map;
        // bottomright: MyDayMapAside keeps collapse (left) + fullscreen (top-right).
        L.control
          .zoom({
            position: 'bottomright',
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
          iconSize: [40, 40],
          iconAnchor: [20, 20],
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

      if (latLngs.length === 0 && fallbackCenter) {
        map.setView([fallbackCenter.latitude, fallbackCenter.longitude], 12);
      } else if (latLngs.length === 1) {
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
  }, [stopsKey, stops, selectedStopId, centerKey, fallbackCenter]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !panToStopId) return;
    const stop = stops.find((item) => item.id === panToStopId);
    if (!stop) return;

    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      panStopForFocusOverlay(map, stop.latitude, stop.longitude, focusOverlayReservePx);
    }, 80);
    return () => window.clearTimeout(id);
  }, [panToStopId, stopsKey, stops, focusOverlayReservePx, layoutKey]);

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

  if (stops.length === 0 && !fallbackCenter) return null;

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
