import { unstable_cache } from 'next/cache';

import '@/lib/env';
import { prisma } from '@/lib/db';
import { shouldEmitAggregateRating } from '@/lib/review-rating';
import type { PublicEventPageDto } from '@daibilet/contracts/public';
import { EVENT_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { EVENT_PAGE_CACHE_TAG };

const eventCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [EVENT_PAGE_CACHE_TAG] as string[],
};

function normalizeEventSlug(slug: string): string {
  try {
    return decodeURIComponent(String(slug || '').trim());
  } catch {
    return String(slug || '').trim();
  }
}

/**
 * Shared cached event DTO for generateMetadata + page (avoids double cold build).
 * Next Data Cache - required for ISR HIT on `/events/[slug]` (Prisma alone stays dynamic).
 */
export async function getCachedPublicEventDto(slug: string) {
  const key = normalizeEventSlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    () =>
      fetchPublicApiJson<PublicEventPageDto | null>(`/api/public/events/${encodeURIComponent(key)}`, {
        timeoutMs: 5_000,
        notFoundAsNull: true,
      }),
    // v2: invalidate stale single-session pages after meta-group slot merge.
    ['public-event-dto-v3-http', key],
    eventCacheOptions,
  );
  return cached();
}

export type EventAggregateRating = {
  ratingValue: number;
  reviewCount: number;
};

/** AggregateRating for Event JSON-LD — same TTL/tag as event DTO. */
export async function getCachedEventAggregateRating(
  eventId: string,
): Promise<EventAggregateRating | null> {
  const id = String(eventId || '').trim();
  if (!id) return null;

  const cached = unstable_cache(
    async (): Promise<EventAggregateRating | null> => {
      try {
        const approved = await prisma.review.findMany({
          where: { eventId: id, status: 'APPROVED' },
          select: { rating: true },
        });
        const reviewCount = approved.length;
        const avgRating =
          reviewCount > 0
            ? Math.round(
                (approved.reduce((sum, row) => sum + row.rating, 0) / reviewCount) * 10,
              ) / 10
            : 0;
        if (!shouldEmitAggregateRating(reviewCount, avgRating)) return null;
        return { ratingValue: avgRating, reviewCount };
      } catch {
        // Migration not applied yet / DB unavailable.
        return null;
      }
    },
    ['event-aggregate-rating-v1', id],
    eventCacheOptions,
  );
  return cached();
}
