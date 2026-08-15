import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { EventsCatalogHero } from '@/components/EventsCatalogHero.client';
import { SiteLayout } from '@/components/SiteLayout';
import { buildEventsCatalogMetadata } from '@/lib/seo-events-catalog-meta';
import { catalogQueryCacheKey, parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';

const EVENTS_SUPPORT =
  'Официальные билеты на экскурсии, концерты и музеи более чем в 100 городах России.';

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
    initialCatalog = await getCachedCatalog(pageQuery);
  } catch {
    initialCatalog = null;
  }

  const initialQueryKey = catalogQueryCacheKey(pageQuery);

  return (
    <SiteLayout>
      <Suspense
        fallback={
          <div className="border-b border-slate-100 bg-white">
            <div className="container-page py-3 sm:py-5">
              <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-7 w-2/3 max-w-md animate-pulse rounded bg-slate-200 sm:h-8" />
                  <div className="h-3.5 w-1/2 max-w-sm animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-9 w-full max-w-md animate-pulse rounded-full bg-slate-100 md:w-80" />
              </div>
              <p className="sr-only">{EVENTS_SUPPORT}</p>
            </div>
          </div>
        }
      >
        <EventsCatalogHero />
      </Suspense>
      {/* Mobile: minimal gap hero → search; keep air on sm+. */}
      <div className="container-page pt-2 pb-5 sm:py-6 lg:py-8">
        <Suspense
          fallback={
            <div className="space-y-5">
              <div className="h-11 w-full animate-pulse rounded-xl bg-surface-muted" />
              <div className="h-8 w-full max-w-xl animate-pulse rounded-xl bg-surface-muted" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="aspect-[16/10] animate-pulse bg-slate-200/80" />
                    <div className="space-y-3 p-4">
                      <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200/80" />
                      <div className="h-4 w-[85%] animate-pulse rounded bg-slate-200/70" />
                      <div className="flex items-center justify-between pt-2">
                        <div className="h-5 w-20 animate-pulse rounded bg-slate-200/80" />
                        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200/80" />
                      </div>
                    </div>
                  </div>
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
