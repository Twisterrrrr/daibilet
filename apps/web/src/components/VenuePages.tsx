import type { Metadata } from 'next';
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
import { evaluateVenueIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { venueHref } from '@/lib/routes';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { getCachedVenuesCatalog } from '@/server/cached-public-surfaces';
import { getCachedPublicVenueDto } from '@/server/cached-venue-data';
import { fetchVenueAdmissionProducts } from '@/server/finance-projection-client';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import { buildVenuePageJsonLd } from '@/lib/structured-data';
import { resolveVenueSeoTitle } from '@/lib/venue-seo';

/** Admission must not hang venue HTML when finance is slow. */
const VENUE_ADMISSION_TIMEOUT_MS = 2500;

const EMPTY_ADMISSION: FinanceAdmissionListResult = {
  items: [],
  summary: { published: 0, canSell: 0 },
  total: 0,
};

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type PageProps = {
  params: Promise<{ slug: string }>;
  family: 'institution' | 'location';
  listPath: '/venues' | '/locations';
};

function toVenueCatalogCard(venue: {
  id: string;
  slug?: string | null;
  name: string;
  city: string;
  address?: string | null;
  type: string;
  events: number;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  nextSlot?: string | null;
}): VenueCatalogCard {
  return {
    id: venue.id,
    slug: String(venue.slug || venue.id),
    name: venue.name,
    city: venue.city,
    address: venue.address ?? null,
    type: venue.type,
    events: venue.events || 0,
    shortDescription: venue.shortDescription ?? null,
    heroImageUrl: venue.heroImageUrl ?? null,
    nextSlot: venue.nextSlot ?? null,
  };
}

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
    const payload = await getCachedVenuesCatalog(family, 500);
    venues = (payload.venues ?? []).map(toVenueCatalogCard);
  } catch {
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
    withTimeout(
      fetchVenueAdmissionProducts(decodedSlug),
      VENUE_ADMISSION_TIMEOUT_MS,
      EMPTY_ADMISSION,
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
          slug={decodedSlug}
          initialPayload={payload}
          admissionProducts={admission.items}
        />
      </SiteLayout>
    </>
  );
}
