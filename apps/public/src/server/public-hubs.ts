import { prisma } from '@daibilet/db';
import type {
  PublicCityPageDto,
  PublicDestinationDto,
  PublicLandingDto,
  PublicLandingPageDto,
  PublicSessionDto,
  PublicVenueDto,
  PublicVenuePageDto,
  PublicVenuesDto,
} from '@daibilet/contracts';

import {
  MIN_DISPLAY_PRICE_RUB,
  cleanText,
  getNextPublicCatalogSessions,
  landingTitle,
} from './public-catalog';

const CACHE_MS = 5 * 60 * 1000;
const CITY_PAGE_LIMIT = 160;
const CITY_VENUE_LIMIT = 24;
const VENUE_PAGE_LIMIT = 120;
const LANDING_PAGE_LIMIT = 240;

type DestinationsDto = {
  generatedAt: string;
  destinations: PublicDestinationDto[];
};

type LandingRule = {
  slug: string;
  title: string;
  subtitle: string;
  chips: string[];
  type?: 'CITY' | 'MULTI_CITY';
  city?: string;
};

const LANDING_RULES: LandingRule[] = [
  {
    slug: 'river-cruises',
    title: 'Речные прогулки',
    subtitle: 'Теплоходы, катера, реки и каналы',
    chips: ['теплоход', 'катер', 'причалы'],
  },
  {
    slug: 'river-party',
    title: 'Вечеринки и дискотеки на теплоходе',
    subtitle: 'DJ, живая музыка и ночные речные круизы',
    chips: ['дискотека', 'DJ', 'вечеринка'],
  },
  {
    slug: 'bus-tours',
    title: 'Автобусные обзорные экскурсии',
    subtitle: 'Городские маршруты и обзорные программы',
    chips: ['автобус', 'обзорная', 'город'],
  },
  {
    slug: 'salute-9-may',
    title: 'Салют 9 мая',
    subtitle: 'Лучшие точки обзора и экскурсии к Дню Победы',
    chips: ['9 мая', 'салют', 'праздник'],
  },
  {
    slug: 'moscow-dinner-boat',
    title: 'Ужин на теплоходе в Москве',
    subtitle: 'Вечерние речные программы с ужином',
    chips: ['ужин', 'Москва-река', 'вечер'],
    type: 'CITY',
    city: 'Москва',
  },
];

const LANDING_SLUG_ALIASES: Record<string, string[]> = {
  'river-cruises': ['river-walks', 'river-cruise', 'river'],
  'river-party': ['party-boat', 'river-disco', 'boat-party'],
  'bus-tours': ['bus-sightseeing', 'bus'],
  'salute-9-may': ['9may', 'salute', 'may-9'],
  'moscow-dinner-boat': ['dinner-cruise', 'dinner-cruise-moscow'],
};

let destinationsCache: { expiresAt: number; payload: DestinationsDto } | null = null;
let destinationsBuild: Promise<DestinationsDto> | null = null;
const cityPageCache = new Map<string, { expiresAt: number; payload: PublicCityPageDto | null }>();

let venuesCache: { expiresAt: number; payload: PublicVenuesDto } | null = null;
let venuesBuild: Promise<PublicVenuesDto> | null = null;
const venuePageCache = new Map<string, { expiresAt: number; payload: PublicVenuePageDto | null }>();

const landingPageCache = new Map<string, { expiresAt: number; payload: PublicLandingPageDto | null }>();

export function clearNextPublicHubCaches(): void {
  destinationsCache = null;
  destinationsBuild = null;
  cityPageCache.clear();
  venuesCache = null;
  venuesBuild = null;
  venuePageCache.clear();
  landingPageCache.clear();
}

export async function buildNextPublicDestinations(forceRefresh = false): Promise<DestinationsDto> {
  if (!forceRefresh && destinationsCache && destinationsCache.expiresAt > Date.now()) return destinationsCache.payload;
  if (!forceRefresh && destinationsBuild) return destinationsBuild;
  if (forceRefresh) clearNextPublicHubCaches();

  const build = getNextPublicCatalogSessions(forceRefresh).then((sessions) => {
    const payload: DestinationsDto = {
      generatedAt: new Date().toISOString(),
      destinations: destinationRows(sessions),
    };
    destinationsCache = { expiresAt: Date.now() + CACHE_MS, payload };
    return payload;
  });

  destinationsBuild = build;
  try {
    return await build;
  } finally {
    if (destinationsBuild === build) destinationsBuild = null;
  }
}

export async function buildNextPublicCityPage(slugOrId: string, forceRefresh = false): Promise<PublicCityPageDto | null> {
  const cacheKey = canonicalCitySlug(slugOrId) || slugOrId;
  const cached = cityPageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) cityPageCache.delete(cacheKey);

  const catalogSessions = await getNextPublicCatalogSessions(forceRefresh);
  const matched = catalogSessions.filter((session) => matchesDestination(session, slugOrId));
  if (!matched.length) {
    cityPageCache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, payload: null });
    return null;
  }

  const sessions = matched.slice(0, CITY_PAGE_LIMIT);
  const destination = destinationFromSession(sessions[0]);
  const [venues, cityRecord] = await Promise.all([
    venuesForSessions(sessions, CITY_VENUE_LIMIT),
    destination.type === 'city' && sessions[0].cityId
      ? prisma.city.findUnique({
        where: { id: sessions[0].cityId },
        select: {
          id: true,
          seoH1: true,
          seoTitle: true,
          seoDescription: true,
          canonicalPath: true,
        },
      })
      : Promise.resolve(null),
  ]);
  const categories = countBy(sessions.map((session) => session.category).filter(Boolean));
  const prices = displayPrices(sessions.map((session) => session.priceFrom));
  const label = destinationPrepositional(destination);
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
      events: sessions.length,
      venues: venues.length,
      categories,
      seoH1: cityRecord?.seoH1 || destination.name,
      seoTitle: cityRecord?.seoTitle || `${destination.name}: афиша, экскурсии и билеты | Дайбилет`,
      seoDescription: cityRecord?.seoDescription ||
        `Афиша событий, экскурсий, музеев и активностей ${label}. Быстрый выбор по датам, площадкам и категориям.`,
      canonicalPath: cityRecord?.canonicalPath || `/cities/${destination.slug}`,
    },
    sessions,
    venues,
    landings: buildLandingCards(sessions).filter((landing) => landing.events > 0),
    stats: {
      events: sessions.length,
      venues: venues.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
  cityPageCache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, payload });
  return payload;
}

export async function buildNextPublicVenues(forceRefresh = false): Promise<PublicVenuesDto> {
  if (!forceRefresh && venuesCache && venuesCache.expiresAt > Date.now()) return venuesCache.payload;
  if (!forceRefresh && venuesBuild) return venuesBuild;
  if (forceRefresh) clearNextPublicHubCaches();

  const build = getNextPublicCatalogSessions(forceRefresh).then(async (sessions) => {
    const sessionsByVenue = bucketSessionsByVenue(sessions);
    const venueIds = [...sessionsByVenue.keys()];
    const venueRows = venueIds.length
      ? await prisma.venue.findMany({
        where: { id: { in: venueIds }, pageStatus: { not: 'HIDDEN' } },
        select: venueSelect,
      })
      : [];
    const venues = venueRows
      .map((venue) => mapVenue(venue, sessionsByVenue.get(venue.id) || [], { compact: true }))
      .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru'));
    const payload: PublicVenuesDto = {
      generatedAt: new Date().toISOString(),
      total: venues.length,
      venues,
    };
    venuesCache = { expiresAt: Date.now() + CACHE_MS, payload };
    return payload;
  });

  venuesBuild = build;
  try {
    return await build;
  } finally {
    if (venuesBuild === build) venuesBuild = null;
  }
}

export async function buildNextPublicVenuePage(slugOrId: string, forceRefresh = false): Promise<PublicVenuePageDto | null> {
  const cacheKey = canonicalCitySlug(slugOrId) || slugOrId;
  const cached = venuePageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) venuePageCache.delete(cacheKey);

  const requested = decodePathSegment(slugOrId);
  const venue = await prisma.venue.findFirst({
    where: { OR: [{ slug: requested }, { id: requested }] },
    select: venueSelect,
  });
  if (!venue || String(venue.pageStatus) === 'HIDDEN') {
    venuePageCache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, payload: null });
    return null;
  }

  const catalogSessions = await getNextPublicCatalogSessions(forceRefresh);
  const sessions = catalogSessions.filter((session) => session.venueId === venue.id).slice(0, VENUE_PAGE_LIMIT);
  const categories = countBy(sessions.map((session) => session.category).filter(Boolean));
  const prices = displayPrices(sessions.map((session) => session.priceFrom));
  const payload: PublicVenuePageDto = {
    generatedAt: new Date().toISOString(),
    venue: mapVenue(venue, sessions, { categories }),
    sessions,
    relatedVenues: await relatedVenues(venue, catalogSessions, 6),
    stats: {
      events: sessions.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
  venuePageCache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, payload });
  return payload;
}

export async function buildNextPublicLandingPage(slugOrAlias: string, forceRefresh = false): Promise<PublicLandingPageDto | null> {
  const canonical = canonicalLandingSlug(slugOrAlias);
  const cached = landingPageCache.get(canonical);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) landingPageCache.delete(canonical);

  const rule = resolveLandingRule(canonical);
  if (!rule) {
    landingPageCache.set(canonical, { expiresAt: Date.now() + CACHE_MS, payload: null });
    return null;
  }

  const [catalogSessions, landingRecord] = await Promise.all([
    getNextPublicCatalogSessions(forceRefresh),
    prisma.landing.findFirst({
      where: { slug: { in: landingSlugCandidates(canonical) }, isActive: true },
      select: {
        id: true,
        type: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        heroTitle: true,
        heroSubtitle: true,
        heroBadge: true,
        heroImageUrl: true,
        heroMobileImageUrl: true,
        templateType: true,
        layoutVariant: true,
        surfaceVariant: true,
        seoH1: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        isIndexable: true,
        matches: {
          select: {
            eventId: true,
            reasons: true,
          },
        },
        blocks: {
          where: { isEnabled: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            type: true,
            variant: true,
            title: true,
            subtitle: true,
            eyebrow: true,
            body: true,
            richTextJson: true,
            payload: true,
            assetUrl: true,
            mobileAssetUrl: true,
            sortOrder: true,
          },
        },
      },
    }),
  ]);

  const sessions = landingSessions(catalogSessions, rule, landingRecord?.matches || []);
  const prices = displayPrices(sessions.map((session) => session.priceFrom));
  const cities = countBy(sessions.map((session) => session.destination || session.city).filter(Boolean));
  const categories = countBy(sessions.map((session) => session.category).filter(Boolean));
  const venues = countBy(sessions.map((session) => session.venue).filter(Boolean));
  const landing = mapLanding(rule, landingRecord, sessions, prices, venues);
  const payload: PublicLandingPageDto = {
    generatedAt: new Date().toISOString(),
    landing,
    sessions,
    relatedLandings: buildLandingCards(catalogSessions)
      .filter((item) => item.slug !== canonical && item.events > 0)
      .slice(0, 6),
    blocks: landingRecord?.blocks?.length ? landingRecord.blocks.map(mapLandingBlock) : buildDefaultLandingBlocks(rule, sessions),
    stats: {
      events: sessions.length,
      sessions: sessions.length,
      cities,
      categories,
      venues,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
  landingPageCache.set(canonical, { expiresAt: Date.now() + CACHE_MS, payload });
  return payload;
}

function destinationRows(sessions: PublicSessionDto[]): PublicDestinationDto[] {
  const buckets = new Map<string, {
    identity: ReturnType<typeof destinationFromSession>;
    events: number;
    venueIds: Set<string>;
    categories: Map<string, number>;
  }>();

  for (const session of sessions) {
    const identity = destinationFromSession(session);
    if (!identity.name || identity.name === 'Не указан') continue;
    const key = `${identity.type}:${identity.slug}`;
    const bucket = buckets.get(key) || {
      identity,
      events: 0,
      venueIds: new Set<string>(),
      categories: new Map<string, number>(),
    };
    bucket.events += 1;
    if (session.venueId) bucket.venueIds.add(session.venueId);
    if (session.category) bucket.categories.set(session.category, (bucket.categories.get(session.category) || 0) + 1);
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

function destinationFromSession(session: PublicSessionDto) {
  const name = cleanName(session.destination) || cleanName(session.city) || 'Не указан';
  const type = session.destinationType === 'region' ? 'region' as const : 'city' as const;
  const slug = slugify(name) || cleanName(session.citySlug) || 'destination';
  return {
    id: type === 'region' ? `region_${slug}` : session.cityId || `city_${slug}`,
    slug,
    sourceSlug: type === 'region' ? session.citySlug || slug : session.sourceCitySlug || session.citySlug || slug,
    name,
    type,
  };
}

function matchesDestination(session: PublicSessionDto, requestedValue: string): boolean {
  const requested = canonicalCitySlug(requestedValue);
  const candidates = [
    session.cityId,
    session.citySlug,
    session.sourceCitySlug,
    session.city,
    session.destination,
    destinationFromSession(session).id,
    destinationFromSession(session).slug,
    destinationFromSession(session).sourceSlug,
  ];
  return candidates.some((candidate) => candidate && canonicalCitySlug(candidate) === requested);
}

async function venuesForSessions(sessions: PublicSessionDto[], limit: number): Promise<PublicVenueDto[]> {
  const grouped = bucketSessionsByVenue(sessions);
  const venueIds = [...grouped.keys()];
  if (!venueIds.length) return [];
  const venues = await prisma.venue.findMany({
    where: { id: { in: venueIds }, pageStatus: { not: 'HIDDEN' } },
    select: venueSelect,
  });
  return venues
    .map((venue) => mapVenue(venue, grouped.get(venue.id) || [], { compact: true }))
    .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru'))
    .slice(0, limit);
}

async function relatedVenues(
  venue: VenueRecord,
  catalogSessions: PublicSessionDto[],
  limit: number,
): Promise<PublicVenueDto[]> {
  const venueCity = venue.city?.title;
  if (!venueCity) return [];
  const grouped = bucketSessionsByVenue(catalogSessions.filter((session) => session.venueId && session.venueId !== venue.id && session.city === venueCity));
  const venueIds = [...grouped.keys()];
  if (!venueIds.length) return [];
  const rows = await prisma.venue.findMany({
    where: { id: { in: venueIds }, pageStatus: { not: 'HIDDEN' } },
    select: venueSelect,
  });
  return rows
    .map((row) => mapVenue(row, grouped.get(row.id) || [], { compact: true }))
    .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru'))
    .slice(0, limit);
}

const venueSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  shortDescription: true,
  heroImageUrl: true,
  seoH1: true,
  seoTitle: true,
  seoDescription: true,
  canonicalPath: true,
  isIndexable: true,
  address: true,
  latitude: true,
  longitude: true,
  kind: true,
  pageStatus: true,
  city: { select: { title: true } },
} as const;

type VenueRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  heroImageUrl: string | null;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  isIndexable: boolean;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  kind: unknown;
  pageStatus: unknown;
  city: { title: string } | null;
};

function mapVenue(
  venue: VenueRecord,
  sessions: PublicSessionDto[],
  options: { compact?: boolean; categories?: Record<string, number> } = {},
): PublicVenueDto {
  const categories = options.categories || countBy(sessions.map((session) => session.category).filter(Boolean));
  const base: PublicVenueDto = {
    id: venue.id,
    slug: venue.slug,
    name: venue.title,
    title: venue.title,
    city: venue.city?.title || 'Не указан',
    address: venue.address,
    latitude: venue.latitude,
    longitude: venue.longitude,
    type: String(venue.kind || 'OTHER').toLowerCase(),
    events: sessions.length,
    categories,
  };
  if (options.compact) return base;

  const cityLabel = venue.city?.title && venue.city.title !== 'Не указан' ? ` в городе ${venue.city.title}` : '';
  return {
    ...base,
    pageStatus: String(venue.pageStatus || 'NONE'),
    description: venue.description,
    shortDescription: venue.shortDescription,
    heroImageUrl: venue.heroImageUrl,
    seoH1: venue.seoH1 || venue.title,
    seoTitle: venue.seoTitle || `${venue.title}: события и билеты | Дайбилет`,
    seoDescription: venue.seoDescription || `${venue.title}${cityLabel}: афиша событий, ближайшие даты, цены и билеты.`,
    canonicalPath: venue.canonicalPath || `/venues/${venue.slug}`,
    isIndexable: venue.isIndexable,
  };
}

function buildLandingCards(sessions: PublicSessionDto[]): PublicLandingDto[] {
  const slugs = new Set<string>(LANDING_RULES.map((rule) => rule.slug));
  for (const session of sessions) {
    for (const slug of session.landingSlugs || []) {
      if (slug) slugs.add(canonicalLandingSlug(slug));
    }
  }
  return [...slugs]
    .map((slug) => {
      const rule = resolveLandingRule(slug);
      const matched = sessions.filter((session) => sessionMatchesLandingSlug(session, slug));
      const prices = displayPrices(matched.map((session) => session.priceFrom));
      return {
        slug,
        type: rule?.type || 'MULTI_CITY',
        title: rule?.title || landingTitle(slug),
        subtitle: rule?.subtitle || `Быстрая подборка: ${landingTitle(slug).toLowerCase()}.`,
        chips: rule?.chips || topValues(matched.flatMap((session) => [session.category, ...(session.subcategories || []), ...session.tags]), 3),
        events: matched.length,
        venues: new Set(matched.map((session) => session.venueId || session.venue).filter(Boolean)).size,
        priceFrom: prices.length ? Math.min(...prices) : null,
        imageUrl: matched.find((session) => session.imageUrl)?.imageUrl || null,
        strength: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
      } satisfies PublicLandingDto;
    })
    .sort((left, right) => right.events - left.events || left.title.localeCompare(right.title, 'ru'));
}

function landingSessions(
  catalogSessions: PublicSessionDto[],
  rule: LandingRule,
  matches: Array<{ eventId: string; reasons: unknown }>,
): PublicSessionDto[] {
  const manualByEventId = new Map(matches.map((item) => [item.eventId, manualStatus(item.reasons)]));
  const pinned = new Set([...manualByEventId.entries()].filter(([, status]) => status === 'PINNED').map(([eventId]) => eventId));
  const excluded = new Set([...manualByEventId.entries()].filter(([, status]) => status === 'EXCLUDED').map(([eventId]) => eventId));

  return catalogSessions
    .filter((session) => {
      const ids = sessionGroupIds(session);
      if (ids.some((id) => excluded.has(id))) return false;
      if (ids.some((id) => pinned.has(id))) return true;
      if (rule.city && session.city !== rule.city && session.destination !== rule.city) return false;
      return sessionMatchesLandingSlug(session, rule.slug);
    })
    .map((session) => ({
      ...session,
      manualLandingStatus: sessionGroupIds(session).map((id) => manualByEventId.get(id)).find(Boolean) || null,
    }))
    .slice(0, LANDING_PAGE_LIMIT);
}

function mapLanding(
  rule: LandingRule,
  landing: {
    type: unknown;
    slug: string;
    title: string;
    subtitle: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroBadge: string | null;
    heroImageUrl: string | null;
    heroMobileImageUrl: string | null;
    templateType: string | null;
    layoutVariant: string | null;
    surfaceVariant: string | null;
    seoH1: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
    isIndexable: boolean;
  } | null,
  sessions: PublicSessionDto[],
  prices: number[],
  venues: Record<string, number>,
): PublicLandingDto {
  return {
    slug: rule.slug,
    type: landing ? String(landing.type) : rule.type || 'MULTI_CITY',
    title: landing?.title || rule.title,
    subtitle: landing?.subtitle || rule.subtitle,
    chips: rule.chips,
    events: sessions.length,
    venues: Object.keys(venues).length,
    priceFrom: prices.length ? Math.min(...prices) : null,
    imageUrl: sessions.find((session) => session.imageUrl)?.imageUrl || null,
    heroTitle: landing?.heroTitle || null,
    heroSubtitle: landing?.heroSubtitle || null,
    heroBadge: landing?.heroBadge || null,
    heroImageUrl: landing?.heroImageUrl || sessions.find((session) => session.imageUrl)?.imageUrl || null,
    heroMobileImageUrl: landing?.heroMobileImageUrl || null,
    templateType: landing?.templateType || null,
    layoutVariant: landing?.layoutVariant || null,
    surfaceVariant: landing?.surfaceVariant || null,
    seoH1: landing?.seoH1 || rule.title,
    seoTitle: landing?.seoTitle || `${rule.title}: афиша, расписание и билеты | Дайбилет`,
    seoDescription: landing?.seoDescription || `${rule.subtitle}. Табличный выбор по датам, городам, площадкам и цене.`,
    canonicalPath: landing?.canonicalUrl || `/landings/${rule.slug}`,
    isIndexable: landing?.isIndexable ?? false,
    strength: sessions.length >= 20 ? 'ready' : sessions.length > 0 ? 'seed' : 'empty',
  };
}

function mapLandingBlock(block: {
  id: string;
  type: unknown;
  variant: string | null;
  title: string | null;
  subtitle: string | null;
  eyebrow: string | null;
  body: string | null;
  richTextJson: unknown;
  payload: unknown;
  assetUrl: string | null;
  mobileAssetUrl: string | null;
  sortOrder: number | null;
}) {
  return {
    id: block.id,
    type: String(block.type),
    variant: block.variant,
    title: block.title,
    subtitle: block.subtitle,
    eyebrow: block.eyebrow,
    body: block.body,
    richTextJson: block.richTextJson,
    payload: block.payload,
    assetUrl: block.assetUrl,
    mobileAssetUrl: block.mobileAssetUrl,
    sortOrder: block.sortOrder,
  };
}

function buildDefaultLandingBlocks(rule: LandingRule, sessions: PublicSessionDto[]) {
  const prices = displayPrices(sessions.map((session) => session.priceFrom));
  const minPrice = prices.length ? Math.min(...prices) : null;
  const venues = topValues(sessions.map((session) => session.venue), 3);
  const cities = topValues(sessions.map((session) => session.destination || session.city), 4);
  return [
    {
      id: `fallback-${rule.slug}-trust`,
      type: 'TRUST_BADGES',
      variant: 'compact',
      eyebrow: 'Быстрый выбор',
      title: 'Что есть в подборке',
      payload: {
        items: [
          { title: `${sessions.length} событий`, text: 'Импортировано из билетных систем и сгруппировано без дублей слотов.' },
          { title: `${new Set(sessions.map((session) => session.venueId || session.venue).filter(Boolean)).size} площадок`, text: 'Можно быстро сравнить место, дату и цену.' },
          { title: minPrice ? `от ${minPrice} ₽` : 'цены уточняются', text: 'Показываем основные цены от 100 ₽.' },
        ],
      },
      sortOrder: 10,
    },
    {
      id: `fallback-${rule.slug}-value`,
      type: 'VALUE_PROPS',
      variant: 'hub',
      title: 'Как выбрать подходящий вариант',
      subtitle: 'Сузьте дату и формат, затем сравните ближайшие сеансы в таблице.',
      payload: {
        items: [
          { title: 'По дате', text: 'Фильтры поднимают ближайшие сеансы и вечерние варианты.' },
          { title: 'По месту', text: venues.length ? `Популярные площадки: ${venues.join(', ')}.` : 'Площадки появятся после импорта.' },
          { title: 'По городу', text: cities.length ? `В подборке есть: ${cities.join(', ')}.` : 'Города появятся после импорта.' },
        ],
      },
      sortOrder: 20,
    },
    {
      id: `fallback-${rule.slug}-story`,
      type: 'STORY',
      variant: 'editorial',
      title: rule.title,
      subtitle: rule.subtitle,
      body: `Это тематическая витрина по направлению «${rule.title}». Мы показываем ближайшие даты, площадки, цены и ссылку на покупку у билетного оператора.`,
      sortOrder: 30,
    },
  ];
}

function bucketSessionsByVenue(sessions: PublicSessionDto[]): Map<string, PublicSessionDto[]> {
  const grouped = new Map<string, PublicSessionDto[]>();
  for (const session of sessions) {
    if (!session.venueId) continue;
    grouped.set(session.venueId, [...(grouped.get(session.venueId) || []), session]);
  }
  return grouped;
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const raw of values) {
    const value = cleanName(raw);
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function displayPrices(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === 'number' && value >= MIN_DISPLAY_PRICE_RUB);
}

function topValues(values: string[], limit: number): string[] {
  return Object.entries(countBy(values))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ru'))
    .slice(0, limit)
    .map(([value]) => value);
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
    Москва: '01-moscow',
    'Московская область': '01-moscow',
    'Санкт-Петербург': '02-spb',
    'Ленинградская область': '02-spb',
    Казань: '03-kazan',
    'Республика Татарстан': '03-kazan',
    Краснодар: '04-krasnodar',
    'Краснодарский край': '04-krasnodar',
  };
  return groups[name] || `90-${type}-${name}`;
}

function destinationPrepositional(destination: ReturnType<typeof destinationFromSession>): string {
  const bySlug: Record<string, string> = {
    'sankt-peterburg': 'в Санкт-Петербурге',
    'saint-petersburg': 'в Санкт-Петербурге',
    spb: 'в Санкт-Петербурге',
    moscow: 'в Москве',
    moskva: 'в Москве',
    'moskovskaya-oblast': 'в Московской области',
    'leningradskaya-oblast': 'в Ленинградской области',
  };
  const known = bySlug[destination.slug] || bySlug[canonicalCitySlug(destination.slug)];
  if (known) return known;
  if (destination.type === 'region') return `в регионе ${destination.name}`;
  return `в городе ${destination.name}`;
}

function resolveLandingRule(slug: string): LandingRule | null {
  return LANDING_RULES.find((rule) => rule.slug === slug) || null;
}

function canonicalLandingSlug(value: string): string {
  const slug = cleanName(decodePathSegment(value)).toLowerCase();
  for (const [canonical, aliases] of Object.entries(LANDING_SLUG_ALIASES)) {
    if (canonical === slug || aliases.includes(slug)) return canonical;
  }
  return slug;
}

function landingSlugCandidates(slug: string): string[] {
  return [slug, ...(LANDING_SLUG_ALIASES[slug] || [])];
}

function sessionMatchesLandingSlug(session: PublicSessionDto, slug: string): boolean {
  const candidates = new Set(landingSlugCandidates(slug));
  return (session.landingSlugs || []).some((value) => candidates.has(canonicalLandingSlug(value)));
}

function sessionGroupIds(session: PublicSessionDto): string[] {
  return [...new Set([session.id, ...(session.groupEventIds || [])].filter(Boolean))];
}

function manualStatus(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const status = (value as { manualStatus?: unknown }).manualStatus;
  return typeof status === 'string' ? status : null;
}

function canonicalCitySlug(value?: string | null): string {
  const slug = slugify(decodePathSegment(value || ''));
  const aliases: Record<string, string> = {
    moscow: 'moskva',
    moskva: 'moskva',
    spb: 'sankt-peterburg',
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

function slugify(value?: string | null): string {
  const letters: Record<string, string> = {
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
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => letters[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function cleanName(value?: string | null): string {
  return cleanText(String(value || '')).replace(/\s+/g, ' ').trim();
}

function decodePathSegment(value: string): string {
  let decoded = String(value || '');
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}
