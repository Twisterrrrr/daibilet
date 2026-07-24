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
 * SSR always city=all (ISR 600s); LandingsCatalogView refetches when ?city= is set.
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
        <Suspense fallback={<div className="container-page py-16 text-sm text-slate-500">Загружаем подборки…</div>}>
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
