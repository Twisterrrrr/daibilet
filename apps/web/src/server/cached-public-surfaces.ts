import { unstable_cache } from 'next/cache';

import '@/lib/env';
import { prisma } from '@/lib/db';
import type {
  PublicDestinationDto,
  PublicLandingDto,
  PublicVenuesDto,
} from '@daibilet/contracts/public';
import {
  PODBORKI_CATEGORIES,
  type PodborkiCategoryMeta,
} from '@/lib/podborki-categories';
import {
  DESTINATIONS_CACHE_TAG,
  PUBLIC_SURFACES_CACHE_TAG,
} from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

/** Hot catalog DTOs for /podborki, /venues, /locations - short TTL, no Redis yet. */
export { DESTINATIONS_CACHE_TAG, PUBLIC_SURFACES_CACHE_TAG };

const surfaceCacheOptions = {
  revalidate: 600,
  tags: [PUBLIC_SURFACES_CACHE_TAG] as string[],
};

export type PodborkiMetaPayload = {
  layoutBySlug: Record<string, string | null>;
  categoryBySlug: Record<string, string | null>;
  categories: PodborkiCategoryMeta[];
};

export type PublicDestinationsPayload = {
  generatedAt?: string;
  destinations: PublicDestinationDto[];
};

export type PublicLandingsCatalogPayload = {
  generatedAt?: string;
  city?: string;
  items: PublicLandingDto[];
};

async function loadPodborkiMeta(): Promise<PodborkiMetaPayload> {
  try {
    const [layoutRows, categoryRows, dbCategories] = await Promise.all([
      prisma.landing.findMany({
        where: { layoutVariant: { in: ['HERO_FEATURED', 'HERO_TRENDING'] } },
        select: { slug: true, layoutVariant: true },
      }),
      prisma.landing.findMany({
        where: { categoryId: { not: null } },
        select: { slug: true, category: { select: { slug: true } } },
      }),
      prisma.landingCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, title: true, subtitle: true, sortOrder: true },
      }),
    ]);

    const layoutBySlug: Record<string, string | null> = {};
    for (const row of layoutRows) layoutBySlug[row.slug] = row.layoutVariant;

    const categoryBySlug: Record<string, string | null> = {};
    for (const row of categoryRows) categoryBySlug[row.slug] = row.category?.slug ?? null;

    const categories: PodborkiCategoryMeta[] = dbCategories.length
      ? dbCategories.map((row) => ({
          slug: row.slug as PodborkiCategoryMeta['slug'],
          title: row.title,
          subtitle: row.subtitle || '',
          sortOrder: row.sortOrder,
        }))
      : PODBORKI_CATEGORIES;

    return { layoutBySlug, categoryBySlug, categories };
  } catch {
    return { layoutBySlug: {}, categoryBySlug: {}, categories: PODBORKI_CATEGORIES };
  }
}

/** Layout/category maps for /podborki - off the per-request Prisma path. */
export const getCachedPodborkiMeta = unstable_cache(loadPodborkiMeta, ['podborki-meta-v1'], surfaceCacheOptions);

export async function getCachedLandingsCatalog(city = 'all') {
  const key = city && city !== 'all' ? city : 'all';
  const cached = unstable_cache(
    () => {
      const params = new URLSearchParams();
      if (key !== 'all') params.set('city', key);
      return fetchPublicApiJson<PublicLandingsCatalogPayload>('/api/public/landings-catalog', {
        searchParams: params,
        timeoutMs: 4_000,
      });
    },
    ['public-landings-catalog-v2-http', key],
    surfaceCacheOptions,
  );
  return cached();
}

/**
 * Header/footer city list — rarely changes; TTL 86400 so it does not cap page ISR
 * (Next takes the minimum revalidate across all `unstable_cache` on the page).
 * On-demand bust: tag `destinations` via `POST /api/internal/revalidate`
 * `{ "tags": ["destinations", "public-surfaces"] }` (admin city update / catalog warm).
 */
export async function getCachedDestinations() {
  return unstable_cache(
    () =>
      fetchPublicApiJson<PublicDestinationsPayload>('/api/public/destinations', {
        timeoutMs: 3_000,
      }),
    ['public-destinations-v3-http'],
    {
      revalidate: 86_400,
      tags: [PUBLIC_SURFACES_CACHE_TAG, DESTINATIONS_CACHE_TAG],
    },
  )();
}

export async function getCachedVenuesCatalog(
  family: 'institution' | 'location' | 'all',
  options: {
    limit?: number;
    city?: string;
    type?: string;
    scale?: string;
    logistics?: string;
    sort?: string;
    page?: number;
    cursor?: string;
    q?: string;
    /** Progressive SSR/client shell: skip distinct product counts wait. */
    counts?: boolean;
  } = {},
) {
  const limit = options.limit ?? 24;
  const city = options.city?.trim() || '';
  const type = options.type?.trim() || '';
  const scale = options.scale?.trim() || '';
  const logistics = options.logistics?.trim() || '';
  const sort = options.sort?.trim() || 'events';
  const page = Math.max(1, Number(options.page) || 1);
  const cursor = options.cursor?.trim() || '';
  const q = options.q?.trim() || '';
  const shell = options.counts === false;
  // Cache key: city+kind+page(+scale/logistics[+sort/q]) + shell/full.
  const cacheKeyParts = [
    'public-venues-catalog-v7-page',
    family,
    String(limit),
    city || 'all',
    type || 'all',
    scale || 'all',
    logistics || 'all',
    sort,
    page > 1 ? `p${page}` : cursor || '',
    q,
    shell ? 'shell' : 'full',
  ];
  const cached = unstable_cache(
    () => {
      const searchParams: Record<string, string | number> = { limit };
      if (family === 'institution' || family === 'location') searchParams.family = family;
      if (city) searchParams.city = city;
      if (type) searchParams.type = type;
      if (scale) searchParams.scale = scale;
      if (logistics) searchParams.logistics = logistics;
      if (sort && sort !== 'events') searchParams.sort = sort;
      if (page > 1) searchParams.page = page;
      else if (cursor) searchParams.cursor = cursor;
      if (q) searchParams.q = q;
      if (shell) searchParams.counts = 0;
      return fetchPublicApiJson<PublicVenuesDto>('/api/public/venues', {
        searchParams,
        timeoutMs: shell ? 3_000 : 5_000,
      });
    },
    cacheKeyParts,
    surfaceCacheOptions,
  );
  return cached();
}
