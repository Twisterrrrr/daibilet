import { unstable_cache } from 'next/cache';

import '@/lib/env';
import {
  buildPublicDestinationsDto,
  buildPublicLandingsCatalogDto,
  buildPublicVenuesDto,
} from '@daibilet/backend/public-read';
import { PUBLIC_PAGE_REVALIDATE, PUBLIC_SURFACES_CACHE_TAG } from '@/server/cache-config';

/** Hot catalog DTOs for /podborki, /venues, /locations - short TTL, no Redis yet. */
export { PUBLIC_SURFACES_CACHE_TAG };

const surfaceCacheOptions = {
  revalidate: 600,
  tags: [PUBLIC_SURFACES_CACHE_TAG] as string[],
};

export async function getCachedLandingsCatalog(city = 'all') {
  const key = city && city !== 'all' ? city : 'all';
  const cached = unstable_cache(
    () => {
      const params = new URLSearchParams();
      if (key !== 'all') params.set('city', key);
      return buildPublicLandingsCatalogDto(params);
    },
    ['public-landings-catalog-v1', key],
    surfaceCacheOptions,
  );
  return cached();
}

export async function getCachedDestinations() {
  return unstable_cache(() => buildPublicDestinationsDto(), ['public-destinations-v1'], {
    ...surfaceCacheOptions,
    revalidate: PUBLIC_PAGE_REVALIDATE,
  })();
}

export async function getCachedVenuesCatalog(family: 'institution' | 'location', limit = 500) {
  const cached = unstable_cache(
    () =>
      buildPublicVenuesDto(
        new URLSearchParams({ family, limit: String(limit) }),
      ),
    ['public-venues-catalog-v2', family, String(limit)],
    surfaceCacheOptions,
  );
  return cached();
}
