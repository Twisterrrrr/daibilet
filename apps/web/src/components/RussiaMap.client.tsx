'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import {
  LocationsCatalogMap,
  type LocationsCatalogMapPin,
} from '@/components/LocationsCatalogMap.client';
import { pluralEvents } from '@/lib/format';
import { normalizeCitySlug } from '@/lib/landing-routes';

type CityMapPin = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
};

/** Major destination centers - OSM pins for `/cities` overview (SEO hub slugs). */
const CITY_PINS: CityMapPin[] = [
  { slug: 'saint-petersburg', name: 'Санкт-Петербург', latitude: 59.9343, longitude: 30.3351 },
  { slug: 'moscow', name: 'Москва', latitude: 55.7558, longitude: 37.6173 },
  { slug: 'kaliningrad', name: 'Калининград', latitude: 54.7104, longitude: 20.4522 },
  { slug: 'kazan', name: 'Казань', latitude: 55.7961, longitude: 49.1064 },
  { slug: 'nizhny-novgorod', name: 'Нижний Новгород', latitude: 56.2965, longitude: 43.9361 },
  { slug: 'samara', name: 'Самара', latitude: 53.1959, longitude: 50.1002 },
  { slug: 'sochi', name: 'Сочи', latitude: 43.6028, longitude: 39.7342 },
  { slug: 'ekaterinburg', name: 'Екатеринбург', latitude: 56.8389, longitude: 60.6057 },
  { slug: 'novosibirsk', name: 'Новосибирск', latitude: 55.0084, longitude: 82.9357 },
  { slug: 'irkutsk', name: 'Иркутск', latitude: 52.2869, longitude: 104.305 },
  { slug: 'vladivostok', name: 'Владивосток', latitude: 43.1155, longitude: 131.8855 },
];

type RussiaMapProps = {
  className?: string;
  destinations?: PublicDestinationDto[];
};

/** Index keys so SEO pins (`moscow`) match API destination slugs (`moskva`). */
function destinationEventLookupKeys(item: PublicDestinationDto): string[] {
  const keys = new Set<string>();
  for (const raw of [item.slug, item.sourceSlug]) {
    const key = String(raw || '')
      .trim()
      .toLowerCase();
    if (!key) continue;
    keys.add(key);
    const canonical = normalizeCitySlug(key);
    if (canonical) keys.add(canonical);
  }
  const name = String(item.name || '')
    .trim()
    .toLowerCase();
  if (name) keys.add(`name:${name}`);
  return [...keys];
}

function eventsForPin(eventsByKey: Map<string, number>, pin: CityMapPin): number {
  const bySlug = eventsByKey.get(pin.slug);
  if (typeof bySlug === 'number') return bySlug;
  const canonical = normalizeCitySlug(pin.slug);
  if (canonical) {
    const byCanonical = eventsByKey.get(canonical);
    if (typeof byCanonical === 'number') return byCanonical;
  }
  return eventsByKey.get(`name:${pin.name.toLowerCase()}`) ?? 0;
}

/**
 * OSM multi-pin map for `/cities` hero (Leaflet + OpenStreetMap, same stack as `/locations`).
 */
export function RussiaMap({ className = '', destinations = [] }: RussiaMapProps) {
  const router = useRouter();

  const eventsByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of destinations) {
      if (item.type !== 'city') continue;
      const events = Number(item.events) || 0;
      for (const key of destinationEventLookupKeys(item)) {
        map.set(key, Math.max(map.get(key) || 0, events));
      }
    }
    return map;
  }, [destinations]);

  const pins: LocationsCatalogMapPin[] = useMemo(
    () =>
      CITY_PINS.map((pin) => {
        const events = eventsForPin(eventsByKey, pin);
        return {
          id: pin.slug,
          title: pin.name,
          href: `/cities/${pin.slug}`,
          latitude: pin.latitude,
          longitude: pin.longitude,
          typeLabel: events > 0 ? pluralEvents(events) : 'Скоро события',
        };
      }),
    [eventsByKey],
  );

  return (
    <div
      className={`flex h-full min-h-0 flex-col self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
      role="navigation"
      aria-label="Карта городов"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">По России</p>
        <span className="text-[11px] text-slate-400">OpenStreetMap</span>
      </div>
      <div className="relative min-h-[11rem] flex-1 sm:min-h-[12.5rem]">
        <LocationsCatalogMap
          pins={pins}
          onPinClick={(id) => {
            router.push(`/cities/${id}`);
          }}
          layoutKey="cities-russia-osm"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <span className="text-xs text-slate-500">Нажмите точку на карте</span>
      </div>
    </div>
  );
}
