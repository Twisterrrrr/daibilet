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

export const getHomeDestinations = unstable_cache(
  () => buildPublicDestinationsDto(),
  ['home-destinations-v2'],
  homeCacheOptions,
);

export const getHomeCatalog = unstable_cache(
  () => buildPublicCatalogDto({ limit: 120, sort: 'popular' }),
  ['home-catalog-v2'],
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
    const generatedAt = new Date().toISOString();
    return {
      destinationsPayload: { generatedAt, destinations: [] },
      catalogPayload: {
        generatedAt,
        items: [],
        total: 0,
        limit: 120,
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
      landingsCatalog: { generatedAt, city: '', items: [] },
      venuesPayload: { generatedAt, venues: [], total: 0 },
      statsPayload: {
        generatedAt,
        stats: { events: 0, destinations: 0, venues: 0, landings: 0 },
      },
    } as HomePageData;
  }
}
