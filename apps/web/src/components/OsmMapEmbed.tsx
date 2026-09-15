'use client';

import * as React from 'react';
import type { Map as LeafletMap } from 'leaflet';

import { loadDaibiletLeaflet } from '@/lib/leaflet-daibilet';

const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

const MARKER_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">' +
  '<path fill="#22c55e" stroke="#ffffff" stroke-width="2" ' +
  'd="M14 1.5C7.1 1.5 1.5 7.1 1.5 14c0 9.4 12.5 24 12.5 24S26.5 23.4 26.5 14C26.5 7.1 20.9 1.5 14 1.5z"/>' +
  '<circle cx="14" cy="14" r="5" fill="#ffffff"/>' +
  '</svg>';

/** Wait until the host has a real box - L.map(0×0) leaves a blank white pane after accordion open. */
async function waitForMapHostSize(
  node: HTMLElement,
  isCancelled: () => boolean,
): Promise<boolean> {
  for (let i = 0; i < 90; i += 1) {
    if (isCancelled()) return false;
    if (node.clientWidth >= 32 && node.clientHeight >= 32) return true;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  return node.clientWidth > 0 && node.clientHeight > 0;
}

/**
 * Interactive OSM map (Leaflet). Replaces openstreetmap.org/export/embed.html:
 * upstream MapLibre embed effectively floors zoom at fitBounds, so native "-" often no-ops.
 *
 * Wheel zoom is always off (page scroll stays primary); use +/- controls.
 * With `pageScrollFriendly`, pan/touch-zoom unlock only after click/tap so the page
 * and map columns scroll together without gesture fighting.
 */
export function OsmMapEmbed({
  lat,
  lng,
  title,
  className,
  pageScrollFriendly = false,
}: {
  lat: number;
  lng: number;
  title: string;
  className?: string;
  /** Disable drag/touch until user clicks the map; never steal wheel scroll. */
  pageScrollFriendly?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let cancelled = false;
    let map: LeafletMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let sizeTimers: number[] = [];
    let unlocked = false;

    const setLockedChrome = (locked: boolean) => {
      node.dataset.mapInteraction = locked ? 'locked' : 'active';
      node.style.touchAction = locked ? 'pan-y' : 'none';
    };

    void (async () => {
      const L = await loadDaibiletLeaflet();
      if (cancelled || !node) return;

      const ready = await waitForMapHostSize(node, () => cancelled);
      if (cancelled || !ready || !node) return;

      map = L.map(node, {
        center: [lat, lng],
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        scrollWheelZoom: false,
        zoomControl: false,
        dragging: !pageScrollFriendly,
        touchZoom: !pageScrollFriendly,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
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

      if (pageScrollFriendly) {
        setLockedChrome(true);
        const unlock = () => {
          if (unlocked || !map) return;
          unlocked = true;
          map.dragging.enable();
          map.touchZoom.enable();
          setLockedChrome(false);
          map.off('click', unlock);
          map.off('focus', unlock);
        };
        map.on('click', unlock);
        map.on('focus', unlock);
      } else {
        setLockedChrome(false);
      }

      const syncSize = () => {
        map?.invalidateSize({ animate: false });
      };
      requestAnimationFrame(() => {
        syncSize();
        requestAnimationFrame(syncSize);
      });
      sizeTimers = [50, 200, 500, 1000].map((ms) => window.setTimeout(syncSize, ms));
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(node);
    })();

    return () => {
      cancelled = true;
      for (const id of sizeTimers) window.clearTimeout(id);
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, title, pageScrollFriendly]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label={title}
      data-osm-map="leaflet"
      data-map-interaction={pageScrollFriendly ? 'locked' : 'active'}
      tabIndex={pageScrollFriendly ? 0 : undefined}
    />
  );
}
