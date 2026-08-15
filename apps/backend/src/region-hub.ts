import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PublicDestinationDto, PublicSessionDto } from './types/public.js';

/** Live region hub tier by child event count (зеркало `@daibilet/contracts/common`). */
export type RegionLiveTier = 'A' | 'B' | 'C';
export const REGION_TIER_B_MIN_EVENTS = 3;
export const REGION_TIER_A_MIN_EVENTS = 10;

export function resolveRegionLiveTier(eventCount: number): RegionLiveTier {
  const total = Number(eventCount) || 0;
  if (total >= REGION_TIER_A_MIN_EVENTS) return 'A';
  if (total >= REGION_TIER_B_MIN_EVENTS) return 'B';
  return 'C';
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const CYRILLIC_SLUG_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function publicCitySlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_SLUG_MAP[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export type RegionHubTier = 'A' | 'B' | 'C';

export type RegionCenterConfig = {
  regionName: string;
  regionSlug: string;
  centerCity: string;
  centerSlugs?: string[];
  tier?: RegionHubTier | string;
};

export type PublicRegionCenterCityDto = {
  slug: string;
  name: string;
  eventCount: number;
};

export type PublicRegionChildCityDto = {
  slug: string;
  name: string;
  eventCount: number;
};

export type PublicRegionInfoDto = {
  brief?: string | null;
  topPlaces?: Array<{
    name: string;
    desc: string;
    cityNames?: string[] | null;
    imageUrl?: string | null;
  }> | null;
  faq?: Array<{ q: string; a: string }> | null;
};

export type RegionHubEnrichment = {
  centerCity: PublicRegionCenterCityDto | null;
  childCities: PublicRegionChildCityDto[];
  regionInfo: PublicRegionInfoDto | null;
  /** Устаревший editorial hint из JSON — не управляет SEO/UI. */
  configuredTier: RegionHubTier | null;
  /** Live tier по child eventCount. */
  liveTier: RegionLiveTier;
  childEventTotal: number;
  regionInfoNeedsGeneration: boolean;
};

type CityRoutingFile = {
  cityToRegion?: Record<string, string>;
  standaloneCities?: string[];
};

type RegionHubsFile = {
  regionCenters?: RegionCenterConfig[];
};

export type PublicRegionNearbyEventDto = {
  id: string;
  slug: string;
  title: string;
  startsAt?: string | null;
  dateLabel?: string | null;
  city: string;
  venue?: string | null;
  priceFrom?: number | null;
  url: string;
};

export type PublicRegionNearbyDto = {
  regionSlug: string;
  regionName: string;
  title: string;
  subtitle: string;
  tier: RegionLiveTier;
  events: PublicRegionNearbyEventDto[];
};

type RegionStripFile = {
  defaultSubtitle?: string;
  strips?: Record<string, { title?: string; subtitle?: string }>;
};

type RegionInfoFile = Record<string, PublicRegionInfoDto>;

let cityRoutingCache: CityRoutingFile | null = null;
let regionHubsCache: RegionCenterConfig[] | null = null;
let regionInfoCache: RegionInfoFile | null = null;
let regionStripCache: RegionStripFile | null = null;

function loadCityRouting(): CityRoutingFile {
  if (cityRoutingCache) return cityRoutingCache;
  try {
    const raw = fs.readFileSync(path.join(projectRoot, 'data/geo/city-routing.ru.json'), 'utf8');
    cityRoutingCache = JSON.parse(raw) as CityRoutingFile;
  } catch {
    cityRoutingCache = {};
  }
  return cityRoutingCache;
}

function loadRegionCenters(): RegionCenterConfig[] {
  if (regionHubsCache) return regionHubsCache;
  try {
    const raw = fs.readFileSync(path.join(projectRoot, 'data/geo/region-hubs.ru.json'), 'utf8');
    const parsed = JSON.parse(raw) as RegionHubsFile;
    regionHubsCache = parsed.regionCenters || [];
  } catch {
    regionHubsCache = [];
  }
  return regionHubsCache;
}

function loadRegionInfoFile(): RegionInfoFile {
  if (regionInfoCache) return regionInfoCache;
  try {
    const raw = fs.readFileSync(path.join(projectRoot, 'data/geo/region-info.ru.json'), 'utf8');
    regionInfoCache = JSON.parse(raw) as RegionInfoFile;
  } catch {
    regionInfoCache = {};
  }
  return regionInfoCache;
}

export function clearRegionHubCaches(): void {
  cityRoutingCache = null;
  regionHubsCache = null;
  regionInfoCache = null;
  regionStripCache = null;
}

function loadRegionStripFile(): RegionStripFile {
  if (regionStripCache) return regionStripCache;
  try {
    const raw = fs.readFileSync(path.join(projectRoot, 'data/geo/region-strip.ru.json'), 'utf8');
    regionStripCache = JSON.parse(raw) as RegionStripFile;
  } catch {
    regionStripCache = {};
  }
  return regionStripCache;
}

/** Region hub config by center city (slug/name). */
export function findRegionHubByCenterCity(city: {
  name?: string | null;
  slug?: string | null;
  sourceSlug?: string | null;
}): RegionCenterConfig | null {
  const keys = [city.slug, city.sourceSlug, city.name].map(normalizeKey).filter(Boolean);
  for (const hub of loadRegionCenters()) {
    const hubKeys = new Set<string>(
      [hub.centerCity, ...(hub.centerSlugs || [])].map(normalizeKey).filter(Boolean),
    );
    if (keys.some((key) => hubKeys.has(key))) return hub;
  }
  return null;
}

const REGION_GENITIVE: Record<string, string> = {
  'пермский край': 'Пермского края',
  'московская область': 'Московской области',
  'ленинградская область': 'Ленинградской области',
  'свердловская область': 'Свердловской области',
  'тюменская область': 'Тюменской области',
  'иркутская область': 'Иркутской области',
  'ульяновская область': 'Ульяновской области',
  'кировская область': 'Кировской области',
  'оренбургская область': 'Оренбургской области',
  'брянская область': 'Брянской области',
  'псковская область': 'Псковской области',
  'республика коми': 'Республики Коми',
  'алтайский край': 'Алтайского края',
  'приморский край': 'Приморского края',
  'вологодская область': 'Вологодской области',
  'калужская область': 'Калужской области',
  'калининградская область': 'Калининградской области',
  'республика татарстан': 'Республики Татарстан',
  'краснодарский край': 'Краснодарского края',
  'самарская область': 'Самарской области',
  'нижегородская область': 'Нижегородской области',
};

function regionNameGenitive(regionName: string): string {
  const key = normalizeKey(regionName);
  const mapped = REGION_GENITIVE[key];
  if (mapped) return mapped;
  // Light fallback mirroring apps/web city-declension for «X край/область».
  const kray = regionName.match(/^(.+)\s+край$/i)?.[1]?.trim();
  if (kray) {
    if (/ий$/i.test(kray)) return `${kray.slice(0, -2)}ого края`;
    if (/ый$/i.test(kray) || /ой$/i.test(kray)) return `${kray.slice(0, -2)}ого края`;
    return `${kray} края`;
  }
  const oblast = regionName.match(/^(.+)\s+область$/i)?.[1]?.trim();
  if (oblast) {
    if (/ая$/i.test(oblast)) return `${oblast.slice(0, -2)}ой области`;
    if (/яя$/i.test(oblast)) return `${oblast.slice(0, -2)}ей области`;
    return `${oblast} области`;
  }
  return regionName;
}

function defaultStripTitle(regionName: string): string {
  return `Рядом с городом: события ${regionNameGenitive(regionName)}`;
}

/**
 * Стрип «события в области» для city hub адмцентра.
 * Только live Tier C (1–2 события): при B/A стрип отключается, чтобы не дублировать Region Hub.
 */
export function buildCityRegionNearby(input: {
  cityName: string;
  citySlug?: string | null;
  sourceSlug?: string | null;
  regionSessions: PublicSessionDto[];
  limit?: number;
}): PublicRegionNearbyDto | null {
  const hub = findRegionHubByCenterCity({
    name: input.cityName,
    slug: input.citySlug ?? null,
    sourceSlug: input.sourceSlug ?? null,
  });
  if (!hub) return null;

  const centerKey = normalizeKey(hub.centerCity);
  const regionalSessions = (input.regionSessions || []).filter((session) => {
    const city = String(session.city || '').trim();
    if (!city || city === 'Не указан') return false;
    return normalizeKey(city) !== centerKey;
  });

  const liveTier = resolveRegionLiveTier(regionalSessions.length);
  if (liveTier !== 'C' || regionalSessions.length <= 0) return null;

  const events = regionalSessions
    .slice(0, Math.max(1, input.limit || 6))
    .map((session) => {
      const slug =
        String(session.slug || session.sourceSlug || '')
          .trim()
          .replace(/^\/+/, '') || publicCitySlug(session.title) || session.id;
      return {
        id: String(session.id || slug),
        slug,
        title: String(session.title || '').trim() || 'Событие',
        startsAt: session.startsAt || null,
        dateLabel: session.dateLabel || null,
        city: String(session.city || '').trim(),
        venue: String(session.venue || '').trim() || null,
        priceFrom: Number.isFinite(session.priceFrom) ? Number(session.priceFrom) : null,
        url: `/events/${encodeURIComponent(slug)}`,
      } satisfies PublicRegionNearbyEventDto;
    })
    .filter((event) => event.title && event.city);

  if (!events.length) return null;

  const stripFile = loadRegionStripFile();
  const copy = stripFile.strips?.[hub.regionSlug] || {};
  const title = String(copy.title || '').trim() || defaultStripTitle(hub.regionName);
  const subtitle =
    String(copy.subtitle || '').trim() ||
    String(stripFile.defaultSubtitle || '').trim() ||
    'Соберитесь в небольшое путешествие: отличный повод вырваться на выходные в соседний город ради концерта или загородного фестиваля.';

  return {
    regionSlug: hub.regionSlug,
    regionName: hub.regionName,
    title,
    subtitle,
    tier: liveTier,
    events,
  };
}

function loadRegionInfo(regionSlug: string, regionName?: string | null): PublicRegionInfoDto | null {
  const file = loadRegionInfoFile();
  const bySlug = file[normalizeKey(regionSlug)];
  if (bySlug) return normalizeRegionInfo(bySlug);
  if (regionName) {
    const slugFromName = publicCitySlug(regionName);
    const byName = file[slugFromName];
    if (byName) return normalizeRegionInfo(byName);
  }
  return null;
}

function normalizeRegionInfo(raw: PublicRegionInfoDto): PublicRegionInfoDto {
  return {
    brief: raw.brief?.trim() || null,
    topPlaces: (raw.topPlaces || [])
      .map((place) => ({
        name: String(place.name || '').trim(),
        desc: String(place.desc || '').trim(),
        cityNames: (place.cityNames || []).map((name) => String(name || '').trim()).filter(Boolean),
        imageUrl: String(place.imageUrl || '').trim() || null,
      }))
      .filter((place) => place.name && place.desc),
    faq: (raw.faq || [])
      .map((item) => ({
        q: String(item.q || '').trim(),
        a: String(item.a || '').trim(),
      }))
      .filter((item) => item.q && item.a),
  };
}

function normalizeKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function findRegionCenter(
  region: { name?: string | null; slug?: string | null },
): RegionCenterConfig | null {
  const nameKey = normalizeKey(region.name);
  const slugKey = normalizeKey(region.slug);
  return (
    loadRegionCenters().find(
      (hub) => normalizeKey(hub.regionName) === nameKey || normalizeKey(hub.regionSlug) === slugKey,
    ) || null
  );
}

function reverseCitiesForRegion(regionName: string): string[] {
  const routing = loadCityRouting();
  const map = routing.cityToRegion || {};
  const standalone = new Set((routing.standaloneCities || []).map((name) => normalizeKey(name)));
  const cities: string[] = [];
  for (const [cityName, mappedRegion] of Object.entries(map)) {
    if (mappedRegion !== regionName) continue;
    // Fold into another city (Зеленоград→Москва) — не child региона.
    if (standalone.has(normalizeKey(mappedRegion))) continue;
    cities.push(cityName);
  }
  return cities;
}

function countSessionsByCityName(sessions: PublicSessionDto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions || []) {
    const name = String(session.city || '').trim();
    if (!name || name === 'Не указан') continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return counts;
}

function resolveCenterDestination(
  hub: RegionCenterConfig,
  destinations: PublicDestinationDto[],
): PublicDestinationDto | null {
  const keys = new Set<string>(
    [hub.centerCity, ...(hub.centerSlugs || [])].map(normalizeKey).filter(Boolean),
  );
  return (
    destinations.find((item) => {
      if (item.type !== 'city') return false;
      return (
        keys.has(normalizeKey(item.name)) ||
        keys.has(normalizeKey(item.slug)) ||
        keys.has(normalizeKey(item.sourceSlug))
      );
    }) || null
  );
}

/**
 * Обогащение region hub: centerCity + childCities + regionInfo (Tier A seed / AI).
 */
export function buildRegionHubEnrichment(input: {
  regionName: string;
  regionSlug: string;
  sessions: PublicSessionDto[];
  destinations: PublicDestinationDto[];
}): RegionHubEnrichment {
  const hub = findRegionCenter({ name: input.regionName, slug: input.regionSlug });
  const sessionCounts = countSessionsByCityName(input.sessions);
  const centerName = hub?.centerCity || null;
  const centerNameKey = normalizeKey(centerName);

  const childNames = new Set<string>(reverseCitiesForRegion(input.regionName));
  for (const name of sessionCounts.keys()) {
    if (normalizeKey(name) === centerNameKey) continue;
    if (normalizeKey(name) === normalizeKey(input.regionName)) continue;
    childNames.add(name);
  }

  const childCities: PublicRegionChildCityDto[] = [...childNames]
    .map((name) => ({
      name,
      slug: publicCitySlug(name) || name,
      eventCount: sessionCounts.get(name) || 0,
    }))
    .filter((city) => normalizeKey(city.name) !== centerNameKey)
    .sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name, 'ru'));

  let centerCity: PublicRegionCenterCityDto | null = null;
  if (hub) {
    const destination = resolveCenterDestination(hub, input.destinations);
    const slug =
      destination?.slug ||
      hub.centerSlugs?.[0] ||
      publicCitySlug(hub.centerCity) ||
      hub.regionSlug;
    centerCity = {
      slug,
      name: destination?.name || hub.centerCity,
      eventCount: destination?.events ?? 0,
    };
  }

  const configuredTier = hub?.tier === 'A' || hub?.tier === 'B' || hub?.tier === 'C' ? hub.tier : null;
  const childEventTotal = regionChildEventsTotal(childCities);
  const liveTier = resolveRegionLiveTier(childEventTotal);
  const rawInfo = loadRegionInfo(input.regionSlug, input.regionName);
  const regionInfo = shapeRegionInfoForTier(rawInfo, liveTier);
  const regionInfoNeedsGeneration =
    liveTier === 'A' && !(rawInfo?.topPlaces && rawInfo.topPlaces.length > 0);

  return {
    centerCity,
    childCities,
    regionInfo,
    configuredTier,
    liveTier,
    childEventTotal,
    regionInfoNeedsGeneration,
  };
}

/** Tier B/C не показывают topPlaces даже если seed/A-JSON их содержит. */
function shapeRegionInfoForTier(
  info: PublicRegionInfoDto | null,
  tier: RegionLiveTier,
): PublicRegionInfoDto | null {
  if (!info) return null;
  if (tier === 'A') return info;
  if (tier === 'B') {
    return {
      brief: info.brief || null,
      faq: info.faq?.slice(0, 1) || null,
      topPlaces: null,
    };
  }
  // Tier C: без editorial гида (UI — заглушка + мост).
  return null;
}

export function regionChildEventsTotal(childCities: PublicRegionChildCityDto[] | undefined): number {
  return (childCities || []).reduce((sum, city) => sum + (Number(city.eventCount) || 0), 0);
}
