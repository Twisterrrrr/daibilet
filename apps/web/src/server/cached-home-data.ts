import { unstable_cache } from 'next/cache';

import '@/lib/env';
import {
  buildPublicCatalogDto,
  buildPublicDestinationsDto,
  buildPublicLandingsCatalogDto,
  buildPublicVenuesDto,
} from '@daibilet/backend/public-read';

const REVALIDATE = 300;

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

export async function getHomePageData() {
  const [destinationsPayload, catalogPayload, landingsCatalog, venuesPayload] = await Promise.all([
    getHomeDestinations(),
    getHomeCatalog(),
    getHomeLandings(),
    getHomeVenues(),
  ]);
  return { destinationsPayload, catalogPayload, landingsCatalog, venuesPayload };
}
