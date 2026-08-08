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
          timeoutMs: 5_000,
          notFoundAsNull: true,
        },
      );
      if (!payload?.city) throw new CityDtoMissError(key);
      return payload;
    },
    ['public-city-dto-v4-no-null', key],
    cityCacheOptions,
  );

  try {
    return await cached();
  } catch (error) {
    // unstable_cache may wrap/rehydrate the throw - match by message, not only instanceof.
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof CityDtoMissError || msg.includes('city_dto_miss:')) return null;
    throw error;
  }
}

/**
 * Prefer cached DTO; on soft miss retry uncached once.
 * Callers must noStore()+notFound() on null so Full Route Cache never stores STALE 404 (~1y SWR).
 */
export async function loadCityDtoOrNull(slug: string): Promise<PublicCityPagePayload | null> {
  const key = normalizeCitySlug(slug);
  if (!key) return null;
  const cached = await getCachedPublicCityDto(key);
  if (cached?.city) return cached;
  try {
    const fresh = await fetchPublicApiJson<PublicCityPagePayload | null>(
      `/api/public/cities/${encodeURIComponent(key)}`,
      { timeoutMs: 5_000, notFoundAsNull: true },
    );
    return fresh?.city ? fresh : null;
  } catch {
    return null;
  }
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
