import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { EventsCatalogHero } from '@/components/EventsCatalogHero.client';
import {
  EventsCatalogSsrFallback,
  EventsCatalogSsrHero,
  selectEventsCatalogSsrItems,
} from '@/components/EventsCatalogSsrFallback';
import { EventsCityGate } from '@/components/EventsCityGate.client';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import { catalogCityQueryValue, matchDestination } from '@/lib/selected-city';
import { buildEventsCatalogMetadata } from '@/lib/seo-events-catalog-meta';
import { leanCatalogForSsr } from '@/lib/ssr-lean-payloads';
import {
  buildBreadcrumbListJsonLd,
  buildEventsCatalogItemListJsonLd,
} from '@/lib/structured-data';
import { catalogQueryCacheKey, parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

export const revalidate = 300;

type PageProps = { params: Promise<{ city: string }> };

async function resolveCity(rawCity: string) {
  const payload = await getCachedDestinations();
  const destination = matchDestination(payload.destinations || [], rawCity);
  if (!destination || destination.type !== 'city') return null;

  return {
    name: destination.name,
    apiCity: catalogCityQueryValue(payload.destinations, rawCity),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: rawCity } = await params;
  const city = rawCity.toLowerCase() === 'all' ? null : await resolveCity(rawCity);
  return {
    ...buildEventsCatalogMetadata(city ? { city: city.name } : {}),
    robots: { index: false, follow: true },
  };
}

/**
 * Internal city-keyed ISR route. `next.config.ts` rewrites the public
 * `/events?city=...` URL here, so the city and its first page are known to SSR.
 */
export default async function EventsCityCatalogPage({ params }: PageProps) {
  const { city: rawCity } = await params;
  const city = rawCity.toLowerCase() === 'all' ? null : await resolveCity(rawCity);

  if (!city) {
    return (
      <SiteLayout>
        <EventsCityGate />
      </SiteLayout>
    );
  }

  const pageQuery = parseCatalogPageQuery({ city: city.apiCity });
  let initialCatalog: Awaited<ReturnType<typeof getCachedCatalog>> | null = null;
  try {
    initialCatalog = leanCatalogForSsr(await getCachedCatalog(pageQuery));
  } catch {
    initialCatalog = null;
  }

  const canonical = '/events';
  const itemList = initialCatalog
    ? buildEventsCatalogItemListJsonLd(
        selectEventsCatalogSsrItems(initialCatalog.items),
        `Афиша событий в ${city.name}`,
        canonical,
      )
    : null;
  const jsonLd = [
    buildBreadcrumbListJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Афиша событий', path: canonical },
    ]),
    ...(itemList ? [itemList] : []),
  ];
  const initialQueryKey = catalogQueryCacheKey(pageQuery);

  return (
    <>
      <JsonLdScripts blocks={jsonLd} idPrefix="city-events-catalog-jsonld" />
      <SiteLayout initialCity={city.name}>
        <Suspense fallback={<EventsCatalogSsrHero cityName={city.name} />}>
          <EventsCatalogHero />
        </Suspense>
        <div className="container-page pt-2 pb-5 sm:py-6 lg:py-8">
          <Suspense
            fallback={
              <EventsCatalogSsrFallback
                catalog={initialCatalog}
                cityName={city.name}
                cityQuery={city.apiCity}
              />
            }
          >
            <CatalogShell
              initialCatalog={initialCatalog}
              initialQueryKey={initialQueryKey}
            />
          </Suspense>
        </div>
      </SiteLayout>
    </>
  );
}
