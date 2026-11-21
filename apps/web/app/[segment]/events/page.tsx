import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { EventsCatalogHero } from '@/components/EventsCatalogHero.client';
import {
  EventsCatalogSsrFallback,
  EventsCatalogSsrHero,
  selectEventsCatalogSsrItems,
} from '@/components/EventsCatalogSsrFallback';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import { canonicalCitySlug, cityLookupSlug } from '@/lib/routes';
import { buildShareMetadata, eventsCityDescriptionFallback, pageTitle } from '@/lib/seo-meta';
import { cityToPrepositional } from '@/lib/city-declension';
import { evaluateCityIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { buildBreadcrumbListJsonLd, buildEventsCatalogItemListJsonLd } from '@/lib/structured-data';
import { isCityFirstLegacyRouteSlug } from '@/lib/city-first-route-slugs';
import { isCityFirstUrlMode } from '@/lib/routes';
import { loadCityDto } from '@/server/cached-city-data';
import { catalogQueryCacheKey, parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';
import '@/lib/env';

export const revalidate = 300;

type PageProps = { params: Promise<{ segment: string }> };

async function resolveCity(segment: string) {
  if (!isCityFirstUrlMode() || !isCityFirstLegacyRouteSlug(segment)) notFound();
  const apiSlug = cityLookupSlug(segment);
  const loaded = await loadCityDto(apiSlug);
  if (loaded.kind === 'miss') notFound();
  if (loaded.kind === 'unavailable') return { apiSlug, city: null };
  if (loaded.payload.city.type !== 'city') notFound();
  // The API's public event filter expects its stored destination slug
  // (e.g. `moskva`), which can differ from the city-first URL (`moscow`).
  return { apiSlug: loaded.payload.city.slug || apiSlug, city: loaded.payload.city };
}

function cityEventsMetadata(city: Awaited<ReturnType<typeof resolveCity>>['city'], segment: string): Metadata {
  const cityName = city?.name || segment.replace(/-/g, ' ');
  const cityPrep = cityToPrepositional(cityName);
  const path = `/${canonicalCitySlug(segment)}/events`;
  const title = `Афиша событий в ${cityPrep} - билеты онлайн`;
  const description = eventsCityDescriptionFallback(cityPrep);
  const indexable = city
    ? city.pdp
      ? city.pdp.isIndexable
      : evaluateCityIndexability({
          events: city.events,
          slug: city.slug,
          sourceSlug: city.sourceSlug,
          isIndexable: city.isIndexable,
        }).indexable
    : false;

  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: path },
    robots: robotsForIndexability(indexable),
    ...buildShareMetadata({ title, description, path }),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment } = await params;
  const { apiSlug, city } = await resolveCity(segment);
  const pageQuery = parseCatalogPageQuery({ city: apiSlug });
  let hasEvents = false;
  try {
    hasEvents = (await getCachedCatalog(pageQuery)).total > 0;
  } catch {
    // A temporary catalog API failure must not make the city URL look indexable.
  }
  const metadata = cityEventsMetadata(city, segment);
  if (!hasEvents) metadata.robots = robotsForIndexability(false);
  return metadata;
}

export default async function CityEventsPage({ params }: PageProps) {
  const { segment } = await params;
  const { apiSlug, city } = await resolveCity(segment);
  const pageQuery = parseCatalogPageQuery({ city: apiSlug });
  let initialCatalog: Awaited<ReturnType<typeof getCachedCatalog>> | null = null;

  try {
    initialCatalog = await getCachedCatalog(pageQuery);
  } catch {
    initialCatalog = null;
  }

  const cityName = city?.name || segment.replace(/-/g, ' ');
  const path = `/${canonicalCitySlug(segment)}/events`;
  const itemList = initialCatalog
    ? buildEventsCatalogItemListJsonLd(selectEventsCatalogSsrItems(initialCatalog.items), `Афиша событий в ${cityName}`, path)
    : null;
  const jsonLd = [
    buildBreadcrumbListJsonLd([
      { name: 'Главная', path: '/' },
      { name: cityName, path: `/${canonicalCitySlug(segment)}` },
      { name: 'Афиша событий', path },
    ]),
    ...(itemList ? [itemList] : []),
  ];

  return (
    <>
      <JsonLdScripts blocks={jsonLd} idPrefix="city-events-catalog-jsonld" />
      <SiteLayout>
        <Suspense fallback={<EventsCatalogSsrHero cityName={cityName} />}>
          <EventsCatalogHero cityNameOverride={cityName} basePath={path} />
        </Suspense>
        <div className="container-page pt-2 pb-5 sm:py-6 lg:py-8">
          <Suspense fallback={<EventsCatalogSsrFallback catalog={initialCatalog} basePath={path} />}>
            <CatalogShell
              initialCatalog={initialCatalog}
              initialQueryKey={catalogQueryCacheKey(pageQuery)}
              routeCity={apiSlug}
              basePath={path}
            />
          </Suspense>
        </div>
      </SiteLayout>
    </>
  );
}
