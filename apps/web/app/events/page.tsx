import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { EventsCatalogHero } from '@/components/EventsCatalogHero.client';
import { SiteLayout } from '@/components/SiteLayout';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { catalogQueryCacheKey, parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';

const EVENTS_TITLE = 'Афиша событий - экскурсии и билеты';
const EVENTS_DESCRIPTION =
  'Афиша событий Дайбилет: фильтры по городу, дате и формату. Официальные билеты у организатора.';
const EVENTS_SUPPORT =
  'Официальные билеты на экскурсии, концерты и музеи - оплата в виджете организатора.';

export const metadata: Metadata = {
  title: pageTitle(EVENTS_TITLE),
  description: EVENTS_DESCRIPTION,
  alternates: { canonical: '/events' },
  ...buildShareMetadata({
    title: `${EVENTS_TITLE} | Дайбилет`,
    description: EVENTS_DESCRIPTION,
    path: '/events',
  }),
};

export const revalidate = 300;

/**
 * Do not await searchParams here - it forces dynamic no-store and kills ISR/CDN HIT.
 * Default empty catalog is SSR'd; CatalogShell reads URL and refetches client-side.
 */
export default async function EventsCatalogPage() {
  const pageQuery = parseCatalogPageQuery({});
  let initialCatalog: Awaited<ReturnType<typeof getCachedCatalog>> | null = null;

  try {
    initialCatalog = await getCachedCatalog(pageQuery);
  } catch {
    initialCatalog = null;
  }

  const initialQueryKey = catalogQueryCacheKey(pageQuery);

  return (
    <SiteLayout>
      <Suspense
        fallback={
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="container-page space-y-4 py-8 sm:py-10">
              <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-slate-200" />
              <div className="h-5 w-full max-w-xl animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" />
              <p className="sr-only">{EVENTS_SUPPORT}</p>
            </div>
          </div>
        }
      >
        <EventsCatalogHero />
      </Suspense>
      <div className="container-page py-8">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          }
        >
          <CatalogShell initialCatalog={initialCatalog} initialQueryKey={initialQueryKey} />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
