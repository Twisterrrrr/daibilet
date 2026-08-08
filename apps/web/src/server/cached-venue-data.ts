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
        },
      );
      if (!payload?.venue) throw new VenueDtoMissError(key);
      return payload;
    },
    ['public-venue-dto-v4-no-null', key],
    venueCacheOptions,
  );

  try {
    return await cached();
  } catch (error) {
    // unstable_cache may wrap/rehydrate the throw - match by message, not only instanceof.
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof VenueDtoMissError || msg.includes('venue_dto_miss:')) return null;
    throw error;
  }
}
