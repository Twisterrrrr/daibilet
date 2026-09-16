import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPublicLandingPage,
  buildPublicLandingPageManaged,
  buildPublicLandingsCatalog,
} from './dto.js';
import { createDb } from './db.js';
import type { PublicLandingPageDto } from './types/public.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PUBLIC_LANDING_CACHE_MS = 5 * 60 * 1000;

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const pageCache = new Map<string, CachedPayload<PublicLandingPageDto | null>>();
const catalogCache = new Map<string, CachedPayload<Awaited<ReturnType<typeof buildPublicLandingsCatalog>>>>();

let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

function normalizeLandingCityKey(cityFilter?: string | null): string {
  return String(cityFilter || '')
    .trim()
    .toLowerCase();
}

function landingPageCacheKey(landingSlug: string, cityFilter?: string | null): string {
  const slug = String(landingSlug || '')
    .trim()
    .toLowerCase();
  const city = normalizeLandingCityKey(cityFilter);
  return city && city !== 'all' ? `${slug}::${city}` : slug;
}

export function clearPublicLandingDtoCache(): void {
  pageCache.clear();
  catalogCache.clear();
}

export async function buildPublicLandingPageDto(
  landingSlug: string,
  forceRefresh = false,
  cityFilter?: string | null,
): Promise<PublicLandingPageDto | null> {
  const cacheKey = landingPageCacheKey(landingSlug, cityFilter);
  const cached = pageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) pageCache.delete(cacheKey);

  const city = normalizeLandingCityKey(cityFilter);
  const cityArg = city && city !== 'all' ? city : '';
  const db = getLegacyDb();
  const managed = await buildPublicLandingPageManaged(db, landingSlug, cityArg);
  const payload = managed?.sessions?.length
    ? (managed as PublicLandingPageDto)
    : ((await buildPublicLandingPage(db, landingSlug, cityArg)) as PublicLandingPageDto | null);

  pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_LANDING_CACHE_MS, payload });
  return payload;
}

export async function buildPublicLandingsCatalogDto(
  searchParams: URLSearchParams = new URLSearchParams(),
  forceRefresh = false,
): Promise<Awaited<ReturnType<typeof buildPublicLandingsCatalog>>> {
  const cacheKey = searchParams.toString() || '__default__';
  const cached = catalogCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) catalogCache.delete(cacheKey);

  const payload = await buildPublicLandingsCatalog(getLegacyDb(), searchParams);
  catalogCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_LANDING_CACHE_MS, payload });
  return payload;
}
