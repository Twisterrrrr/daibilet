import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { LocationsCatalogView } from '@/components/LocationsCatalogView.client';
import { VenuesCatalogView } from '@/components/VenuesCatalogView.client';
import { VenuePageView } from '@/components/VenuePageView.client';
import { VenueCatalogPageSkeleton } from '@/components/VenueCatalogSkeletons';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import {
  mapVenueCatalogFeedPage,
  venueCatalogDefaultQueryKey,
  VENUE_CATALOG_PAGE_SIZE,
} from '@/lib/venue-catalog-feed';
import { evaluateVenueIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { venueHref } from '@/lib/routes';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { getCachedVenuesCatalog } from '@/server/cached-public-surfaces';
import { getCachedPublicVenueDto } from '@/server/cached-venue-data';
import { fetchVenueAdmissionProducts } from '@/server/finance-projection-client';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { buildVenuePageJsonLd } from '@/lib/structured-data';
import { resolveVenueSeoTitle } from '@/lib/venue-seo';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import type { PublicVenuePageDto } from '@daibilet/contracts/public';
import { fetchPublicApiJson } from '@/server/public-api-client';

/** Admission must not hang venue HTML when finance is slow. */
const VENUE_ADMISSION_TIMEOUT_MS = 2500;
/** Catalog list soft budget; empty fallback must not be cacheable (nginx 30m HIT). */
const VENUE_LIST_TIMEOUT_MS = 4000;

const EMPTY_ADMISSION: FinanceAdmissionListResult = {
  items: [],
  summary: { published: 0, canSell: 0 },
  total: 0,
};

const EMPTY_FEED = mapVenueCatalogFeedPage({
  generatedAt: new Date(0).toISOString(),
  total: 0,
  venues: [],
  nextCursor: null,
  hasMore: false,
  limit: VENUE_CATALOG_PAGE_SIZE,
});

/**
 * Prefer cached DTO; on soft miss retry uncached once.
 * never cache notFound() - ISR STALE 404 can stick for stale-while-revalidate (~1y).
 */
async function loadVenueDtoOrNull(slug: string): Promise<PublicVenuePageDto | null> {
  const key = String(slug || '').trim();
  if (!key) return null;
  const cached = await getCachedPublicVenueDto(key);
  if (cached?.venue) return cached;
  try {
    const fresh = await fetchPublicApiJson<PublicVenuePageDto | null>(
      `/api/public/venues/${encodeURIComponent(key)}`,
      { timeoutMs: 5_000, notFoundAsNull: true },
    );
    return fresh?.venue ? fresh : null;
  } catch {
    return null;
  }
}

type PageProps = {
  params: Promise<{ slug: string }>;
  family: 'institution' | 'location';
  listPath: '/venues' | '/locations';
};

export async function generateVenueListMetadata(
  title: string,
  description: string,
  listPath: '/venues' | '/locations' = '/venues',
): Promise<Metadata> {
  const cleanTitle = pageTitle(title);
  const shareTitle = `${cleanTitle} | Дайбилет`;
  return {
    title: cleanTitle,
    description,
    alternates: { canonical: listPath },
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path: listPath,
    }),
  };
}

export async function generateVenueDetailMetadata(slug: string): Promise<Metadata> {
  const payload = await loadVenueDtoOrNull(decodeURIComponent(slug));
  if (!payload?.venue) {
    noStore();
    notFound();
  }
  const venue = payload.venue;
  const heroForShare =
    resolveVenueHeroImage(venue.slug || slug, venue.heroImageUrl) || venue.heroImageUrl;
  const decision = evaluateVenueIndexability({
    events: payload.stats?.events ?? venue.events ?? 0,
    isIndexable: venue.isIndexable,
  });
  const { core: title, full: shareTitle } = resolveVenueSeoTitle(venue);
  const description =
    venue.seoDescription || venue.shortDescription || venue.description || undefined;
  const canonicalPath = venue.canonicalPath || venueHref(venue);

  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: canonicalPath },
    robots: robotsForIndexability(decision.indexable),
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path: canonicalPath,
      image: heroForShare,
    }),
  };
}

export async function VenueListPage({ family }: Pick<PageProps, 'family'>) {
  let initialPage = EMPTY_FEED;
  try {
    const payload = await withSoftTimeout(
      getCachedVenuesCatalog(family, { limit: VENUE_CATALOG_PAGE_SIZE }),
      VENUE_LIST_TIMEOUT_MS,
      {
        generatedAt: new Date(0).toISOString(),
        total: 0,
        venues: [],
        nextCursor: null,
        hasMore: false,
        limit: VENUE_CATALOG_PAGE_SIZE,
      },
      `venue-list-${family}`,
    );
    initialPage = mapVenueCatalogFeedPage(payload);
    // Soft-timeout empty HTML was poisoning nginx proxy_cache (30m HIT, 0 venues for every city).
    if (!initialPage.venues.length) {
      noStore();
      const retry = await getCachedVenuesCatalog(family, { limit: VENUE_CATALOG_PAGE_SIZE });
      initialPage = mapVenueCatalogFeedPage(retry);
      if (!initialPage.venues.length) noStore();
    }
  } catch {
    noStore();
    initialPage = EMPTY_FEED;
  }
  const initialQueryKey = venueCatalogDefaultQueryKey(family);
  return (
    <SiteLayout>
      {family === 'location' ? (
        <Suspense fallback={<VenueCatalogPageSkeleton family="location" />}>
          <LocationsCatalogView initialPage={initialPage} initialQueryKey={initialQueryKey} />
        </Suspense>
      ) : (
        <Suspense fallback={<VenueCatalogPageSkeleton family="institution" />}>
          <VenuesCatalogView initialPage={initialPage} initialQueryKey={initialQueryKey} />
        </Suspense>
      )}
    </SiteLayout>
  );
}

export async function VenueDetailPage({ slug }: { slug: string }) {
  const decodedSlug = decodeURIComponent(slug);

  // Parallel: DTO (ISR Data Cache + uncached miss retry) + finance admission (hard timeout).
  const [payloadResult, admissionResult] = await Promise.allSettled([
    loadVenueDtoOrNull(decodedSlug),
    withSoftTimeout(
      fetchVenueAdmissionProducts(decodedSlug),
      VENUE_ADMISSION_TIMEOUT_MS,
      EMPTY_ADMISSION,
      'venue-admission',
    ),
  ]);

  const payload = payloadResult.status === 'fulfilled' ? payloadResult.value : null;
  if (!payload?.venue) {
    // Do not let notFound() enter Full Route Cache as STALE 404 for ~1y.
    noStore();
    notFound();
  }

  const editorialHero = resolveVenueHeroImage(
    payload.venue.slug || decodedSlug,
    payload.venue.heroImageUrl,
  );
  if (editorialHero && editorialHero !== payload.venue.heroImageUrl) {
    payload.venue = { ...payload.venue, heroImageUrl: editorialHero };
  }

  const admission =
    admissionResult.status === 'fulfilled' ? admissionResult.value : EMPTY_ADMISSION;
  const jsonLdBlocks = buildVenuePageJsonLd(payload);

  return (
    <>
      <JsonLdScripts blocks={jsonLdBlocks} idPrefix="venue-jsonld" />
      <SiteLayout>
        <VenuePageView
          key={decodedSlug}
          slug={decodedSlug}
          initialPayload={payload}
          admissionProducts={admission.items}
        />
      </SiteLayout>
    </>
  );
}
