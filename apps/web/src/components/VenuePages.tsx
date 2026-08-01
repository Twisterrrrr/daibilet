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
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { toVenueCatalogCard } from '@/lib/venue-catalog-card';
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

/** Admission must not hang venue HTML when finance is slow. */
const VENUE_ADMISSION_TIMEOUT_MS = 2500;
/** Catalog list soft budget; empty fallback must not be cacheable (nginx 30m HIT). */
const VENUE_LIST_TIMEOUT_MS = 4000;

const EMPTY_ADMISSION: FinanceAdmissionListResult = {
  items: [],
  summary: { published: 0, canSell: 0 },
  total: 0,
};

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
  const payload = await getCachedPublicVenueDto(decodeURIComponent(slug));
  if (!payload?.venue) return { title: 'Площадка не найдена' };
  const venue = payload.venue;
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
      image: venue.heroImageUrl,
    }),
  };
}

export async function VenueListPage({ family }: Pick<PageProps, 'family'>) {
  let venues: VenueCatalogCard[] = [];
  try {
    const payload = await withSoftTimeout(
      getCachedVenuesCatalog(family, 500),
      VENUE_LIST_TIMEOUT_MS,
      { generatedAt: new Date(0).toISOString(), total: 0, venues: [] },
      `venue-list-${family}`,
    );
    venues = (payload.venues ?? []).map(toVenueCatalogCard);
    // Soft-timeout empty HTML was poisoning nginx proxy_cache (30m HIT, 0 venues for every city).
    if (!venues.length) {
      noStore();
      const retry = await getCachedVenuesCatalog(family, 500);
      venues = (retry.venues ?? []).map(toVenueCatalogCard);
      if (!venues.length) noStore();
    }
  } catch {
    noStore();
    venues = [];
  }
  return (
    <SiteLayout>
      {family === 'location' ? (
        <Suspense fallback={<VenueCatalogPageSkeleton family="location" />}>
          <LocationsCatalogView venues={venues} />
        </Suspense>
      ) : (
        <Suspense fallback={<VenueCatalogPageSkeleton family="institution" />}>
          <VenuesCatalogView venues={venues} />
        </Suspense>
      )}
    </SiteLayout>
  );
}

export async function VenueDetailPage({ slug }: { slug: string }) {
  const decodedSlug = decodeURIComponent(slug);

  // Parallel: DTO (ISR Data Cache) + finance admission (hard timeout, fail-soft).
  // Finance keyed by URL slug - same join key as catalog Venue.slug.
  const [payloadResult, admissionResult] = await Promise.allSettled([
    getCachedPublicVenueDto(decodedSlug),
    withSoftTimeout(
      fetchVenueAdmissionProducts(decodedSlug),
      VENUE_ADMISSION_TIMEOUT_MS,
      EMPTY_ADMISSION,
      'venue-admission',
    ),
  ]);

  const payload = payloadResult.status === 'fulfilled' ? payloadResult.value : null;
  if (!payload?.venue) notFound();

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
