import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import { cityPlacesCatalogHref } from '@/lib/catalog-url';
import { matchDestination } from '@/lib/selected-city';
import { INDEX_FOLLOW_ROBOTS } from '@/lib/seo-meta';
import { cityHref, venueHref } from '@/lib/routes';
import { mapVenueCatalogFeedPage, VENUE_CATALOG_PAGE_SIZE } from '@/lib/venue-catalog-feed';
import { getCachedDestinations, getCachedVenuesCatalog } from '@/server/cached-public-surfaces';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

async function resolveCity(raw: string) {
  const { destinations } = await getCachedDestinations();
  const city = matchDestination(destinations, decodeURIComponent(raw));
  if (!city || city.type !== 'city') notFound();
  return city;
}

function readPage(value?: string | string[]) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 1000) : 1;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const city = await resolveCity((await params).city);
  const page = readPage((await searchParams).page);
  const path = cityPlacesCatalogHref(city.slug || city.sourceSlug || '', page);
  return {
    title: `Места и площадки: ${city.name}${page > 1 ? ` — страница ${page}` : ''}`,
    description: `Музеи, театры, причалы и другие места в городе ${city.name}. Полный список площадок и локаций с переходом на страницы мест.`,
    alternates: { canonical: `https://daibilet.ru${path}` },
    robots: INDEX_FOLLOW_ROBOTS,
  };
}

export default async function CityPlacesPage({ params, searchParams }: PageProps) {
  const city = await resolveCity((await params).city);
  const citySlug = city.slug || city.sourceSlug || '';
  const pageNumber = readPage((await searchParams).page);
  const path = cityPlacesCatalogHref(citySlug, pageNumber);
  const raw = await getCachedVenuesCatalog('all', {
    city: citySlug,
    page: pageNumber,
    limit: VENUE_CATALOG_PAGE_SIZE,
    counts: false,
  });
  const page = mapVenueCatalogFeedPage(raw);
  const lastPage = Math.max(1, Math.ceil(page.total / page.limit));
  if (pageNumber > lastPage) notFound();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://daibilet.ru/' },
        { '@type': 'ListItem', position: 2, name: city.name, item: `https://daibilet.ru${cityHref(city)}` },
        { '@type': 'ListItem', position: 3, name: 'Места и площадки', item: `https://daibilet.ru${path}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Места и площадки: ${city.name}`,
      url: `https://daibilet.ru${path}`,
      numberOfItems: page.venues.length,
      itemListElement: page.venues.map((venue, index) => ({
        '@type': 'ListItem',
        position: (pageNumber - 1) * page.limit + index + 1,
        item: {
          '@type': 'Place',
          name: venue.name,
          url: `https://daibilet.ru${venueHref(venue)}`,
          address: venue.address ? {
            '@type': 'PostalAddress',
            addressLocality: city.name,
            streetAddress: venue.address,
            addressCountry: 'RU',
          } : undefined,
        },
      })),
    },
  ];

  return (
    <>
      <JsonLdScripts blocks={jsonLd} idPrefix="city-places-jsonld" />
      <SiteLayout>
        <main className="container-page py-10" data-city-places-catalog>
          <nav aria-label="Хлебные крошки" className="text-sm text-slate-600">
            <Link href="/">Главная</Link> → <Link href={cityHref(city)}>{city.name}</Link> → Места
          </nav>
          <h1 className="mt-5 font-display text-3xl font-bold text-slate-950">Места и площадки: {city.name}</h1>
          <p className="mt-2 text-slate-600">Показано {page.venues.length} из {page.total} мест{pageNumber > 1 ? ` · страница ${pageNumber}` : ''}.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.venues.map((venue) => (
              <li key={venue.id}>
                <Link href={venueHref(venue)} className="block h-full rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
                  <h2 className="font-semibold text-slate-950">{venue.name}</h2>
                  {venue.address ? <p className="mt-2 text-sm text-slate-600">{venue.address}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
          <nav aria-label="Страницы мест" className="mt-8 flex items-center justify-between text-sm font-semibold text-primary-700">
            {pageNumber > 1 ? <Link href={cityPlacesCatalogHref(citySlug, pageNumber - 1)}>← Предыдущая</Link> : <span />}
            {pageNumber < lastPage ? <Link href={cityPlacesCatalogHref(citySlug, pageNumber + 1)}>Следующая →</Link> : <span />}
          </nav>
        </main>
      </SiteLayout>
    </>
  );
}
