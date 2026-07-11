import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { buildPublicVenueDto, buildPublicVenuesDto } from '@daibilet/backend/public-read';
import { venueHref } from '@/lib/routes';

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

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <p className="mt-6 text-sm text-slate-500">
          <Link href={listPath === '/venues' ? '/locations' : '/venues'} className="text-primary hover:underline">
            {listPath === '/venues' ? 'Смотреть причалы и локации' : 'Смотреть площадки и музеи'}
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}

export async function VenueDetailPage({ slug }: { slug: string }) {
  const payload = await buildPublicVenueDto(decodeURIComponent(slug));
  if (!payload?.venue) notFound();

  const { venue, sessions, stats } = payload;

  return (
    <SiteLayout>
      <article className="container-page py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">{venue.seoH1 || venue.title || venue.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {venue.city}
          {venue.address ? ` · ${venue.address}` : ''}
        </p>
        {venue.description || venue.shortDescription ? (
          <p className="mt-6 max-w-3xl whitespace-pre-wrap text-base leading-7 text-slate-700">
            {venue.description || venue.shortDescription}
          </p>
        ) : null}
        <p className="mt-4 text-sm font-semibold text-slate-900">
          {pluralEvents(stats.events)}
          {stats.priceFrom ? ` · ${formatPriceFrom(stats.priceFrom)}` : ''}
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.slice(0, 100).map((session) => (
            <li key={`${session.id}-${session.startsAt}`}>
              <EventCard session={session} />
            </li>
          ))}
        </ul>
      </article>
    </SiteLayout>
  );
}
