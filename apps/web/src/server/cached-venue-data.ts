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

/**
 * Shared cached venue DTO for generateMetadata + page (avoids double cold build).
 * Next Data Cache is required for ISR HIT on `/venues/[slug]` (Prisma alone stays dynamic/no-store).
 */
export async function getCachedPublicVenueDto(slug: string) {
  const key = normalizeVenueSlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    () =>
      fetchPublicApiJson<PublicVenuePageDto | null>(`/api/public/venues/${encodeURIComponent(key)}`, {
        timeoutMs: 5_000,
        notFoundAsNull: true,
      }),
    ['public-venue-dto-v3-http', key],
    venueCacheOptions,
  );
  return cached();
}
