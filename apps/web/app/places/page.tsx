import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';

import { PlacesHubView } from '@/components/PlacesHubView.client';
import { SiteLayout } from '@/components/SiteLayout';
import { VenueCatalogPageSkeleton } from '@/components/VenueCatalogSkeletons';
import { cityToNominative } from '@/lib/city-declension';
import {
  buildPlacesListingSeo,
  firstPlacesQueryValue,
  normalizePlacesFamily,
} from '@/lib/places-seo';
import { isAllCitiesQuery, matchDestination } from '@/lib/selected-city';
import { INDEX_FOLLOW_ROBOTS, buildShareMetadata, canonicalHref, pageTitle } from '@/lib/seo-meta';
import { withSoftTimeout } from '@/lib/soft-timeout';
import {
  mapVenueCatalogFeedPage,
  venueCatalogCacheKey,
  venueCatalogDefaultQueryKey,
  VENUE_CATALOG_PAGE_SIZE,
} from '@/lib/venue-catalog-feed';
import {
  getCachedDestinations,
  getCachedVenuesCatalog,
} from '@/server/cached-public-surfaces';

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY_FEED = mapVenueCatalogFeedPage({
  generatedAt: new Date(0).toISOString(),
  total: 0,
  venues: [],
  page: 1,
  nextCursor: null,
  hasMore: false,
  limit: VENUE_CATALOG_PAGE_SIZE,
});

const VENUE_LIST_TIMEOUT_MS = 6000;
const VENUE_LIST_RETRY_TIMEOUT_MS = 2500;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const cityRaw = firstPlacesQueryValue(params.city);
  let cityName: string | null = null;
  let citySlug: string | null = null;
  if (cityRaw && !isAllCitiesQuery(cityRaw)) {
    citySlug = cityRaw;
    try {
      const payload = await getCachedDestinations();
      const destinations = payload?.destinations || [];
      const matched = matchDestination(destinations, cityRaw);
      cityName = matched?.name || (/[а-яё]/i.test(cityRaw) ? cityRaw : null);
      if (!cityName) {
        const fromSlug = cityToNominative(cityRaw);
        if (/[а-яё]/i.test(fromSlug)) cityName = fromSlug;
      }
      citySlug = matched?.slug || citySlug;
    } catch {
      cityName = /[а-яё]/i.test(cityRaw) ? cityRaw : null;
      if (!cityName) {
        const fromSlug = cityToNominative(cityRaw);
        if (/[а-яё]/i.test(fromSlug)) cityName = fromSlug;
      }
    }
  }

  const seo = buildPlacesListingSeo({
    cityName,
    citySlug,
    q: firstPlacesQueryValue(params.q),
    type: firstPlacesQueryValue(params.type),
    family: firstPlacesQueryValue(params.family),
    page: firstPlacesQueryValue(params.page),
    hasEvents: firstPlacesQueryValue(params.hasEvents),
    sort: firstPlacesQueryValue(params.sort),
    category: firstPlacesQueryValue(params.category),
  });
  const cleanTitle = pageTitle(seo.title);
  const canonical = canonicalHref(seo.canonicalPath);
  return {
    title: cleanTitle,
    description: seo.description,
    alternates: { canonical },
    robots: INDEX_FOLLOW_ROBOTS,
    ...buildShareMetadata({
      title: `${cleanTitle} | Дайбилет`,
      description: seo.description,
      path: seo.canonicalPath,
    }),
  };
}

/**
 * Unified Places catalog. Entity URLs stay `/venues/[slug]` and `/locations/[slug]`.
 * SSR must follow `?family=` so `/locations` → `/places?family=location` is not a venues first paint.
 */
export default async function PlacesIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const family = normalizePlacesFamily(firstPlacesQueryValue(params.family)) || 'all';
  const cityRaw = firstPlacesQueryValue(params.city);
  const city = cityRaw && !isAllCitiesQuery(cityRaw) ? cityRaw : '';
  let initialPage = EMPTY_FEED;
  try {
    const emptyPayload = {
      generatedAt: new Date(0).toISOString(),
      total: 0,
      venues: [] as never[],
      page: 1,
      nextCursor: null,
      hasMore: false,
      limit: VENUE_CATALOG_PAGE_SIZE,
    };
    const catalogOpts = {
      limit: VENUE_CATALOG_PAGE_SIZE,
      counts: false as const,
      ...(city ? { city } : {}),
    };
    const payload = await withSoftTimeout(
      getCachedVenuesCatalog(family, catalogOpts),
      VENUE_LIST_TIMEOUT_MS,
      emptyPayload,
      'places-list',
    );
    initialPage = mapVenueCatalogFeedPage(payload);
    if (!initialPage.venues.length) {
      const retry = await withSoftTimeout(
        getCachedVenuesCatalog(family, catalogOpts),
        VENUE_LIST_RETRY_TIMEOUT_MS,
        emptyPayload,
        'places-list-retry',
      );
      initialPage = mapVenueCatalogFeedPage(retry);
      if (!initialPage.venues.length) noStore();
    }
  } catch {
    noStore();
    initialPage = EMPTY_FEED;
  }

  const initialQueryKey = city
    ? venueCatalogCacheKey({
        family,
        city,
        sort: 'events',
        page: 1,
        limit: VENUE_CATALOG_PAGE_SIZE,
      })
    : venueCatalogDefaultQueryKey(family);

  return (
    <SiteLayout>
      <Suspense fallback={<VenueCatalogPageSkeleton family={family === 'location' ? 'location' : 'institution'} />}>
        <PlacesHubView initialPage={initialPage} initialQueryKey={initialQueryKey} />
      </Suspense>
    </SiteLayout>
  );
}
