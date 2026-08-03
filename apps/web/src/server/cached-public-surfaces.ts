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
import { PUBLIC_SURFACES_CACHE_TAG } from '@/server/cache-config';import { fetchPublicApiJson } from '@/server/public-api-client';

/** Hot catalog DTOs for /podborki, /venues, /locations - short TTL, no Redis yet. */
export { PUBLIC_SURFACES_CACHE_TAG };

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
 * Header/footer city list — rarely changes; long TTL so it does not cap page ISR
 * (Next takes the minimum revalidate across all `unstable_cache` on the page).
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
      tags: [PUBLIC_SURFACES_CACHE_TAG, 'destinations'],
    },
  )();
}

export async function getCachedVenuesCatalog(family: 'institution' | 'location', limit = 500) {
  const cached = unstable_cache(
    () =>
      fetchPublicApiJson<PublicVenuesDto>('/api/public/venues', {
        searchParams: { family, limit },
        timeoutMs: 5_000,
      }),
    ['public-venues-catalog-v3-http', family, String(limit)],
    surfaceCacheOptions,
  );
  return cached();
}
