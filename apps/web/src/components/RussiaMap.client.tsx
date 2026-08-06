'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import {
  LocationsCatalogMap,
  type LocationsCatalogMapPin,
} from '@/components/LocationsCatalogMap.client';
import { resolveCityMapCoords } from '@/lib/city-map-coords';
import { pluralEvents } from '@/lib/format';
import { cityHref, citySlug } from '@/lib/routes';

type RussiaMapProps = {
  className?: string;
  destinations?: PublicDestinationDto[];
};

/**
 * OSM multi-pin map for `/cities` hero (Leaflet + OpenStreetMap, same stack as `/locations`).
 * Pins = all live city destinations with known centers (not limited to top-8 hero tiles).
 */
export function RussiaMap({ className = '', destinations = [] }: RussiaMapProps) {
  const router = useRouter();

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

  return (
    <div
      className={`flex h-full min-h-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
      role="navigation"
      aria-label="Карта городов"
      data-cities-map-pins={pins.length}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">По России</p>
        <span className="text-[11px] text-slate-400">
          {pins.length ? `${pins.length} городов · OpenStreetMap` : 'OpenStreetMap'}
        </span>
      </div>
      <div className="relative min-h-[11rem] flex-1 sm:min-h-[12.5rem]">
        {pins.length ? (
          <LocationsCatalogMap
            pins={pins}
            onPinClick={(id) => {
              router.push(`/cities/${id}`);
            }}
            layoutKey={`cities-russia-osm-${pins.length}`}
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
