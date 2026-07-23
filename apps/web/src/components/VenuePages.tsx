import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { LocationsCatalogView } from '@/components/LocationsCatalogView.client';
import { VenuesCatalogView } from '@/components/VenuesCatalogView.client';
import { VenuePageView } from '@/components/VenuePageView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicVenueDto, buildPublicVenuesDto } from '@daibilet/backend/public-read';
import { evaluateVenueIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { venueHref } from '@/lib/routes';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { buildVenuePageJsonLd } from '@/lib/structured-data';
import { resolveVenueSeoTitle } from '@/lib/venue-seo';

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
  const params = new URLSearchParams({ family, limit: '500' });
  let venues: Awaited<ReturnType<typeof buildPublicVenuesDto>>['venues'] = [];
  try {
    const payload = await buildPublicVenuesDto(params);
    venues = payload.venues ?? [];
  } catch {
    venues = [];
  }
  return (
    <SiteLayout>
      {family === 'location' ? (
        <Suspense fallback={<div className="container-page py-10 text-sm text-slate-500">Загрузка локаций…</div>}>
          <LocationsCatalogView venues={venues} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="container-page py-10 text-sm text-slate-500">Загрузка площадок…</div>}>
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
