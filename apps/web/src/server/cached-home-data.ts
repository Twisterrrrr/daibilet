import { unstable_cache } from 'next/cache';

import '@/lib/env';
import type {
  PublicCatalogDto,
  PublicDestinationDto,
  PublicLandingDto,
  PublicStatsDto,
  PublicVenuesDto,
} from '@daibilet/contracts/public';
import { HOME_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { resolveCoverContentFingerprints } from '@/server/cover-image-fingerprint';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { HOME_PAGE_CACHE_TAG };

const homeCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [HOME_PAGE_CACHE_TAG] as string[],
};

type HomePageData = {
  destinationsPayload: { generatedAt?: string; destinations: PublicDestinationDto[] };
  catalogPayload: PublicCatalogDto;
  landingsCatalog: { generatedAt?: string; city?: string; items: PublicLandingDto[] };
  venuesPayload: PublicVenuesDto;
  statsPayload: PublicStatsDto;
};

function emptyHomePageData(): HomePageData {
  const generatedAt = new Date().toISOString();
  return {
    destinationsPayload: { generatedAt, destinations: [] },
    catalogPayload: {
      generatedAt,
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
      hasMore: false,
      facets: {
        cities: [],
        categories: [],
        subcategories: [],
        landings: [],
        priceSteps: [],
      },
    },
    landingsCatalog: { generatedAt, city: 'all', items: [] },
    venuesPayload: { generatedAt, total: 0, venues: [] },
    statsPayload: {
      generatedAt,
      stats: { events: 0, destinations: 0, venues: 0, landings: 0 },
    },
  };
}

export const getHomeDestinations = unstable_cache(
  () => fetchPublicApiJson<HomePageData['destinationsPayload']>('/api/public/destinations', { timeoutMs: 3_000 }),
  ['home-destinations-v4-http'],
  homeCacheOptions,
);

export const getHomeCatalog = unstable_cache(
  // Wider pool so cover-content dedupe can refill rails after skipping identical binaries.
  () =>
    fetchPublicApiJson<PublicCatalogDto>('/api/public/events', {
      searchParams: { limit: 80, sort: 'popular' },
      timeoutMs: 5_000,
    }),
  ['home-catalog-v7-http'],
  homeCacheOptions,
);

/**
 * S3 HEAD ETag fingerprints for home rails dedupe.
 * Kept off the per-request path: same 300s tag/revalidate as catalog.
 * Returns a plain object (JSON-serializable for unstable_cache).
 */
export const getHomeCoverFingerprints = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const catalog = await getHomeCatalog();
      const map = await resolveCoverContentFingerprints(
        (catalog.items ?? []).map((item) => item.imageUrl),
      );
      return Object.fromEntries(map);
    } catch (error) {
      console.warn('[home-cover-fingerprints] unavailable during SSG, skipping:', error);
      return {};
    }
  },
  ['home-cover-fingerprints-v1'],
  homeCacheOptions,
);

export const getHomeLandings = unstable_cache(
  () => fetchPublicApiJson<HomePageData['landingsCatalog']>('/api/public/landings-catalog', { timeoutMs: 4_000 }),
  ['home-landings-v3-http'],
  homeCacheOptions,
);

export const getHomeVenues = unstable_cache(
  () =>
    fetchPublicApiJson<PublicVenuesDto>('/api/public/venues', {
      searchParams: { family: 'institution', limit: 200 },
      timeoutMs: 5_000,
    }),
  ['home-venues-v3-http'],
  homeCacheOptions,
);

export const getHomeStats = unstable_cache(
  () => fetchPublicApiJson<PublicStatsDto>('/api/public/stats', { timeoutMs: 3_000 }),
  ['home-stats-v3-http'],
  homeCacheOptions,
);

/** Partial failure (e.g. stats) must not wipe the whole home — use allSettled + empty fallbacks. */
export async function getHomePageData(): Promise<HomePageData> {
  const empty = emptyHomePageData();
  const [destinationsResult, catalogResult, landingsResult, venuesResult, statsResult] =
    await Promise.allSettled([
      getHomeDestinations(),
      getHomeCatalog(),
      getHomeLandings(),
      getHomeVenues(),
      getHomeStats(),
    ]);

  return {
    destinationsPayload:
      destinationsResult.status === 'fulfilled' ? destinationsResult.value : empty.destinationsPayload,
    catalogPayload: catalogResult.status === 'fulfilled' ? catalogResult.value : empty.catalogPayload,
    landingsCatalog: landingsResult.status === 'fulfilled' ? landingsResult.value : empty.landingsCatalog,
    venuesPayload: venuesResult.status === 'fulfilled' ? venuesResult.value : empty.venuesPayload,
    statsPayload: statsResult.status === 'fulfilled' ? statsResult.value : empty.statsPayload,
  };
}
