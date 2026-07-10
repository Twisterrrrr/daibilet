import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../../packages/db/src/client.ts';
import { buildPublicVenuePage } from './dto.js';
import { createDb } from './db.js';
import { getPublicCatalogSessions } from './public-catalog.dto.js';
import type {
  PublicSessionDto,
  PublicVenueDto,
  PublicVenuePageDto,
  PublicVenuesDto,
} from './types/public.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const PUBLIC_VENUE_CACHE_MS = 5 * 60 * 1000;

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const pageCache = new Map<string, CachedPayload<PublicVenuePageDto | null>>();
let venuesCache: CachedPayload<PublicVenuesDto> | null = null;
let venuesBuild: Promise<PublicVenuesDto> | null = null;
let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

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

  const payload = (await buildPublicVenuePage(getLegacyDb(), venueSlugOrId)) as PublicVenuePageDto | null;
  const normalized = payload ? withTypedVenueSeoFallbacks(payload) : null;
  pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_VENUE_CACHE_MS, payload: normalized });
  return normalized;
}

function withTypedVenueSeoFallbacks(payload: PublicVenuePageDto): PublicVenuePageDto {
  const venue = payload.venue;
  const cityLabel = venue.city && venue.city !== 'Не указан' ? ` в городе ${venue.city}` : '';
  return {
    ...payload,
    venue: {
      ...venue,
      seoH1: venue.seoH1 || venue.title,
      seoTitle: venue.seoTitle || `${venue.title}: события и билеты | Дайбилет`,
      seoDescription: venue.seoDescription ||
        `${venue.title}${cityLabel}: афиша событий, ближайшие даты, цены и билеты.`,
      canonicalPath: venue.canonicalPath || `/venues/${venue.slug}`,
    },
  };
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

