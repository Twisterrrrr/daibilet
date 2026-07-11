import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { VenuePageView } from '@/components/VenuePageView.client';
import { PageBreadcrumbBar, SectionPageHero } from '@/components/PageBreadcrumbs';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { buildPublicVenueDto, buildPublicVenuesDto } from '@daibilet/backend/public-read';
import { cityHref, venueCatalogHref, venueHref } from '@/lib/routes';
import { venuePageTemplate } from '@/lib/venue-meta';

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
  return {
    title: venue.seoTitle || `${venue.title || venue.name} | Дайбилет`,
    description: venue.seoDescription || venue.shortDescription || venue.description || undefined,
    alternates: { canonical: venue.canonicalPath || venueHref(venue) },
    openGraph: {
      title: venue.seoTitle || venue.title || venue.name,
      description: venue.seoDescription || undefined,
      images: venue.heroImageUrl ? [{ url: venue.heroImageUrl }] : undefined,
    },
  };
}

export async function VenueListPage({ family, listPath }: Pick<PageProps, 'family' | 'listPath'>) {
  const params = new URLSearchParams({ family, limit: '500' });
  const payload = await buildPublicVenuesDto(params);
  const title = family === 'location' ? 'Причалы и локации' : 'Площадки и музеи';
  const description =
    family === 'location'
      ? 'Причалы, локации и точки отправления речных прогулок и экскурсий.'
      : 'Музеи, театры, выставочные залы и другие площадки с афишей событий.';
  const alternatePath = listPath === '/venues' ? '/locations' : '/venues';
  const alternateLabel = listPath === '/venues' ? 'Причалы и локации' : 'Площадки и музеи';

  return (
    <SiteLayout>
      <SectionPageHero
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: title },
        ]}
        gradientClass="from-primary-800 via-primary-700 to-slate-900"
        title={title}
        description={description}
      />
      <div className="container-page py-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {payload.venues.map((venue) => (
            <li key={venue.id}>
              <Link href={venueHref(venue)} className="card-link block p-4">
                <h2 className="text-lg font-semibold text-slate-900">{venue.title || venue.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {venue.city} · {pluralEvents(venue.events)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href={alternatePath} className="font-medium text-primary hover:underline">
            {alternateLabel}
          </Link>
          <Link href="/cities" className="font-medium text-primary hover:underline">
            Все города
          </Link>
          <Link href="/events" className="font-medium text-primary hover:underline">
            Афиша событий
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}

export async function VenueDetailPage({ slug }: { slug: string }) {
  const payload = await buildPublicVenueDto(decodeURIComponent(slug));
  if (!payload?.venue) notFound();

  return (
    <SiteLayout>
      <VenuePageView slug={decodeURIComponent(slug)} initialPayload={payload} />
    </SiteLayout>
  );
}
