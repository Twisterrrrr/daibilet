import type { Metadata } from 'next';
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
import { buildEventsCatalogMetadata } from '@/lib/seo-events-catalog-meta';
import { leanCatalogForSsr } from '@/lib/ssr-lean-payloads';
import {
  buildBreadcrumbListJsonLd,
  buildEventsCatalogItemListJsonLd,
} from '@/lib/structured-data';
import { catalogQueryCacheKey, parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';

/**
 * PERF.L4: do not await searchParams in metadata - forces private, no-store on `/events`.
 * Filtered titles stay client/UX-only; canonical SEO is unfiltered `/events`.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildEventsCatalogMetadata({});
}

export const revalidate = 300;

/**
 * Do not await searchParams here - filtered catalog SSR was killing ISR/CDN HIT.
 * Default empty catalog is SSR'd; CatalogShell reads URL and refetches client-side.
 */
export default async function EventsCatalogPage() {
  const pageQuery = parseCatalogPageQuery({});
  let initialCatalog: Awaited<ReturnType<typeof getCachedCatalog>> | null = null;

  try {
    const raw = await getCachedCatalog(pageQuery);
    // Strip list blurbs / cap facets before they enter the CatalogShell client flight.
    initialCatalog = leanCatalogForSsr(raw);
  } catch {
    initialCatalog = null;
  }

  const initialQueryKey = catalogQueryCacheKey(pageQuery);
  const itemList = initialCatalog
    ? buildEventsCatalogItemListJsonLd(selectEventsCatalogSsrItems(initialCatalog.items))
    : null;
  const jsonLd = [
    buildBreadcrumbListJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Афиша', path: '/events' },
    ]),
    ...(itemList ? [itemList] : []),
  ];

  return (
    <>
      <JsonLdScripts blocks={jsonLd} idPrefix="events-catalog-jsonld" />
      <SiteLayout>
      <Suspense
        fallback={<EventsCatalogSsrHero />}
      >
        <EventsCatalogHero />
      </Suspense>
      {/* Mobile: minimal gap hero → search; keep air on sm+. */}
      <div className="container-page pt-2 pb-5 sm:py-6 lg:py-8">
        <Suspense
          fallback={<EventsCatalogSsrFallback catalog={initialCatalog} />}
        >
          <CatalogShell initialCatalog={initialCatalog} initialQueryKey={initialQueryKey} />
        </Suspense>
      </div>
      </SiteLayout>
    </>
  );
}
