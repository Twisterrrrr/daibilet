import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';

import { LocationsCatalogView } from '@/components/LocationsCatalogView.client';
import { VenuesCatalogView } from '@/components/VenuesCatalogView.client';
import { VenuePageView } from '@/components/VenuePageView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicVenueDto, buildPublicVenuesDto } from '@daibilet/backend/public-read';
import { evaluateVenueIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { venueHref } from '@/lib/routes';
import { buildVenuePageJsonLd } from '@/lib/structured-data';

type PageProps = {
  params: Promise<{ slug: string }>;
  family: 'institution' | 'location';
  listPath: '/venues' | '/locations';
};

export async function generateVenueListMetadata(title: string, description: string): Promise<Metadata> {
  return { title, description };
}

export async function generateVenueDetailMetadata(slug: string): Promise<Metadata> {
  const payload = await buildPublicVenueDto(decodeURIComponent(slug));
  if (!payload?.venue) return { title: 'Площадка не найдена | Дайбилет' };
  const venue = payload.venue;
  const decision = evaluateVenueIndexability({
    events: payload.stats?.events ?? venue.events ?? 0,
    isIndexable: venue.isIndexable,
  });
  return {
    title: venue.seoTitle || `${venue.title || venue.name} | Дайбилет`,
    description: venue.seoDescription || venue.shortDescription || venue.description || undefined,
    alternates: { canonical: venue.canonicalPath || venueHref(venue) },
    robots: robotsForIndexability(decision.indexable),
    openGraph: {
      title: venue.seoTitle || venue.title || venue.name,
      description: venue.seoDescription || undefined,
      images: venue.heroImageUrl ? [{ url: venue.heroImageUrl }] : undefined,
    },
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
  const breadcrumbLabel = family === 'location' ? 'Локации' : 'Площадки';

  return (
    <SiteLayout>
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex items-center gap-1.5 py-3 text-sm text-slate-500">
          <Link href="/" className="hover:text-primary-600">
            Главная
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">{breadcrumbLabel}</span>
        </div>
      </div>
      {family === 'location' ? (
        <LocationsCatalogView venues={venues} />
      ) : (
        <VenuesCatalogView venues={venues} />
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
