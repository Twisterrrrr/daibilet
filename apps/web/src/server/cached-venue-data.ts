import { unstable_cache } from 'next/cache';

import '@/lib/env';
import { buildPublicVenueDto } from '@daibilet/backend/public-read';
import { PUBLIC_PAGE_REVALIDATE, VENUE_PAGE_CACHE_TAG } from '@/server/cache-config';

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
    () => buildPublicVenueDto(key),
    ['public-venue-dto-v1', key],
    venueCacheOptions,
  );
  return cached();
}
