import { unstable_cache } from 'next/cache';

import '@/lib/env';
import {
  buildPublicCatalogDto,
  buildPublicDestinationsDto,
  buildPublicLandingsCatalogDto,
  buildPublicVenuesDto,
} from '@daibilet/backend/public-read';

const REVALIDATE = 300;

type HomePageData = {
  destinationsPayload: Awaited<ReturnType<typeof buildPublicDestinationsDto>>;
  catalogPayload: Awaited<ReturnType<typeof buildPublicCatalogDto>>;
  landingsCatalog: Awaited<ReturnType<typeof buildPublicLandingsCatalogDto>>;
  venuesPayload: Awaited<ReturnType<typeof buildPublicVenuesDto>>;
};

export const getHomeDestinations = unstable_cache(
  () => buildPublicDestinationsDto(),
  ['home-destinations-v1'],
  { revalidate: REVALIDATE },
);

export const getHomeCatalog = unstable_cache(
  () => buildPublicCatalogDto({ limit: 120, sort: 'popular' }),
  ['home-catalog-v1'],
  { revalidate: REVALIDATE },
);

export const getHomeLandings = unstable_cache(
  () => buildPublicLandingsCatalogDto(new URLSearchParams()),
  ['home-landings-v1'],
  { revalidate: REVALIDATE },
);

export const getHomeVenues = unstable_cache(
  () => buildPublicVenuesDto(new URLSearchParams({ family: 'institution', limit: '200' })),
  ['home-venues-v1'],
  { revalidate: REVALIDATE },
);

export async function getHomePageData(): Promise<HomePageData> {
  try {
    const [destinationsPayload, catalogPayload, landingsCatalog, venuesPayload] = await Promise.all([
      getHomeDestinations(),
      getHomeCatalog(),
      getHomeLandings(),
      getHomeVenues(),
    ]);
    return { destinationsPayload, catalogPayload, landingsCatalog, venuesPayload };
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
    } as HomePageData;
  }
}
