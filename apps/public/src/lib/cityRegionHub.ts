import type { PublicDestination } from '@/types';

export type CityCardRegion = {
  slug: string;
  name: string;
  eventCount: number;
};

/** Хаб-города → slug региона в каталоге (события вне города, но в области/крае). */
const HUB_CITY_TO_REGION_SLUG: Record<string, string> = {
  moskva: 'moskovskaya-oblast',
  moscow: 'moskovskaya-oblast',
  москва: 'moskovskaya-oblast',
  kazan: 'respublika-tatarstan',
  казань: 'respublika-tatarstan',
  krasnodar: 'krasnodarskiy-kray',
  краснодар: 'krasnodarskiy-kray',
  krasnoyarsk: 'krasnoyarskiy-kray',
  красноярск: 'krasnoyarskiy-kray',
};

export function resolveCityRegion(
  city: Pick<PublicDestination, 'slug' | 'sourceSlug' | 'name'>,
  destinations: PublicDestination[],
): CityCardRegion | null {
  const regionSlug = lookupRegionSlug(city);
  if (!regionSlug) return null;

  const region = destinations.find((item) => item.type === 'region' && item.slug === regionSlug);
  if (!region?.slug || !region.events) return null;

  return {
    slug: region.slug,
    name: region.name,
    eventCount: region.events,
  };
}

function lookupRegionSlug(city: Pick<PublicDestination, 'slug' | 'sourceSlug' | 'name'>) {
  for (const key of [city.slug, city.sourceSlug, city.name]) {
    const normalized = normalizeKey(key);
    if (normalized && HUB_CITY_TO_REGION_SLUG[normalized]) {
      return HUB_CITY_TO_REGION_SLUG[normalized];
    }
  }
  return null;
}

function normalizeKey(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase();
}
