import { LANDING_RULES } from './landing-rules.js';
import { loadCityRoutingConfig } from './city-routing-config.js';
import { listRegionCenterCityNames } from './region-hub.js';
import type { DestinationType } from './types/common.js';
import type { PublicDestinationDto, PublicSessionDto } from './types/public.js';

const PUBLIC_DESTINATION_MIN_EVENTS = 1;
/** Owner 2026-08-17: regional-town cards on /cities only if events > 5. Adm centers stay at ≥1. */
export const PUBLIC_CATALOG_THIN_MIN_EVENTS = 6;

interface CityRoutingConfig {
  standaloneCities?: string[];
  cityToRegion?: Record<string, string>;
  foreignCities?: string[];
  publicRegions?: string[];
}

interface DestinationRecord {
  id: string;
  slug: string;
  sourceSlug: string;
  name: string;
  type: DestinationType;
}

interface DestinationBucket {
  id: string;
  slug: string;
  sourceSlug: string;
  name: string;
  type: DestinationType;
  events: number;
  venueIds: Set<string>;
  categories: Map<string, number>;
  landings: Map<string, number>;
}

const cityRouting = loadCityRoutingConfig(import.meta.url) as CityRoutingConfig;
const standaloneCityNames = new Set(cityRouting.standaloneCities || []);
const cityToRegion = new Map(Object.entries(cityRouting.cityToRegion || {}));
const regionHubCenterCities = new Set(listRegionCenterCityNames());
const foreignCityNames = new Set(cityRouting.foreignCities || []);
const publicRegionNames = new Set([
  ...(cityRouting.publicRegions || []),
  ...Object.values(cityRouting.cityToRegion || {}).filter((name) => isPublicRegionName(name)),
]);

const CITY_SLUG_CANONICAL: Record<string, string> = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint-petersburg': 'sankt-peterburg',
  'sankt-peterburg': 'sankt-peterburg',
  'nizhny-novgorod': 'nizhniy-novgorod',
  'nizhniy-novgorod': 'nizhniy-novgorod',
  'veliky-novgorod': 'velikiy-novgorod',
  'velikiy-novgorod': 'velikiy-novgorod',
  rostov: 'rostov-na-donu',
  'rostov-on-don': 'rostov-na-donu',
  'rostov-na-donu': 'rostov-na-donu',
  'hanty-mansiysk': 'hanty-mansiysk',
  'khanty-mansiysk': 'hanty-mansiysk',
  novokuzneck: 'novokuzneck',
  novokuznetsk: 'novokuzneck',
};

const CITY_HUB_LANDING_SHORT: Record<string, string> = {
  'river-cruises': 'Речные',
  'bus-tours': 'Автобусные',
  'river-party': 'Вечеринки',
  'bridges-night': 'Мосты',
  'moscow-dinner-boat': 'Ужин',
  'moscow-museums': 'Музеи',
  'moscow-city-day': 'День города',
  'spb-yards': 'Дворы',
  standup: 'Стендап',
  'family-kids': 'Семьям',
  'concerts-genre': 'Концерты',
  'walking-tours': 'Пешие',
  'country-tours': 'Загород',
  exhibitions: 'Выставки',
  'active-sport': 'Активный',
  rooftops: 'Смотровые',
  planetarium: 'Планетарий',
  excursions: 'Экскурсии',
  'unusual-theatres': 'Театр',
  'new-year': 'Новый год',
  'salute-9-may': 'Салют',
};

function cityDestinationRecord(session: PublicSessionDto, cityName: string): DestinationRecord {
  const slug = publicCitySlug(cityName);
  return {
    id: session.cityId || `city_${slug}`,
    slug,
    sourceSlug: session.sourceCitySlug || slug,
    name: cityName,
    type: 'city',
  };
}

export function publicDestinationFromSession(session: PublicSessionDto): DestinationRecord {
  const cityName = cleanDisplayName(session.city);
  // Adm centers stay type=city even if the mapper already folded destination to the subject.
  if (isSubjectCapitalCity(cityName)) {
    return cityDestinationRecord(session, cityName);
  }
  const name = cleanDisplayName(session.destination) || cityName || 'Не указан';
  let type: DestinationType = session.destinationType === 'region' ? 'region' : 'city';
  if (type === 'city' && isPublicRegionName(name)) type = 'region';
  if (type === 'region' && standaloneCityNames.has(name)) type = 'city';
  const slug = publicCitySlug(name);
  return {
    id: type === 'region' ? `region_${slug}` : session.cityId || `city_${slug}`,
    slug,
    sourceSlug: type === 'region' ? slug : session.sourceCitySlug || slug,
    name,
    type,
  };
}

export function lookupDestinationCatalogSessions(
  citySlugOrId: string,
  requestedSlug: string,
  catalogSessions: PublicSessionDto[],
): PublicSessionDto[] {
  return catalogSessions.filter((session) =>
    matchesPublicDestinationPage(session, citySlugOrId, requestedSlug),
  );
}

export type SessionVenueCountFields = Pick<
  PublicSessionDto,
  'venueId' | 'venueSlug' | 'venue' | 'city'
>;

export function countDistinctSessionVenues(sessions: SessionVenueCountFields[]): number {
  const keys = new Set<string>();
  for (const session of sessions || []) {
    if (session?.venueId) {
      keys.add(`id:${session.venueId}`);
      continue;
    }
    const slug = normalizePublicVenueSlugKey(session?.venueSlug || '');
    if (slug) {
      keys.add(`slug:${slug}`);
      continue;
    }
    const name = cleanDisplayName(session?.venue);
    if (name && name !== 'Не указан') {
      keys.add(`name:${cleanDisplayName(session?.city) || ''}|${name.toLowerCase()}`);
    }
  }
  return keys.size;
}

export function buildPublicDestinationRowsFromSessions(
  sessions: PublicSessionDto[],
): PublicDestinationDto[] {
  const buckets = new Map<string, DestinationBucket>();
  const cityEventCounts = new Map<string, number>();
  for (const session of sessions) {
    const cityName = cleanDisplayName(session.city);
    if (!cityName || cityName === 'Не указан') continue;
    cityEventCounts.set(cityName, (cityEventCounts.get(cityName) || 0) + 1);
  }

  for (const session of sessions) {
    const cityName = cleanDisplayName(session.city);
    const keepSeparateCityCard =
      Boolean(cityName) &&
      (isSubjectCapitalCity(cityName) ||
        (isFoldingRegionalTown(cityName) &&
          (cityEventCounts.get(cityName) || 0) >= PUBLIC_CATALOG_THIN_MIN_EVENTS));
    const destination =
      keepSeparateCityCard && cityName
        ? cityDestinationRecord(session, cityName)
        : publicDestinationFromSession(session);
    if (!destination.name || destination.name === 'Не указан') continue;
    if (!buckets.has(destination.name)) {
      buckets.set(destination.name, {
        id: destination.id,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
        name: destination.name,
        type: destination.type,
        events: 0,
        venueIds: new Set(),
        categories: new Map(),
        landings: new Map(),
      });
    }

    const bucket = buckets.get(destination.name)!;
    bucket.events += 1;
    if (session.venueId) bucket.venueIds.add(session.venueId);
    if (session.category) bucket.categories.set(session.category, (bucket.categories.get(session.category) || 0) + 1);
    const landingSlugs = Array.isArray(session.landingSlugs) ? session.landingSlugs : [];
    for (const slug of landingSlugs) {
      if (!slug) continue;
      bucket.landings.set(slug, (bucket.landings.get(slug) || 0) + 1);
    }
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      id: bucket.id,
      slug: bucket.slug,
      sourceSlug: bucket.sourceSlug,
      name: bucket.name,
      type: bucket.type,
      events: bucket.events,
      venues: bucket.venueIds.size,
      categories: Array.from(bucket.categories.entries())
        .map(([name, events]) => ({ name, events }))
        .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru')),
      hubTags: buildCityHubTags(bucket),
    }))
    .filter(isVisibleOnCitiesCatalog)
    .filter(isAllowedPublicDestination)
    .sort(destinationSort);
}

export function isVisibleOnCitiesCatalog(destination: {
  name: string;
  type: DestinationType;
  events: number;
}): boolean {
  if (destination.events < PUBLIC_DESTINATION_MIN_EVENTS) return false;
  if (destination.type === 'city' && isFoldingRegionalTown(destination.name)) {
    return destination.events >= PUBLIC_CATALOG_THIN_MIN_EVENTS;
  }
  return true;
}

/** Адмцентр субъекта: region-hubs.centerCity или standalone без cityToRegion. */
export function isSubjectCapitalCity(name?: string | null): boolean {
  const clean = cleanDisplayName(name);
  if (!clean) return false;
  if (regionHubCenterCities.has(clean)) return true;
  return standaloneCityNames.has(clean) && !cityToRegion.has(clean);
}

/** Региональный городок: dual membership, не адмцентр. Карточка /cities только при events > 5. */
export function isFoldingRegionalTown(name?: string | null): boolean {
  const clean = cleanDisplayName(name);
  if (!clean) return false;
  if (regionHubCenterCities.has(clean)) return false;
  return standaloneCityNames.has(clean) && cityToRegion.has(clean);
}

/** Direct /cities/{slug} for standalone even with 0 catalog sessions. */
export function matchStandaloneCityBySlug(requested?: string | null): string | null {
  const requestedCanon = canonicalCitySlug(requested);
  if (!requestedCanon) return null;
  for (const name of standaloneCityNames) {
    if (canonicalCitySlug(name) === requestedCanon) return name;
  }
  return null;
}

export function buildCityHubSeoTitle(cityName: string, reference = new Date()): string {
  const name = String(cityName || '').trim() || 'Город';
  const short = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  }).format(reference);
  return `${name}: афиша, экскурсии и билеты на сегодня, ${short} | Дайбилет`;
}

export function destinationPrepositional(destination: Pick<DestinationRecord, 'slug' | 'name' | 'type'>): string {
  const bySlug: Record<string, string> = {
    'sankt-peterburg': 'в Санкт-Петербурге',
    'saint-petersburg': 'в Санкт-Петербурге',
    moscow: 'в Москве',
    moskva: 'в Москве',
    'moskovskaya-oblast': 'в Московской области',
    'leningradskaya-oblast': 'в Ленинградской области',
    'krasnodarskiy-kray': 'в Краснодарском крае',
    'krasnoyarskiy-kray': 'в Красноярском крае',
    'respublika-tatarstan': 'в Республике Татарстан',
    'respublika-hakasiya': 'в Республике Хакасии',
    'respublika-bashkortostan': 'в Республике Башкортостан',
    'respublika-kareliya': 'в Республике Карелии',
    'ulyanovskaya-oblast': 'в Ульяновской области',
    'habarovskiy-kray': 'в Хабаровском крае',
    'primorskiy-kray': 'в Приморском крае',
    'altayskiy-kray': 'в Алтайском крае',
    'samarskaya-oblast': 'в Самарской области',
    'chelyabinskaya-oblast': 'в Челябинской области',
    'kemerovskaya-oblast': 'в Кемеровской области',
    'rostovskaya-oblast': 'в Ростовской области',
    'sverdlovskaya-oblast': 'в Свердловской области',
    'nizhegorodskaya-oblast': 'в Нижегородской области',
    'orenburgskaya-oblast': 'в Оренбургской области',
    'tulskaya-oblast': 'в Тульской области',
    'vologodskaya-oblast': 'в Вологодской области',
    'stavropolskiy-kray': 'в Ставропольском крае',
    'kaliningradskaya-oblast': 'в Калининградской области',
    'kaluzhskaya-oblast': 'в Калужской области',
    'yaroslavskaya-oblast': 'в Ярославской области',
    'amurskaya-oblast': 'в Амурской области',
    'hanty-mansiyskiy-avtonomnyy-okrug': 'в Ханты-Мансийском автономном округе',
  };
  const knownForm = bySlug[destination.slug];
  if (knownForm) return knownForm;

  const name = cleanDisplayName(destination.name);
  if (!name) return 'в выбранном направлении';
  if (destination.type === 'region') return `в регионе ${name}`;
  if (name.endsWith('ы')) return `в ${name.slice(0, -1)}ах`;
  if (name.endsWith('а')) return `в ${name.slice(0, -1)}е`;
  if (name.endsWith('я')) return `в ${name.slice(0, -1)}е`;
  if (name.endsWith('ь')) return `в ${name.slice(0, -1)}и`;
  if (name.endsWith('о')) return `в ${name.slice(0, -1)}е`;
  if (/[еуюэ]$/i.test(name)) return `в ${name}`;
  const known: Record<string, string> = {
    Москва: 'в Москве',
    'Санкт-Петербург': 'в Санкт-Петербурге',
    Мурманск: 'в Мурманске',
    Орёл: 'в Орле',
    Орел: 'в Орле',
    Казань: 'в Казани',
    Сочи: 'в Сочи',
    'Нижний Новгород': 'в Нижнем Новгороде',
    'Ростов-на-Дону': 'в Ростове-на-Дону',
    'Улан-Удэ': 'в Улан-Удэ',
    Чебоксары: 'в Чебоксарах',
  };
  if (known[name]) return known[name];
  return `в ${name}е`;
}

function matchesPublicDestinationPage(
  session: PublicSessionDto,
  citySlugOrId: string,
  requestedSlug: string,
): boolean {
  const destination = publicDestinationFromSession(session);
  const requested = canonicalCitySlug(requestedSlug);
  if (destination.type === 'region') {
    return (
      destination.id === citySlugOrId ||
      canonicalCitySlug(destination.sourceSlug) === requested ||
      canonicalCitySlug(destination.slug) === requested
    );
  }

  return (
    session.cityId === citySlugOrId ||
    canonicalCitySlug(session.sourceCitySlug) === requested ||
    destination.id === citySlugOrId ||
    canonicalCitySlug(destination.sourceSlug) === requested ||
    canonicalCitySlug(destination.slug) === requested ||
    canonicalCitySlug(session.city) === requested
  );
}

function buildCityHubTags(bucket: DestinationBucket) {
  const landingTags = Array.from(bucket.landings.entries())
    .map(([slug, events]) => {
      const rule = LANDING_RULES.find((item) => item.slug === slug);
      const label = CITY_HUB_LANDING_SHORT[slug] || rule?.chips?.[0] || rule?.title || null;
      if (!label) return null;
      return { slug, label, events, kind: 'landing' as const };
    })
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    .sort((left, right) => right.events - left.events || left.label.localeCompare(right.label, 'ru'))
    .slice(0, 3);

  if (landingTags.length >= 2) return landingTags;

  const categoryTags = Array.from(bucket.categories.entries())
    .map(([name, events]) => ({
      slug: null,
      label: name,
      events,
      kind: 'category' as const,
    }))
    .sort((left, right) => right.events - left.events || left.label.localeCompare(right.label, 'ru'))
    .slice(0, 3 - landingTags.length);

  return [...landingTags, ...categoryTags].slice(0, 3);
}

function isAllowedPublicDestination(destination: Pick<DestinationRecord, 'name' | 'type'>): boolean {
  if (!destination?.name || destination.name === 'Не указан') return false;
  if (foreignCityNames.has(destination.name)) return false;
  if (destination.type === 'city') return standaloneCityNames.has(destination.name);
  if (destination.type === 'region') {
    return publicRegionNames.has(destination.name) || isPublicRegionName(destination.name);
  }
  return false;
}

function isPublicRegionName(name?: string | null): boolean {
  const clean = cleanDisplayName(name);
  if (!clean || clean === 'Не указан') return false;
  if (standaloneCityNames.has(clean)) return false;
  if (foreignCityNames.has(clean)) return false;
  return /^республика(?:\s|$)/iu.test(clean) || /(?:область|край|республика|округ)$/iu.test(clean);
}

function destinationSort(left: PublicDestinationDto, right: PublicDestinationDto): number {
  const leftGroup = destinationSortGroup(left.name, left.type);
  const rightGroup = destinationSortGroup(right.name, right.type);
  if (leftGroup !== rightGroup) return leftGroup.localeCompare(rightGroup, 'ru');
  if (left.type !== right.type) return left.type === 'city' ? -1 : 1;
  return right.events - left.events || left.name.localeCompare(right.name, 'ru');
}

function destinationSortGroup(name: string, type: DestinationType): string {
  const groups: Record<string, string> = {
    'Москва': '01-moscow',
    'Московская область': '01-moscow',
    'Санкт-Петербург': '02-spb',
    'Ленинградская область': '02-spb',
    'Казань': '03-kazan',
    'Республика Татарстан': '03-kazan',
    'Краснодар': '04-krasnodar',
    'Краснодарский край': '04-krasnodar',
    'Красноярск': '05-krasnoyarsk',
    'Красноярский край': '05-krasnoyarsk',
    'Абакан': '06-khakasia',
    'Республика Хакасия': '06-khakasia',
    'Ульяновск': '07-ulyanovsk',
    'Ульяновская область': '07-ulyanovsk',
    'Владивосток': '08-vladivostok',
    'Приморский край': '08-vladivostok',
    'Хабаровск': '09-khabarovsk',
    'Хабаровский край': '09-khabarovsk',
    'Самара': '10-samara',
    'Самарская область': '10-samara',
    'Челябинск': '11-chelyabinsk',
    'Челябинская область': '11-chelyabinsk',
    'Уфа': '12-ufa',
    'Республика Башкортостан': '12-ufa',
    'Барнаул': '13-barnaul',
    'Алтайский край': '13-barnaul',
  };
  return groups[name] || `90-${type}-${name}`;
}

function canonicalCitySlug(value?: string | null): string {
  const slug = publicCitySlug(value) || String(value || '').trim().toLowerCase();
  return CITY_SLUG_CANONICAL[slug] || slug;
}

function normalizePublicVenueSlugKey(value?: string | null): string {
  return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(publicCitySlug(value) || String(value || '')));
}

function stripOpaqueVenueIdSuffix(slug: string): string {
  return String(slug || '').replace(/-[a-f0-9]{24}$/i, '');
}

function dedupeVenueSlugSuffix(slug: string): string {
  return String(slug || '').replace(/-(\d+)-\1$/u, '-$1');
}

function publicCitySlug(value?: string | null): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => letters[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function cleanDisplayName(value?: string | null): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
