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
  ['home-destinations-v2'],
  homeCacheOptions,
);

export const getHomeCatalog = unstable_cache(
  () => buildPublicCatalogDto({ limit: 50, sort: 'popular' }),
  ['home-catalog-v3'],
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
  ['home-stats-v1'],
  homeCacheOptions,
);

/** Build/CI without Postgres: empty payloads (same pattern as SiteLayout destinations catch). */
export async function getHomePageData(): Promise<HomePageData> {
  try {
    const [destinationsPayload, catalogPayload, landingsCatalog, venuesPayload, statsPayload] = await Promise.all([
      getHomeDestinations(),
      getHomeCatalog(),
      getHomeLandings(),
      getHomeVenues(),
      getHomeStats(),
    ]);
    return { destinationsPayload, catalogPayload, landingsCatalog, venuesPayload, statsPayload };
  } catch {
    return emptyHomePageData();
  }
}
