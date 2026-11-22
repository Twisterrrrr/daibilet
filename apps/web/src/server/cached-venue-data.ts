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
 * Transient API/network failures return `{ kind: 'transient' }` (never cached): the caller
 * renders a soft 200 + noindex "temporarily unavailable" page instead of a 500. This keeps the
 * Data Cache clean and avoids year-long STALE 404 / 500 for live URLs.
 */
export type CachedVenueDto =
  | { kind: 'ok'; payload: PublicVenuePageDto }
  | { kind: 'miss' }
  | { kind: 'transient' };

export async function getCachedPublicVenueDto(slug: string): Promise<CachedVenueDto> {
  const key = normalizeVenueSlug(slug);
  if (!key) return { kind: 'miss' };

  const cached = unstable_cache(
    async () => {
      const payload = await fetchPublicApiJson<PublicVenuePageDto | null>(
        `/api/public/venues/${encodeURIComponent(key)}`,
        {
          // Cold DTO work can exceed 8s; one bounded retry lets the completed backend build be reused.
          timeoutMs: 12_000,
          retries: 1,
          notFoundAsNull: true,
          revalidateSeconds: PUBLIC_PAGE_REVALIDATE,
        },
      );
      if (!payload?.venue) throw new VenueDtoMissError(key);
      return payload;
    },
    ['public-venue-dto-v8-transient-retry', key],
    venueCacheOptions,
  );

  try {
    const payload = await cached();
    return { kind: 'ok', payload };
  } catch (error) {
    // True miss → null → HTTP 404. Next often wraps the throw; match by message too.
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof VenueDtoMissError || msg.includes('venue_dto_miss:')) return { kind: 'miss' };
    // Timeouts / 5xx / connect errors: soft-unavailable (placeholder is never cached).
    console.warn(`[venue-dto-cache] unavailable after cache error for ${key}:`, msg);
    return { kind: 'transient' };
  }
}
