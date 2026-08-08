import { unstable_cache } from 'next/cache';

import '@/lib/env';
import type { PublicVenuePageDto } from '@daibilet/contracts/public';
import { PUBLIC_PAGE_REVALIDATE, VENUE_PAGE_CACHE_TAG } from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { VENUE_PAGE_CACHE_TAG };

const venueCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [VENUE_PAGE_CACHE_TAG] as string[],
};

function normalizeVenueSlug(slug: string): string {
  try {
    return decodeURIComponent(String(slug || '').trim()).toLowerCase();
  } catch {
    return String(slug || '').trim().toLowerCase();
  }
}

class VenueDtoMissError extends Error {
  constructor(slug: string) {
    super(`venue_dto_miss:${slug}`);
    this.name = 'VenueDtoMissError';
  }
}

/**
 * Shared cached venue DTO for generateMetadata + page (avoids double cold build).
 * Next Data Cache is required for ISR HIT on `/venues/[slug]` (Prisma alone stays dynamic/no-store).
 *
 * Soft-misses (API 404 / empty) must NOT be cached: a cached `null` poisons HTML as persistent
 * Next 404 (x-nextjs-cache=STALE) even after the venue becomes available. Throw inside the
 * cache fn so Next does not store the miss; re-fetch on the next request.
 *
 * Transient API/network failures must NOT become `null` either: callers map thrown errors to
 * "unavailable" (soft 200). Treating downtime as miss → `notFound()` → year-long STALE HTML 404
 * for live URLs (e.g. /locations/saint-petersburg-vladimirskiy-sobor while API still had the row).
 */
export async function getCachedPublicVenueDto(slug: string) {
  const key = normalizeVenueSlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    async () => {
      const payload = await fetchPublicApiJson<PublicVenuePageDto | null>(
        `/api/public/venues/${encodeURIComponent(key)}`,
        {
          timeoutMs: 5_000,
          notFoundAsNull: true,
          revalidateSeconds: PUBLIC_PAGE_REVALIDATE,
        },
      );
      if (!payload?.venue) throw new VenueDtoMissError(key);
      return payload;
    },
    ['public-venue-dto-v7-isr-fetch', key],
    venueCacheOptions,
  );

  try {
    return await cached();
  } catch (error) {
    // True miss → null → HTTP 404. Next often wraps the throw; match by message too.
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof VenueDtoMissError || msg.includes('venue_dto_miss:')) return null;
    // Timeouts / 5xx / connect errors: rethrow so loadVenueDto → unavailable (not notFound poison).
    console.warn(`[venue-dto-cache] unavailable after cache error for ${key}:`, msg);
    throw error instanceof Error ? error : new Error(msg);
  }
}
