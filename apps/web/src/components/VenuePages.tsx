import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { LocationsCatalogView } from '@/components/LocationsCatalogView.client';
import { VenuesCatalogView } from '@/components/VenuesCatalogView.client';
import { VenuePageView } from '@/components/VenuePageView.client';
import { VenueCatalogPageSkeleton } from '@/components/VenueCatalogSkeletons';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicVenueDto } from '@daibilet/backend/public-read';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { evaluateVenueIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { venueHref } from '@/lib/routes';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { getCachedVenuesCatalog } from '@/server/cached-public-surfaces';
import { buildVenuePageJsonLd } from '@/lib/structured-data';
import { resolveVenueSeoTitle } from '@/lib/venue-seo';
import { toVenueMapMarkers } from '@/server/venue-map-data';

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
  const payload = await buildPublicVenueDto(decodeURIComponent(slug));
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
  let mapMarkers: ReturnType<typeof toVenueMapMarkers> = [];
  try {
    const payload = await getCachedVenuesCatalog(family, 500);
    const raw = payload.venues ?? [];
    venues = raw.map(toVenueCatalogCard);
    if (family === 'location') {
      mapMarkers = toVenueMapMarkers(raw);
    }
  } catch {
    venues = [];
    mapMarkers = [];
  }
  return (
    <SiteLayout>
      {family === 'location' ? (
        <Suspense fallback={<VenueCatalogPageSkeleton family="location" />}>
          <LocationsCatalogView venues={venues} mapMarkers={mapMarkers} />
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
  const payload = await buildPublicVenueDto(decodeURIComponent(slug));
  if (!payload?.venue) notFound();

  const jsonLdBlocks = buildVenuePageJsonLd(payload);

  return (
    <SiteLayout>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`venue-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <VenuePageView slug={decodeURIComponent(slug)} initialPayload={payload} />
    </SiteLayout>
  );
}
