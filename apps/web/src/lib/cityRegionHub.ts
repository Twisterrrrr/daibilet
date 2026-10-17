import type { PublicDestinationDto } from '@daibilet/contracts/public';

import regionHubsFile from '../../../../data/geo/region-hubs.ru.json';

export type CityCardRegion = {
  slug: string;
  name: string;
  eventCount: number;
};

type RegionCenterConfig = {
  regionName: string;
  regionSlug: string;
  centerCity: string;
  centerSlugs?: string[];
  tier?: string;
};

const REGION_HUBS = (regionHubsFile.regionCenters || []) as RegionCenterConfig[];

const HUB_CITY_TO_REGION_SLUG = buildHubCityToRegionSlug();
const REGION_CENTER_BY_NAME = new Map(REGION_HUBS.map((hub) => [hub.regionName, hub.centerCity]));
const REGION_CENTER_BY_SLUG = new Map(REGION_HUBS.map((hub) => [hub.regionSlug, hub.centerCity]));
const REGION_NAME_BY_SLUG = new Map(REGION_HUBS.map((hub) => [hub.regionSlug, hub.regionName]));

/** Федеральные города: крошки без сегмента области. */
const FEDERAL_VENUE_BREADCRUMB_SLUGS = new Set([
  'moscow',
  'moskva',
  'msk',
  'saint-petersburg',
  'sankt-peterburg',
  'spb',
  'petersburg',
  'peterburg',
]);

const FEDERAL_VENUE_BREADCRUMB_NAMES = new Set(['москва', 'санкт-петербург', 'петербург', 'спб']);

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

function cityMatchesRegionCenter(
  input: { city?: string | null; citySlug?: string | null },
  centerCity: string,
  centerSlugs?: string[],
): boolean {
  const centerKeys = new Set<string>([normalizeKey(centerCity), ...(centerSlugs || []).map(normalizeKey)]);
  for (const candidate of [input.citySlug, input.city]) {
    const key = normalizeKey(candidate);
    if (key && centerKeys.has(key)) return true;
  }
  return false;
}

/** Москва / СПб (и алиасы). */
export function isMajorVenueBreadcrumbCity(input: {
  city?: string | null;
  citySlug?: string | null;
  name?: string | null;
  slug?: string | null;
}): boolean {
  for (const candidate of [input.citySlug, input.slug, input.city, input.name]) {
    const key = normalizeKey(candidate);
    if (!key) continue;
    if (FEDERAL_VENUE_BREADCRUMB_SLUGS.has(key) || FEDERAL_VENUE_BREADCRUMB_NAMES.has(key)) return true;
  }
  return false;
}

/**
 * Адм. центр субъекта РФ: федеральные города + столицы из REGION_HUBS
 * (+ совпадение city с центром привязанного regionSlug/regionTitle).
 * В City нет isAdminCenter - список хабов + data-driven match по Region.
 */
export function isAdminCenterVenueBreadcrumbCity(input: {
  city?: string | null;
  citySlug?: string | null;
  name?: string | null;
  slug?: string | null;
  regionSlug?: string | null;
  regionTitle?: string | null;
}): boolean {
  if (isMajorVenueBreadcrumbCity(input)) return true;

  for (const candidate of [input.citySlug, input.slug, input.city, input.name]) {
    const key = normalizeKey(candidate);
    if (key && HUB_CITY_TO_REGION_SLUG[key]) return true;
  }

  const regionSlug = String(input.regionSlug || '')
    .trim()
    .toLowerCase();
  const regionTitle = String(input.regionTitle || '').trim();
  if (regionSlug || regionTitle) {
    const hub =
      REGION_HUBS.find((item) => item.regionSlug === regionSlug) ||
      REGION_HUBS.find((item) => item.regionName === regionTitle) ||
      null;
    if (hub && cityMatchesRegionCenter(input, hub.centerCity, hub.centerSlugs)) return true;
  }

  return false;
}

/**
 * Регион для venue-крошек только у не-адм. центров.
 * Только City.region из API (`regionSlug` / `regionTitle`).
 * Адм. центры (включая Тулу и др.) - без сегмента области.
 */
export function resolveVenueBreadcrumbRegion(input: {
  city?: string | null;
  citySlug?: string | null;
  regionSlug?: string | null;
  regionTitle?: string | null;
}): { slug: string; name: string } | null {
  if (isAdminCenterVenueBreadcrumbCity(input)) return null;

  const apiSlug = String(input.regionSlug || '')
    .trim()
    .toLowerCase();
  if (!apiSlug) return null;

  const name =
    String(input.regionTitle || '').trim() || REGION_NAME_BY_SLUG.get(apiSlug) || apiSlug;
  return { slug: apiSlug, name };
}

export function resolveCityRegion(
  city: Pick<PublicDestinationDto, 'slug' | 'sourceSlug' | 'name'>,
  destinations: PublicDestinationDto[],
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
  regions: PublicDestinationDto[],
  visibleCities: PublicDestinationDto[],
): PublicDestinationDto[] {
  const cityNames = new Set(visibleCities.map((city) => city.name));
  return regions.filter((region) => {
    const center = getRegionCenterCityName(region);
    if (!center) return true;
    return !cityNames.has(center);
  });
}

export function getRegionCenterCityName(region: Pick<PublicDestinationDto, 'name' | 'slug'>): string | null {
  const byName = region.name ? REGION_CENTER_BY_NAME.get(region.name) : null;
  if (byName) return byName;
  const bySlug = region.slug ? REGION_CENTER_BY_SLUG.get(region.slug) : null;
  return bySlug || null;
}

export function getRegionHubConfig(
  region: Pick<PublicDestinationDto, 'name' | 'slug'>,
): RegionCenterConfig | null {
  const nameKey = normalizeKey(region.name);
  const slugKey = normalizeKey(region.slug);
  return (
    REGION_HUBS.find(
      (hub) => normalizeKey(hub.regionName) === nameKey || normalizeKey(hub.regionSlug) === slugKey,
    ) || null
  );
}

function lookupRegionSlug(city: Pick<PublicDestinationDto, 'slug' | 'sourceSlug' | 'name'>) {
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
