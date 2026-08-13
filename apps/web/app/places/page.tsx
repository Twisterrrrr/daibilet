import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';

import { PlacesHubView } from '@/components/PlacesHubView.client';
import { SiteLayout } from '@/components/SiteLayout';
import { VenueCatalogPageSkeleton } from '@/components/VenueCatalogSkeletons';
import { robotsForIndexability } from '@/lib/hub-indexability';
import {
  buildPlacesListingSeo,
  firstPlacesQueryValue,
} from '@/lib/places-seo';
import { isAllCitiesQuery, matchDestination } from '@/lib/selected-city';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import { withSoftTimeout } from '@/lib/soft-timeout';
import {
  mapVenueCatalogFeedPage,
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
      citySlug = matched?.slug || citySlug;
    } catch {
      cityName = /[а-яё]/i.test(cityRaw) ? cityRaw : null;
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
  });
  const cleanTitle = pageTitle(seo.title);
  return {
    title: cleanTitle,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    robots: robotsForIndexability(seo.indexable),
    ...buildShareMetadata({
      title: `${cleanTitle} | Дайбилет`,
      description: seo.description,
      path: seo.canonicalPath,
    }),
  };
}

/**
 * Unified Places catalog. Entity URLs stay `/venues/[slug]` and `/locations/[slug]`.
 */
export default async function PlacesIndexPage() {
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
    const payload = await withSoftTimeout(
      getCachedVenuesCatalog('all', { limit: VENUE_CATALOG_PAGE_SIZE, counts: false }),
      VENUE_LIST_TIMEOUT_MS,
      emptyPayload,
      'places-list',
    );
    initialPage = mapVenueCatalogFeedPage(payload);
    if (!initialPage.venues.length) {
      const retry = await withSoftTimeout(
        getCachedVenuesCatalog('all', { limit: VENUE_CATALOG_PAGE_SIZE, counts: false }),
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

  const initialQueryKey = venueCatalogDefaultQueryKey('all');

  return (
    <SiteLayout>
      <Suspense fallback={<VenueCatalogPageSkeleton family="institution" />}>
        <PlacesHubView initialPage={initialPage} initialQueryKey={initialQueryKey} />
      </Suspense>
    </SiteLayout>
  );
}
