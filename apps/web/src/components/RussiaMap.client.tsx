'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import {
  LocationsCatalogMap,
  type LocationsCatalogMapPin,
} from '@/components/LocationsCatalogMap.client';
import { MOSCOW_MAP_CENTER, resolveCityMapCoords } from '@/lib/city-map-coords';
import { pluralEvents } from '@/lib/format';
import { cityHref, citySlug } from '@/lib/routes';

type RussiaMapProps = {
  className?: string;
  destinations?: PublicDestinationDto[];
  /**
   * Mobile /cities: keep a closer zoom so pins stay readable (full Russia
   * fitBounds otherwise zooms out to a blank continent).
   */
  closerZoom?: boolean;
};

/**
 * OSM multi-pin map for `/cities` (Leaflet + OpenStreetMap, same stack as `/locations`).
 * Pins = all live city destinations with known centers.
 */
export function RussiaMap({
  className = '',
  destinations = [],
  closerZoom = false,
}: RussiaMapProps) {
  const router = useRouter();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const pins: LocationsCatalogMapPin[] = useMemo(() => {
    const byId = new Map<string, LocationsCatalogMapPin>();

    for (const item of destinations) {
      if (item.type !== 'city') continue;
      const coords = resolveCityMapCoords(item);
      if (!coords) continue;

      const id = citySlug(item);
      if (!id || byId.has(id)) continue;

      const events = Number(item.events) || 0;
      byId.set(id, {
        id,
        title: item.name,
        href: cityHref(item),
        latitude: coords.latitude,
        longitude: coords.longitude,
        typeLabel: events > 0 ? pluralEvents(events) : 'Скоро события',
      });
    }

    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [destinations]);

  const useCloser = closerZoom || isNarrow;

  return (
    <div
      className={`flex h-full min-h-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
      role="navigation"
      aria-label="Карта городов"
      data-cities-map-pins={pins.length}
      data-cities-map-closer={useCloser ? '1' : undefined}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">По России</p>
        <span className="text-[11px] text-slate-400">
          {pins.length ? `${pins.length} городов · OpenStreetMap` : 'OpenStreetMap'}
        </span>
      </div>
      <div
        className={`relative flex-1 ${
          useCloser ? 'min-h-[min(70vh,28rem)] sm:min-h-[22rem]' : 'min-h-[11rem] sm:min-h-[12.5rem]'
        }`}
      >
        {pins.length ? (
          <LocationsCatalogMap
            pins={pins}
            onPinClick={(id) => {
              router.push(`/cities/${id}`);
            }}
            layoutKey={`cities-russia-osm-${pins.length}-${useCloser ? 'close' : 'wide'}`}
            defaultCenter={MOSCOW_MAP_CENTER}
            defaultZoom={useCloser ? 5.5 : 5}
            fitPadding={useCloser ? [20, 20] : [36, 36]}
            fitMaxZoom={14}
            fitMinZoom={useCloser ? 5.2 : 3.8}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full min-h-[11rem] items-center justify-center px-4 text-center text-sm text-slate-400">
            Карта городов появится после загрузки каталога
          </div>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <span className="text-xs text-slate-500">Нажмите точку на карте</span>
      </div>
    </div>
  );
}
