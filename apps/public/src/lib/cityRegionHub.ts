import type { PublicDestination } from '@/types';

export type CityCardRegion = {
  slug: string;
  name: string;
  eventCount: number;
};

/** Публичный регион → областной / республиканский центр. */
const REGION_HUBS: Array<{
  regionName: string;
  regionSlug: string;
  centerCity: string;
  centerSlugs?: string[];
}> = [
  { regionName: 'Московская область', regionSlug: 'moskovskaya-oblast', centerCity: 'Москва', centerSlugs: ['moskva', 'moscow'] },
  {
    regionName: 'Ленинградская область',
    regionSlug: 'leningradskaya-oblast',
    centerCity: 'Санкт-Петербург',
    centerSlugs: ['sankt-peterburg', 'saint-petersburg', 'spb'],
  },
  { regionName: 'Краснодарский край', regionSlug: 'krasnodarskiy-kray', centerCity: 'Краснодар', centerSlugs: ['krasnodar'] },
  { regionName: 'Красноярский край', regionSlug: 'krasnoyarskiy-kray', centerCity: 'Красноярск', centerSlugs: ['krasnoyarsk'] },
  { regionName: 'Республика Татарстан', regionSlug: 'respublika-tatarstan', centerCity: 'Казань', centerSlugs: ['kazan'] },
  { regionName: 'Ульяновская область', regionSlug: 'ulyanovskaya-oblast', centerCity: 'Ульяновск', centerSlugs: ['ulyanovsk'] },
  { regionName: 'Республика Хакасия', regionSlug: 'respublika-hakasiya', centerCity: 'Абакан', centerSlugs: ['abakan'] },
  { regionName: 'Хабаровский край', regionSlug: 'habarovskiy-kray', centerCity: 'Хабаровск', centerSlugs: ['habarovsk', 'khabarovsk'] },
];

const HUB_CITY_TO_REGION_SLUG = buildHubCityToRegionSlug();
const REGION_CENTER_BY_NAME = new Map(REGION_HUBS.map((hub) => [hub.regionName, hub.centerCity]));
const REGION_CENTER_BY_SLUG = new Map(REGION_HUBS.map((hub) => [hub.regionSlug, hub.centerCity]));

function buildHubCityToRegionSlug() {
  const map: Record<string, string> = {};

  for (const hub of REGION_HUBS) {
    const keys = new Set<string>([normalizeKey(hub.centerCity), ...(hub.centerSlugs || []).map(normalizeKey)]);

    for (const key of keys) {
      if (key) map[key] = hub.regionSlug;
    }
  }

  return map;
}

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

/** Регионы без карточки областного центра в текущем списке городов. */
export function filterOrphanRegions(
  regions: PublicDestination[],
  visibleCities: PublicDestination[],
): PublicDestination[] {
  const cityNames = new Set(visibleCities.map((city) => city.name));
  return regions.filter((region) => {
    const center = getRegionCenterCityName(region);
    if (!center) return true;
    return !cityNames.has(center);
  });
}

export function getRegionCenterCityName(region: Pick<PublicDestination, 'name' | 'slug'>): string | null {
  const byName = region.name ? REGION_CENTER_BY_NAME.get(region.name) : null;
  if (byName) return byName;
  const bySlug = region.slug ? REGION_CENTER_BY_SLUG.get(region.slug) : null;
  return bySlug || null;
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
