import { unstable_cache } from 'next/cache';

import '@/lib/env';
import type { PublicCityPageDto } from '@daibilet/contracts/public';
import type { BlogCardDto } from '@/lib/blog-utils';
import { CITY_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { CITY_PAGE_CACHE_TAG };

const cityCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [CITY_PAGE_CACHE_TAG] as string[],
};

type PublicCityPagePayload = PublicCityPageDto & {
  city: PublicCityPageDto['city'] & {
    heroImageUrl?: string | null;
    isIndexable?: boolean | null;
  };
};

export type CityDtoLoad =
  | { kind: 'ok'; payload: PublicCityPagePayload }
  | { kind: 'miss' }
  | { kind: 'unavailable' };

type PublicArticlesListPayload = {
  generatedAt?: string;
  articles?: BlogCardDto[];
  items?: BlogCardDto[];
  [key: string]: unknown;
};

function normalizeCitySlug(slug: string): string {
  try {
    return decodeURIComponent(String(slug || '').trim()).toLowerCase();
  } catch {
    return String(slug || '').trim().toLowerCase();
  }
}

class CityDtoMissError extends Error {
  constructor(slug: string) {
    super(`city_dto_miss:${slug}`);
    this.name = 'CityDtoMissError';
  }
}

/**
 * Shared cached city DTO for generateMetadata + page (avoids double cold build).
 * Next Data Cache is required for ISR HIT on `/cities/[slug]` (Prisma alone stays dynamic).
 *
 * Soft-misses (API 404 / empty) must NOT be cached: a cached `null` poisons HTML as persistent
 * Next/nginx STALE 404 even after the city DTO is healthy again. Throw inside the cache fn so
 * Next does not store the miss; re-fetch on the next request. Same pattern as venues (v4).
 */
export async function getCachedPublicCityDto(slug: string) {
  const key = normalizeCitySlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    async () => {
      const payload = await fetchPublicApiJson<PublicCityPagePayload | null>(
        `/api/public/cities/${encodeURIComponent(key)}`,
        {
          // Cold city DTO (SPB) can exceed 5s after API restart; align with venue hub.
          timeoutMs: 8_000,
          notFoundAsNull: true,
          revalidateSeconds: PUBLIC_PAGE_REVALIDATE,
        },
      );
      if (!payload?.city) throw new CityDtoMissError(key);
      return payload;
    },
    ['public-city-dto-v7-isr-fetch', key],
    cityCacheOptions,
  );

  try {
    return await cached();
  } catch (error) {
    // Soft-miss must NEVER become HTTP 500. Next unstable_cache often wraps the throw so
    // instanceof / exact message checks fail - treat any cache-fn failure as miss and let
    // loadCityDto map transient throws to unavailable (not notFound HTML poison).
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof CityDtoMissError || msg.includes('city_dto_miss:')) return null;
    // Transient errors must not become null→notFound HTML poison (same class as venues).
    console.warn(`[city-dto-cache] unavailable after cache error for ${key}:`, msg);
    throw error instanceof Error ? error : new Error(msg);
  }
}

/**
 * Prefer cached DTO. Do not uncached-fetch on miss during ISR:
 * `fetchPublicApiJson` uses `cache: 'no-store'` and outside `unstable_cache` that throws
 * DYNAMIC_SERVER_USAGE → HTTP 500 on revalidate routes.
 * True miss → safeNotFound(); transient API errors → soft unavailable UI (venues parity).
 */
export async function loadCityDto(slug: string): Promise<CityDtoLoad> {
  const key = normalizeCitySlug(slug);
  if (!key) return { kind: 'miss' };

  try {
    const cached = await getCachedPublicCityDto(key);
    if (cached?.city) return { kind: 'ok', payload: cached };
    return { kind: 'miss' };
  } catch {
    return { kind: 'unavailable' };
  }
}

/** @deprecated Use loadCityDto — null conflated miss with transient errors. */
export async function loadCityDtoOrNull(slug: string): Promise<PublicCityPagePayload | null> {
  const loaded = await loadCityDto(slug);
  return loaded.kind === 'ok' ? loaded.payload : null;
}

/** City-hub related articles; same TTL/tag as city DTO. */
export async function getCachedCityHubArticles(slug: string) {
  const key = normalizeCitySlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    () =>
      fetchPublicApiJson<PublicArticlesListPayload>('/api/public/articles', {
        searchParams: {
          citySlug: key,
          includeBroad: 1,
          limit: 40,
        },
        timeoutMs: 3_000,
      }),
    ['public-city-articles-v2-http', key],
    cityCacheOptions,
  );
  return cached();
}

/**
 * Empty at build (MSK memory-safe). dynamicParams + unstable_cache fill ISR on first hit.
 * Optional CITY_SSG_TOP_N>0 can prebuild top hubs when build host has headroom.
 */
export async function listTopCitySlugsForSsg(): Promise<string[]> {
  const raw = Number(process.env.CITY_SSG_TOP_N || 0);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 0), 80) : 0;
  if (limit <= 0) return [];

  try {
    const payload = await fetchPublicApiJson<{ destinations?: Array<{
      slug?: string | null;
      type?: string | null;
      events?: number | null;
      name: string;
    }> }>('/api/public/destinations', { timeoutMs: 3_000 });
    return (payload.destinations || [])
      .filter((item) => item.type === 'city' && item.slug && (item.events || 0) > 0)
      .sort((a, b) => (b.events || 0) - (a.events || 0) || a.name.localeCompare(b.name, 'ru'))
      .slice(0, limit)
      .map((item) => String(item.slug));
  } catch {
    return [];
  }
}
