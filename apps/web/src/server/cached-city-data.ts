import { unstable_cache } from 'next/cache';

import '@/lib/env';
import {
  buildPublicArticlesListDto,
  buildPublicCityDto,
} from '@daibilet/backend/public-read';
import { CITY_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';

export { CITY_PAGE_CACHE_TAG };

const cityCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [CITY_PAGE_CACHE_TAG] as string[],
};

function normalizeCitySlug(slug: string): string {
  try {
    return decodeURIComponent(String(slug || '').trim()).toLowerCase();
  } catch {
    return String(slug || '').trim().toLowerCase();
  }
}

/**
 * Shared cached city DTO for generateMetadata + page (avoids double cold build).
 * Next Data Cache is required for ISR HIT on `/cities/[slug]` (Prisma alone stays dynamic).
 */
export async function getCachedPublicCityDto(slug: string) {
  const key = normalizeCitySlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    () => buildPublicCityDto(key),
    ['public-city-dto-v1', key],
    cityCacheOptions,
  );
  return cached();
}

/** City-hub related articles; same TTL/tag as city DTO. */
export async function getCachedCityHubArticles(slug: string) {
  const key = normalizeCitySlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    () =>
      buildPublicArticlesListDto({
        citySlug: key,
        includeBroad: true,
        limit: 40,
      }),
    ['public-city-articles-v1', key],
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
    const { buildPublicDestinationsDto } = await import('@daibilet/backend/public-read');
    const payload = await buildPublicDestinationsDto();
    return (payload.destinations || [])
      .filter((item) => item.type === 'city' && item.slug && (item.events || 0) > 0)
      .sort((a, b) => (b.events || 0) - (a.events || 0) || a.name.localeCompare(b.name, 'ru'))
      .slice(0, limit)
      .map((item) => String(item.slug));
  } catch {
    return [];
  }
}
