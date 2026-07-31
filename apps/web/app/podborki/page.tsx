import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LandingsCatalogView } from '@/components/LandingsCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { type PodborkiCatalogItem } from '@/lib/podborki-categories';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import {
  getCachedDestinations,
  getCachedLandingsCatalog,
  getCachedPodborkiMeta,
} from '@/server/cached-public-surfaces';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const title = pageTitle('Подборки - тематические коллекции событий');
  const description =
    'Готовые подборки на вечер, выходные и бюджет: по типу событий, для кого и сезонные программы.';
  return {
    title,
    description,
    alternates: { canonical: '/podborki' },
    ...buildShareMetadata({
      title: `${title} | Дайбилет`,
      description,
      path: '/podborki',
    }),
  };
}

/**
 * Do not await searchParams - forces dynamic no-store.
 * SSR always city=all (ISR 600s); LandingsCatalogView refetches
 * `/api/public/landings-catalog?city=` when a city is selected and merges city-bound cards.
 */
export default async function PodborkiCatalogPage() {
  const [catalog, destinationsPayload, meta] = await Promise.all([
    getCachedLandingsCatalog('all'),
    getCachedDestinations(),
    getCachedPodborkiMeta(),
  ]);

  const items: PodborkiCatalogItem[] = (catalog.items ?? []).map((item) => ({
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    events: item.events,
    priceFrom: item.priceFrom,
    layoutVariant: meta.layoutBySlug[item.slug] ?? null,
    categorySlug: meta.categoryBySlug[item.slug] ?? null,
  }));

  const totalEvents = destinationsPayload.destinations.reduce(
    (sum, destination) => sum + (destination.events || 0),
    0,
  );

  return (
    <SiteLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Suspense
          fallback={
            <div aria-busy="true" aria-label="Загрузка подборок">
              <div className="border-b border-slate-100 bg-white">
                <div className="container-page space-y-4 py-10 sm:py-14">
                  <div className="h-8 w-2/3 max-w-md animate-pulse rounded-lg bg-slate-200/90" />
                  <div className="h-4 w-1/2 max-w-sm animate-pulse rounded bg-slate-200/70" />
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="h-9 w-24 animate-pulse rounded-full bg-slate-200/80" />
                    <span className="h-9 w-28 animate-pulse rounded-full bg-slate-200/60" />
                    <span className="h-9 w-20 animate-pulse rounded-full bg-slate-200/60" />
                  </div>
                </div>
              </div>
              <div className="container-page py-10">
                <div className="h-6 w-40 animate-pulse rounded bg-slate-200/80" />
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200/70" />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <LandingsCatalogView
            items={items}
            city="all"
            cities={destinationsPayload.destinations}
            categories={meta.categories}
            totalEvents={totalEvents}
          />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
