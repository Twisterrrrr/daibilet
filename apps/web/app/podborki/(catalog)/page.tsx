import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LandingsCatalogView } from '@/components/LandingsCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { PODBORKI_CATEGORIES, type PodborkiCatalogItem } from '@/lib/podborki-categories';
import { resolvePodborkiCatalogSeo } from '@/lib/podborki-city-seo';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import {
  getCachedDestinations,
  getCachedLandingsCatalog,
  getCachedPodborkiMeta,
} from '@/server/cached-public-surfaces';

export const revalidate = 600;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const seo = resolvePodborkiCatalogSeo(firstQueryValue(params.city));
  const title = pageTitle(seo.title);
  return {
    title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    ...buildShareMetadata({
      title: `${title} | Дайбилет`,
      description: seo.description,
      path: seo.canonicalPath,
    }),
  };
}

/**
 * Catalog SSR still loads city=all landings; LandingsCatalogView refetches
 * `/api/public/landings-catalog?city=` when a city is selected.
 * Pilot `?city=` (kaliningrad / saint-petersburg / moscow) gets unique SSR meta + H1.
 * Awaiting searchParams opts the route into dynamic rendering for correct city SEO.
 */
export default async function PodborkiCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const seo = resolvePodborkiCatalogSeo(firstQueryValue(params.city));

  const emptyCatalog = { generatedAt: new Date(0).toISOString(), city: 'all', items: [] as NonNullable<
    Awaited<ReturnType<typeof getCachedLandingsCatalog>>
  >['items'] };
  const emptyDestinations = {
    generatedAt: new Date(0).toISOString(),
    destinations: [] as Awaited<ReturnType<typeof getCachedDestinations>>['destinations'],
  };

  const [catalogResult, destinationsResult, metaResult] = await Promise.allSettled([
    getCachedLandingsCatalog('all'),
    getCachedDestinations(),
    getCachedPodborkiMeta(),
  ]);

  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : emptyCatalog;
  const destinationsPayload =
    destinationsResult.status === 'fulfilled' ? destinationsResult.value : emptyDestinations;
  const meta =
    metaResult.status === 'fulfilled'
      ? metaResult.value
      : { layoutBySlug: {}, categoryBySlug: {}, categories: PODBORKI_CATEGORIES };

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
            heroTitle={seo.h1}
            heroDescription={seo.heroDescription}
          />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
