import { unstable_cache } from 'next/cache';

import '@/lib/env';
import type { PublicCatalogDto } from '@daibilet/contracts/public';
import type { PublicCatalogQuery } from '@daibilet/contracts/schemas';
import { CATALOG_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { catalogQueryCacheKey } from '@/server/catalog-query';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { CATALOG_PAGE_CACHE_TAG };

const catalogCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [CATALOG_PAGE_CACHE_TAG] as string[],
};

export async function getCachedCatalog(query: PublicCatalogQuery): Promise<PublicCatalogDto> {
  const key = catalogQueryCacheKey(query);
  const cached = unstable_cache(() => fetchPublicApiJson<PublicCatalogDto>('/api/public/events', {
    searchParams: query as Record<string, string | number | boolean | null | undefined>,
    timeoutMs: 5_000,
  }), ['catalog-page-v3-http', key], {
    ...catalogCacheOptions,
    tags: [...catalogCacheOptions.tags, `catalog-query-${key}`],
  });
  return cached();
}
