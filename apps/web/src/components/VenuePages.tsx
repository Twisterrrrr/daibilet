import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EventCard } from '@/components/EventCard';
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

  const { venue, sessions, stats, relatedVenues } = payload;
  const template = venuePageTemplate(venue.type);
  const listPath = venueCatalogHref(template);
  const listLabel = template === 'location' ? 'Локации' : 'Площадки';
  const citySlug = sessions[0]?.citySlug || null;
  const cityQuery = citySlug ? `?city=${encodeURIComponent(citySlug)}` : '';

  return (
    <SiteLayout>
      <PageBreadcrumbBar
        items={[
          { label: 'Главная', href: '/' },
          { label: listLabel, href: listPath },
          { label: venue.title || venue.name },
        ]}
      />
      <article className="container-page py-8">
        <h1 className="text-3xl font-extrabold text-slate-900">{venue.seoH1 || venue.title || venue.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {citySlug || venue.city ? (
            <Link href={cityHref({ slug: citySlug || undefined, name: venue.city })} className="hover:text-primary">
              {venue.city}
            </Link>
          ) : (
            venue.city
          )}
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

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/events${cityQuery}`}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/90"
          >
            Все события {venue.city ? `в ${venue.city}` : ''}
          </Link>
          {citySlug || venue.city ? (
            <Link
              href={cityHref({ slug: citySlug || undefined, name: venue.city })}
              className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 font-semibold text-slate-700 hover:border-primary/30"
            >
              Афиша города
            </Link>
          ) : null}
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.slice(0, 100).map((session) => (
            <li key={`${session.id}-${session.startsAt}`}>
              <EventCard session={session} />
            </li>
          ))}
        </ul>

        {relatedVenues.length ? (
          <section className="mt-12 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-bold text-slate-900">Похожие площадки</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedVenues.slice(0, 6).map((related) => (
                <li key={related.id}>
                  <Link href={venueHref(related)} className="card-link block p-4">
                    <h3 className="font-semibold text-slate-900">{related.title || related.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{pluralEvents(related.events)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </SiteLayout>
  );
}
