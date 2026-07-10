import { prisma } from '@daibilet/db';
import { LANDING_RULES } from './landing-rules.js';
import { getPublicCatalogSessions } from './public-catalog.dto.js';
import type {
  PublicCityPageDto,
  PublicDestinationDto,
  PublicLandingDto,
  PublicSessionDto,
  PublicVenueDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CITY_CACHE_MS = 5 * 60 * 1000;

export interface PublicDestinationsDto {
  generatedAt: string;
  destinations: PublicDestinationDto[];
}

interface DestinationIdentity {
  id: string;
  slug: string;
  sourceSlug: string;
  name: string;
  type: 'city' | 'region';
}

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const pageCache = new Map<string, CachedPayload<PublicCityPageDto | null>>();
let destinationsCache: CachedPayload<PublicDestinationsDto> | null = null;
let destinationsBuild: Promise<PublicDestinationsDto> | null = null;

export function clearPublicCityDtoCache(): void {
  pageCache.clear();
  destinationsCache = null;
  destinationsBuild = null;
}

export async function buildPublicDestinationsDto(
  forceRefresh = false,
): Promise<PublicDestinationsDto> {
  const now = Date.now();
  if (!forceRefresh && destinationsCache && destinationsCache.expiresAt > now) {
    return destinationsCache.payload;
  }
  if (!forceRefresh && destinationsBuild) return destinationsBuild;

  if (forceRefresh) clearPublicCityDtoCache();
  const build = getPublicCatalogSessions(forceRefresh).then((sessions) => {
    const payload = {
      generatedAt: new Date().toISOString(),
      destinations: destinationRows(sessions),
    };
    destinationsCache = {
      expiresAt: Date.now() + PUBLIC_CITY_CACHE_MS,
      payload,
    };
    return payload;
  });
  destinationsBuild = build;
  try {
    return await build;
  } finally {
    if (destinationsBuild === build) destinationsBuild = null;
  }
}

export async function buildPublicCityDto(
  citySlugOrId: string,
  forceRefresh = false,
): Promise<PublicCityPageDto | null> {
  const cacheKey = canonicalCitySlug(citySlugOrId) || citySlugOrId;
  const cached = pageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) pageCache.delete(cacheKey);

  const sessions = await getPublicCatalogSessions(forceRefresh);
  const requestedSlug = String(citySlugOrId || '').toLowerCase();
  const matchedSessions = sessions.filter((session) =>
    matchesPublicDestinationPage(session, citySlugOrId, requestedSlug));
  if (!matchedSessions.length) {
    pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_CITY_CACHE_MS, payload: null });
    return null;
  }

  const firstSession = matchedSessions[0];
  if (!firstSession) return null;
  const destination = destinationFromSession(firstSession);
  const pageSessions = matchedSessions.slice(0, 160);
  const [venues, cityRecord] = await Promise.all([
    publicVenuesForSessions(pageSessions, 24),
    destination.type === 'city' && firstSession.cityId
      ? prisma.city.findUnique({ where: { id: firstSession.cityId } })
      : Promise.resolve(null),
  ]);
  const categories = countBy(pageSessions.map((event) => event.category).filter(Boolean));
  const prices = pageSessions
    .map((session) => session.priceFrom)
    .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
  const entityLabel = destinationPrepositional(destination);
  const payload: PublicCityPageDto = {
    generatedAt: new Date().toISOString(),
    city: {
      id: destination.id,
      slug: destination.slug,
      sourceSlug: destination.sourceSlug,
      name: destination.name,
      title: destination.name,
      type: destination.type,
      isDestination: true,
      events: pageSessions.length,
      venues: venues.length,
      categories,
      seoH1: cityRecord?.seoH1 || destination.name,
      seoTitle: cityRecord?.seoTitle || `${destination.name}: афиша, экскурсии и билеты | Дайбилет`,
      seoDescription: cityRecord?.seoDescription ||
        `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
      canonicalPath: cityRecord?.canonicalPath || `/cities/${destination.slug}`,
    },
    sessions: pageSessions,
    venues,
    landings: buildPublicLandings(pageSessions).filter((landing) => landing.events > 0),
    stats: {
      events: pageSessions.length,
      venues: venues.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
  pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_CITY_CACHE_MS, payload });
  return payload;
}

function destinationRows(sessions: PublicSessionDto[]): PublicDestinationDto[] {
  const buckets = new Map<string, {
    identity: DestinationIdentity;
    events: number;
    venueIds: Set<string>;
    categories: Map<string, number>;
  }>();

  for (const session of sessions) {
    const identity = destinationFromSession(session);
    if (!identity.name || identity.name === 'Не указан') continue;
    const key = `${identity.type}:${identity.name}`;
    const bucket = buckets.get(key) || {
      identity,
      events: 0,
      venueIds: new Set<string>(),
      categories: new Map<string, number>(),
    };
    bucket.events += 1;
    if (session.venueId) bucket.venueIds.add(session.venueId);
    if (session.category) {
      bucket.categories.set(session.category, (bucket.categories.get(session.category) || 0) + 1);
    }
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map(({ identity, events, venueIds, categories }) => ({
      ...identity,
      events,
      venues: venueIds.size,
      categories: [...categories.entries()]
        .map(([name, categoryEvents]) => ({ name, events: categoryEvents }))
        .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru')),
    }))
    .filter((destination) => destination.events >= 2)
    .sort(destinationSort);
}

async function publicVenuesForSessions(
  sessions: PublicSessionDto[],
  limit: number,
): Promise<PublicVenueDto[]> {
  const venueIds = [...new Set(sessions.map((session) => session.venueId).filter(isDefined))];
  if (!venueIds.length) return [];

  const venues = await prisma.venue.findMany({
    where: { id: { in: venueIds } },
    include: {
      city: true,
      _count: { select: { events: true } },
    },
  });
  return venues
    .filter((venue) => venue._count.events > 0)
    .sort((left, right) => right._count.events - left._count.events || left.title.localeCompare(right.title, 'ru'))
    .slice(0, limit)
    .map((venue) => ({
      id: venue.id,
      slug: venue.slug,
      name: venue.title,
      title: venue.title,
      city: venue.city?.title || 'Не указан',
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      type: venue.kind.toLowerCase(),
      pageStatus: venue.pageStatus.toLowerCase(),
      description: venue.description,
      shortDescription: venue.shortDescription,
      heroImageUrl: venue.heroImageUrl,
      seoH1: venue.seoH1,
      seoTitle: venue.seoTitle,
      seoDescription: venue.seoDescription,
      canonicalPath: venue.canonicalPath,
      isIndexable: venue.isIndexable,
      events: venue._count.events,
      categories: {},
    }));
}

function buildPublicLandings(sessions: PublicSessionDto[]): PublicLandingDto[] {
  return LANDING_RULES.map((rule) => {
    const matched = sessions.filter((session) => session.landingSlugs.includes(rule.slug));
    const prices = matched
      .map((session) => session.priceFrom)
      .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
    return {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
      events: matched.length,
      venues: new Set(matched.map((session) => session.venue).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
    };
  });
}

function destinationFromSession(session: PublicSessionDto): DestinationIdentity {
  const name = cleanDisplayName(session.destination) || cleanDisplayName(session.city) || 'Не указан';
  const type = session.destinationType === 'region' ? 'region' : 'city';
  const slug = publicSlug(name);
  return {
    id: type === 'region' ? `region_${slug}` : session.cityId || `city_${slug}`,
    slug,
    sourceSlug: type === 'region' ? slug : session.sourceCitySlug || slug,
    name,
    type,
  };
}

function matchesPublicDestinationPage(
  session: PublicSessionDto,
  citySlugOrId: string,
  requestedSlug: string,
): boolean {
  const destination = destinationFromSession(session);
  const requested = canonicalCitySlug(requestedSlug);
  if (destination.type === 'region') {
    return destination.id === citySlugOrId ||
      canonicalCitySlug(destination.sourceSlug) === requested ||
      canonicalCitySlug(destination.slug) === requested;
  }
  return session.cityId === citySlugOrId ||
    canonicalCitySlug(session.sourceCitySlug) === requested ||
    destination.id === citySlugOrId ||
    canonicalCitySlug(destination.sourceSlug) === requested ||
    canonicalCitySlug(destination.slug) === requested ||
    canonicalCitySlug(session.city) === requested;
}

function destinationSort(left: PublicDestinationDto, right: PublicDestinationDto): number {
  const leftGroup = destinationSortGroup(left.name, left.type);
  const rightGroup = destinationSortGroup(right.name, right.type);
  if (leftGroup !== rightGroup) return leftGroup.localeCompare(rightGroup, 'ru');
  if (left.type !== right.type) return left.type === 'city' ? -1 : 1;
  return right.events - left.events || left.name.localeCompare(right.name, 'ru');
}

function destinationSortGroup(name: string, type: string): string {
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
  };
  return groups[name] || `90-${type}-${name}`;
}

function destinationPrepositional(destination: DestinationIdentity): string {
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
    'ulyanovskaya-oblast': 'в Ульяновской области',
    'habarovskiy-kray': 'в Хабаровском крае',
  };
  const knownLabel = bySlug[destination.slug];
  if (knownLabel) return knownLabel;
  const name = cleanDisplayName(destination.name);
  if (!name) return 'в выбранном направлении';
  if (name === 'Москва') return 'в Москве';
  if (name === 'Санкт-Петербург') return 'в Санкт-Петербурге';
  if (destination.type === 'region') return `в регионе ${name}`;
  if (name.endsWith('а')) return `в ${name.slice(0, -1)}е`;
  return `в городе ${name}`;
}

function canonicalCitySlug(value?: string | null): string {
  const slug = publicSlug(value) || String(value || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
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
  };
  return aliases[slug] || slug;
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function cleanDisplayName(value?: string | null): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function publicSlug(value?: string | null): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '').trim().toLowerCase().split('').map((character) => letters[character] ?? character)
    .join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
