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

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const listCache = new Map<string, CachedPayload<PublicVenuesDto>>();
const pageCache = new Map<string, CachedPayload<PublicVenuePageDto | null>>();
let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export function clearPublicVenueDtoCache(): void {
  listCache.clear();
  pageCache.clear();
}

export async function buildPublicVenuesDto(
  searchParams: URLSearchParams = new URLSearchParams(),
  forceRefresh = false,
): Promise<PublicVenuesDto> {
  const cacheKey = searchParams.toString() || '__default__';
  const cached = listCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) listCache.delete(cacheKey);

  const payload = (await buildPublicVenuesCatalog(getLegacyDb(), searchParams)) as PublicVenuesDto;
  listCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_VENUE_CACHE_MS, payload });
  return payload;
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
