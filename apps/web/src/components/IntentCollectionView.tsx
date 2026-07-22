import Link from 'next/link';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import type { CatalogIntentDefinition } from '@/lib/catalog-intent-routes';
import { catalogIntentPath, formatIntentSeoBody, listCatalogIntents } from '@/lib/catalog-intent-routes';
import type { CatalogPageQuery } from '@/server/catalog-query';
import { catalogQueryCacheKey } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';

export async function IntentCollectionView({
  intent,
  citySlug,
  cityName,
  pageQuery,
}: {
  intent: CatalogIntentDefinition;
  citySlug?: string | null;
  cityName?: string | null;
  pageQuery: CatalogPageQuery;
}) {
  let initialCatalog: Awaited<ReturnType<typeof getCachedCatalog>> | null = null;
  try {
    initialCatalog = await getCachedCatalog(pageQuery);
  } catch {
    initialCatalog = null;
  }

  const eventsCount = initialCatalog?.total ?? initialCatalog?.items?.length ?? 0;
  const seoBody = formatIntentSeoBody(intent, { cityName, eventsCount });
  const siblings = listCatalogIntents().filter((item) => item.intent !== intent.intent);
  const crumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Подборки', href: '/podborki' },
    {
      label: cityName ? `${intent.label} · ${cityName}` : intent.label,
    },
  ];

  return (
    <>
      <PageBreadcrumbBar items={crumbs} />
      <div className="container-page py-8">
        <header className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-700">Подборка</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
            {intent.label}
            {cityName ? ` · ${cityName}` : ''}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{intent.description}</p>
          {siblings.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {siblings.map((item) => (
                <Link
                  key={item.intent}
                  href={catalogIntentPath(item.intent, citySlug)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-primary/40 hover:text-primary-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-100" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          }
        >
          <CatalogShell initialCatalog={initialCatalog} initialQueryKey={catalogQueryCacheKey(pageQuery)} />
        </Suspense>

        <section className="mt-12 max-w-3xl border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-slate-900">О подборке</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">{seoBody}</p>
          <p className="mt-4 text-sm text-slate-500">
            Нужен полный каталог с произвольными фильтрами?{' '}
            <Link href="/events" className="font-semibold text-primary-700 hover:underline">
              Открыть все события
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
