import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import '@/lib/env';
import { prisma } from '@/lib/db';
import { shouldEmitAggregateRating } from '@/lib/review-rating';
import type { PublicEventPageDto } from '@daibilet/contracts/public';
import {
  EVENT_PAGE_CACHE_TAG,
  EVENT_PAGE_REVALIDATE,
  eventPageCacheTag,
} from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { EVENT_PAGE_CACHE_TAG, EVENT_PAGE_REVALIDATE, eventPageCacheTag };

function normalizeEventSlug(slug: string): string {
  try {
    return decodeURIComponent(String(slug || '').trim());
  } catch {
    return String(slug || '').trim();
  }
}

/**
 * Shared cached event DTO for generateMetadata + page (avoids double cold fetch).
 * React `cache` = request memoization; `unstable_cache` = cross-request Data Cache (ISR HIT).
 */
export const getCachedPublicEventDto = cache(async (slug: string) => {
  const key = normalizeEventSlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    () =>
      fetchPublicApiJson<PublicEventPageDto | null>(`/api/public/events/${encodeURIComponent(key)}`, {
        timeoutMs: 5_000,
        notFoundAsNull: true,
      }),
    // v4: 7200s TTL + per-slug tag for on-demand revalidate
    ['public-event-dto-v4-http', key],
    {
      revalidate: EVENT_PAGE_REVALIDATE,
      tags: [EVENT_PAGE_CACHE_TAG, eventPageCacheTag(key)],
    },
  );
  return cached();
});

export type EventAggregateRating = {
  ratingValue: number;
  reviewCount: number;
};

/** AggregateRating for Event JSON-LD — same TTL; tagged by event id (not public slug). */
export const getCachedEventAggregateRating = cache(
  async (eventId: string): Promise<EventAggregateRating | null> => {
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
      ['event-aggregate-rating-v2', id],
      {
        revalidate: EVENT_PAGE_REVALIDATE,
        tags: [EVENT_PAGE_CACHE_TAG, `event-rating:${id}`],
      },
    );
    return cached();
  },
);
