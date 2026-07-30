import { unstable_cache } from 'next/cache';

import '@/lib/env';
import { buildPublicCatalogDto } from '@daibilet/backend/public-read';
import type { PublicCatalogQuery } from '@daibilet/contracts/schemas';
import { CATALOG_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { catalogQueryCacheKey } from '@/server/catalog-query';

export { CATALOG_PAGE_CACHE_TAG };

const catalogCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [CATALOG_PAGE_CACHE_TAG] as string[],
};

export async function getCachedCatalog(query: PublicCatalogQuery): Promise<Awaited<ReturnType<typeof buildPublicCatalogDto>>> {
  const key = catalogQueryCacheKey(query);
  const cached = unstable_cache(() => buildPublicCatalogDto(query), ['catalog-page-v2-lean', key], {
    ...catalogCacheOptions,
    tags: [...catalogCacheOptions.tags, `catalog-query-${key}`],
  });
  return cached();
}
