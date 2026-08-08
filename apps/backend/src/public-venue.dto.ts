import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicVenuePage, buildPublicVenuesCatalog } from './public-venue-read.js';
import { createDb } from './db.js';
import type {
  PublicVenueDto,
  PublicVenuePageDto,
  PublicVenuesDto,
} from './types/public.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const PUBLIC_VENUE_CACHE_MS = 5 * 60 * 1000;
/** Soft TTL: serve expired list while single-flight rebuild runs. */
const PUBLIC_VENUE_LIST_STALE_MS = Number(process.env.PUBLIC_VENUE_LIST_STALE_MS || 30 * 60 * 1000);

interface CachedPayload<T> {
  expiresAt: number;
  staleUntil: number;
  payload: T;
}

const listCache = new Map<string, CachedPayload<PublicVenuesDto>>();
const pageCache = new Map<string, CachedPayload<PublicVenuePageDto | null>>();
const listBuilds = new Map<string, Promise<PublicVenuesDto>>();
let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export function clearPublicVenueDtoCache(): void {
  // Soft-invalidate list entries so request path can keep serving SWR.
  const now = Date.now();
  for (const [key, cached] of listCache) {
    listCache.set(key, {
      ...cached,
      expiresAt: 0,
      staleUntil: Math.max(cached.staleUntil || 0, now + PUBLIC_VENUE_LIST_STALE_MS),
    });
  }
  pageCache.clear();
}

function scheduleVenuesListRebuild(
  cacheKey: string,
  searchParams: URLSearchParams,
): Promise<PublicVenuesDto> {
  const inflight = listBuilds.get(cacheKey);
  if (inflight) return inflight;

  const build = (async () => {
    const payload = (await buildPublicVenuesCatalog(getLegacyDb(), searchParams)) as PublicVenuesDto;
    const builtAt = Date.now();
    listCache.set(cacheKey, {
      expiresAt: builtAt + PUBLIC_VENUE_CACHE_MS,
      staleUntil: builtAt + PUBLIC_VENUE_LIST_STALE_MS,
      payload,
    });
    return payload;
  })().finally(() => {
    if (listBuilds.get(cacheKey) === build) listBuilds.delete(cacheKey);
  });

  listBuilds.set(cacheKey, build);
  return build;
}

export async function buildPublicVenuesDto(
  searchParams: URLSearchParams = new URLSearchParams(),
  forceRefresh = false,
): Promise<PublicVenuesDto> {
  const cacheKey = searchParams.toString() || '__default__';
  const now = Date.now();
  const cached = listCache.get(cacheKey);

  if (!forceRefresh && cached && cached.expiresAt > now) return cached.payload;

  if (forceRefresh) {
    listCache.delete(cacheKey);
    return scheduleVenuesListRebuild(cacheKey, searchParams);
  }

  // Forever soft-SWR: any previous payload beats cold hub rebuild on /locations|/venues.
  if (cached?.payload) {
    void scheduleVenuesListRebuild(cacheKey, searchParams);
    return cached.payload;
  }

  return scheduleVenuesListRebuild(cacheKey, searchParams);
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
  const builtAt = Date.now();
  pageCache.set(cacheKey, {
    expiresAt: builtAt + PUBLIC_VENUE_CACHE_MS,
    staleUntil: builtAt + PUBLIC_VENUE_LIST_STALE_MS,
    payload: normalized,
  });
  return normalized;
}

function withTypedVenueSeoFallbacks(payload: PublicVenuePageDto): PublicVenuePageDto {
  const venue = payload.venue;
  const cityLabel = venue.city && venue.city !== 'Не указан' ? ` в городе ${venue.city}` : '';
  return {
    ...payload,
    venue: {
      ...venue,
      seoH1: venue.seoH1 ?? venue.title ?? venue.name,
      seoTitle: venue.seoTitle ?? `${venue.title || venue.name}: события и билеты | Дайбилет`,
      seoDescription: venue.seoDescription ??
        `${venue.title || venue.name}${cityLabel}: афиша событий, ближайшие даты, цены и билеты.`,
      canonicalPath: venue.canonicalPath ?? `/venues/${venue.slug}`,
    },
  };
}

function venueCatalogCore(venue: PublicVenueDto) {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    city: venue.city,
    type: venue.type,
    heroImageUrl: venue.heroImageUrl,
    events: venue.events,
    shortDescription: venue.shortDescription,
  };
}

export { venueCatalogCore };
