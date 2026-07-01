import { prisma } from '../../../packages/db/src/client.ts';
import { getPublicCatalogSessions } from './public-catalog.dto.js';
import type {
  PublicSessionDto,
  PublicVenueDto,
  PublicVenuePageDto,
  PublicVenuesDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_VENUE_CACHE_MS = 5 * 60 * 1000;

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const pageCache = new Map<string, CachedPayload<PublicVenuePageDto | null>>();
let venuesCache: CachedPayload<PublicVenuesDto> | null = null;
let venuesBuild: Promise<PublicVenuesDto> | null = null;

export function clearPublicVenueDtoCache(): void {
  pageCache.clear();
  venuesCache = null;
  venuesBuild = null;
}

export async function buildPublicVenuesDto(forceRefresh = false): Promise<PublicVenuesDto> {
  if (!forceRefresh && venuesCache && venuesCache.expiresAt > Date.now()) return venuesCache.payload;
  if (!forceRefresh && venuesBuild) return venuesBuild;
  if (forceRefresh) clearPublicVenueDtoCache();

  const build = getPublicCatalogSessions(forceRefresh).then(async (sessions) => {
    const eventCounts = countSessionsByVenue(sessions);
    const venueIds = [...eventCounts.keys()];
    const venues = venueIds.length
      ? await prisma.venue.findMany({
        where: { id: { in: venueIds }, pageStatus: { not: 'HIDDEN' } },
        include: { city: true },
      })
      : [];
    const rows = venues
      .map((venue) => mapVenue(venue, eventCounts.get(venue.id) || 0, {}))
      .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru'));
    const payload = { generatedAt: new Date().toISOString(), total: rows.length, venues: rows };
    venuesCache = { expiresAt: Date.now() + PUBLIC_VENUE_CACHE_MS, payload };
    return payload;
  });
  venuesBuild = build;
  try {
    return await build;
  } finally {
    if (venuesBuild === build) venuesBuild = null;
  }
}

export async function buildPublicVenueDto(
  venueSlugOrId: string,
  forceRefresh = false,
): Promise<PublicVenuePageDto | null> {
  const cacheKey = String(venueSlugOrId || '').trim().toLowerCase();
  const cached = pageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) pageCache.delete(cacheKey);

  const venue = await prisma.venue.findFirst({
    where: { OR: [{ slug: venueSlugOrId }, { id: venueSlugOrId }] },
    include: { city: true },
  });
  if (!venue || venue.pageStatus === 'HIDDEN') {
    pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_VENUE_CACHE_MS, payload: null });
    return null;
  }

  const catalogSessions = await getPublicCatalogSessions(forceRefresh);
  const sessions = catalogSessions.filter((session) => session.venueId === venue.id).slice(0, 120);
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const prices = sessions
    .map((session) => session.priceFrom)
    .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
  const relatedVenues = await publicRelatedVenues(venue.id, venue.city?.title || null, 6);
  const payload: PublicVenuePageDto = {
    generatedAt: new Date().toISOString(),
    venue: mapVenue(venue, sessions.length, categories, false),
    sessions,
    relatedVenues,
    stats: {
      events: sessions.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
  pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_VENUE_CACHE_MS, payload });
  return payload;
}

async function publicRelatedVenues(
  venueId: string,
  city: string | null,
  limit: number,
): Promise<PublicVenueDto[]> {
  if (!city) return [];
  const venues = await prisma.venue.findMany({
    where: {
      id: { not: venueId },
      city: { title: city },
      pageStatus: { not: 'HIDDEN' },
      events: { some: {} },
    },
    include: {
      city: true,
      _count: { select: { events: true } },
    },
  });
  return venues
    .sort((left, right) => right._count.events - left._count.events || left.title.localeCompare(right.title, 'ru'))
    .slice(0, limit)
    .map((venue) => mapVenue(venue, venue._count.events, {}, true));
}

function mapVenue(
  venue: {
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
    kind: string;
    pageStatus: string;
    city: { title: string } | null;
  },
  events: number,
  categories: Record<string, number>,
  compact = false,
): PublicVenueDto {
  const base: PublicVenueDto = {
    id: venue.id,
    slug: venue.slug,
    name: venue.title,
    title: venue.title,
    city: venue.city?.title || 'Не указан',
    address: venue.address,
    latitude: venue.latitude,
    longitude: venue.longitude,
    type: venue.kind.toLowerCase(),
    events,
    categories,
  };
  if (compact) return base;
  const cityLabel = venue.city?.title && venue.city.title !== 'Не указан'
    ? ` в городе ${venue.city.title}`
    : '';
  return {
    ...base,
    pageStatus: venue.pageStatus,
    description: venue.description,
    shortDescription: venue.shortDescription,
    heroImageUrl: venue.heroImageUrl,
    seoH1: venue.seoH1 || venue.title,
    seoTitle: venue.seoTitle || `${venue.title}: события и билеты | Дайбилет`,
    seoDescription: venue.seoDescription ||
      `${venue.title}${cityLabel}: афиша событий, ближайшие даты, цены и билеты.`,
    canonicalPath: venue.canonicalPath || `/venues/${venue.slug}`,
    isIndexable: venue.isIndexable,
  };
}

function countSessionsByVenue(sessions: PublicSessionDto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (!session.venueId) continue;
    counts.set(session.venueId, (counts.get(session.venueId) || 0) + 1);
  }
  return counts;
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}
