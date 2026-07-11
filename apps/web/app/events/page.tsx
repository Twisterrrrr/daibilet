import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { pluralEvents } from '@/lib/format';
import { catalogFiltersFromQuery } from '@/lib/catalog-url';
import { parseCatalogPageQuery } from '@/server/catalog-query';
import { buildPublicCatalogDto } from '@daibilet/backend/public-read';

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = parseCatalogPageQuery(params);
  const pageSuffix = query.page > 1 ? ` — страница ${query.page}` : '';
  return {
    title: `События, экскурсии и билеты${pageSuffix} | Дайбилет`,
    description:
      'Полный каталог событий Дайбилет: фильтры по городу, дате, категории, цене и подборкам.',
    alternates: {
      canonical: query.page > 1 ? `/events?page=${query.page}` : '/events',
    },
  };
}

export default async function EventsCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseCatalogPageQuery(params);
  const catalog = await buildPublicCatalogDto(query);
  const filterValues = catalogFiltersFromQuery({
    q: query.q,
    city: query.city,
    category: query.category,
    landing: query.landing,
    date: query.date,
    from: query.from,
    to: query.to,
    sort: query.sort,
    limit: query.limit as 100 | 200 | 300 | undefined,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice ?? query.priceMax,
    ageMax: query.ageMax,
    page: query.page,
  });

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Каталог событий
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {pluralEvents(catalog.total)}
            {catalog.items.length < catalog.total ? ` · показано ${catalog.items.length}` : ''}
          </p>
        </div>

        <Suspense fallback={<div className="mt-8 text-sm text-slate-500">Загрузка каталога…</div>}>
          <CatalogShell
            facets={catalog.facets}
            filterValues={filterValues}
            items={catalog.items}
            page={query.page}
            total={catalog.total}
            limit={catalog.limit}
            searchParams={params}
          />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
