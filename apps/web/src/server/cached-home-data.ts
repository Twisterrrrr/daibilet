import { unstable_cache } from 'next/cache';

import '@/lib/env';
import {
  buildPublicCatalogDto,
  buildPublicDestinationsDto,
  buildPublicLandingsCatalogDto,
  buildPublicVenuesDto,
} from '@daibilet/backend/public-read';

export const getHomePageData = unstable_cache(
  async () => {
    const [destinationsPayload, catalogPayload, landingsCatalog, venuesPayload] = await Promise.all([
      buildPublicDestinationsDto(),
      buildPublicCatalogDto({ limit: 300, sort: 'popular' }),
      buildPublicLandingsCatalogDto(new URLSearchParams()),
      buildPublicVenuesDto(new URLSearchParams({ family: 'institution', limit: '500' })),
    ]);
    return { destinationsPayload, catalogPayload, landingsCatalog, venuesPayload };
  },
  ['home-page-data-v1'],
  { revalidate: 300 },
);
