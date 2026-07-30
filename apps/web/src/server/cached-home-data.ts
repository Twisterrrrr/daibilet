import { unstable_cache } from 'next/cache';

import '@/lib/env';
import {
  buildPublicCatalogDto,
  buildPublicDestinationsDto,
  buildPublicLandingsCatalogDto,
  buildPublicStatsDto,
  buildPublicVenuesDto,
} from '@daibilet/backend/public-read';
import { HOME_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { resolveCoverContentFingerprints } from '@/server/cover-image-fingerprint';

export { HOME_PAGE_CACHE_TAG };

const homeCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [HOME_PAGE_CACHE_TAG] as string[],
};

type HomePageData = {
  destinationsPayload: Awaited<ReturnType<typeof buildPublicDestinationsDto>>;
  catalogPayload: Awaited<ReturnType<typeof buildPublicCatalogDto>>;
  landingsCatalog: Awaited<ReturnType<typeof buildPublicLandingsCatalogDto>>;
  venuesPayload: Awaited<ReturnType<typeof buildPublicVenuesDto>>;
  statsPayload: Awaited<ReturnType<typeof buildPublicStatsDto>>;
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
  () => buildPublicDestinationsDto(),
  ['home-destinations-v3-statsfix'],
  homeCacheOptions,
);

export const getHomeCatalog = unstable_cache(
  // Wider pool so cover-content dedupe can refill rails after skipping identical binaries.
  () => buildPublicCatalogDto({ limit: 80, sort: 'popular' }),
  ['home-catalog-v6-lean'],
  homeCacheOptions,
);

/**
 * S3 HEAD ETag fingerprints for home rails dedupe.
 * Kept off the per-request path: same 300s tag/revalidate as catalog.
 * Returns a plain object (JSON-serializable for unstable_cache).
 */
export const getHomeCoverFingerprints = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const catalog = await getHomeCatalog();
    const map = await resolveCoverContentFingerprints(
      (catalog.items ?? []).map((item) => item.imageUrl),
    );
    return Object.fromEntries(map);
  },
  ['home-cover-fingerprints-v1'],
  homeCacheOptions,
);

export const getHomeLandings = unstable_cache(
  () => buildPublicLandingsCatalogDto(new URLSearchParams()),
  ['home-landings-v2'],
  homeCacheOptions,
);

export const getHomeVenues = unstable_cache(
  () => buildPublicVenuesDto(new URLSearchParams({ family: 'institution', limit: '200' })),
  ['home-venues-v2'],
  homeCacheOptions,
);

export const getHomeStats = unstable_cache(
  () => buildPublicStatsDto(),
  ['home-stats-v2-statsfix'],
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
