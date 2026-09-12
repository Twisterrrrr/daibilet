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

class EventDtoMissError extends Error {
  constructor(slug: string) {
    super(`event_dto_miss:${slug}`);
    this.name = 'EventDtoMissError';
  }
}

export type EventDtoLoad =
  | { kind: 'ok'; payload: PublicEventPageDto }
  | { kind: 'miss' }
  | { kind: 'unavailable' };

/**
 * Shared cached event DTO for generateMetadata + page (avoids double cold fetch).
 * React `cache` = request memoization; `unstable_cache` = cross-request Data Cache (ISR HIT).
 *
 * Same contract as city/venue: do not cache JSON-null misses (ISR + notFound → HTTP 500),
 * and do not use bare `cache: 'no-store'` inside this cache fn on `revalidate` routes.
 */
export async function getCachedPublicEventDto(slug: string) {
  const key = normalizeEventSlug(slug);
  if (!key) return null;

  const cached = unstable_cache(
    async () => {
      const payload = await fetchPublicApiJson<PublicEventPageDto | null>(
        `/api/public/events/${encodeURIComponent(key)}`,
        {
          timeoutMs: 8_000,
          notFoundAsNull: true,
          revalidateSeconds: EVENT_PAGE_REVALIDATE,
        },
      );
      if (!payload?.event) throw new EventDtoMissError(key);
      return payload;
    },
    // v5: ISR fetch + miss-throw (v4 cached null / no-store and poisoned live PDPs).
    ['public-event-dto-v5-isr-fetch', key],
    {
      revalidate: EVENT_PAGE_REVALIDATE,
      tags: [EVENT_PAGE_CACHE_TAG, eventPageCacheTag(key)],
    },
  );

  try {
    return await cached();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof EventDtoMissError || msg.includes('event_dto_miss:')) return null;
    console.warn(`[event-dto-cache] unavailable after cache error for ${key}:`, msg);
    throw error instanceof Error ? error : new Error(msg);
  }
}

/** Prefer cached DTO. True miss → 404; transient API errors → soft unavailable (not HTTP 500). */
export async function loadEventDto(slug: string): Promise<EventDtoLoad> {
  const key = normalizeEventSlug(slug);
  if (!key) return { kind: 'miss' };

  try {
    const cached = await getCachedPublicEventDto(key);
    if (cached?.event) return { kind: 'ok', payload: cached };
    return { kind: 'miss' };
  } catch {
    return { kind: 'unavailable' };
  }
}

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
