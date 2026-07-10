import type { Metadata } from 'next';

import { CatalogActiveFilters } from '@/components/CatalogActiveFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { CatalogToolbar } from '@/components/CatalogToolbar.client';
import { EventCard } from '@/components/EventCard';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { pluralEvents } from '@/lib/format';
import { catalogFiltersFromQuery } from '@/lib/catalog-url';
import { parseCatalogPageQuery } from '@/server/catalog-query';
import { buildPublicCatalogDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

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
            {catalog.items.length < catalog.total
              ? ` · показано ${catalog.items.length}`
              : ''}
          </p>
        </div>

        <div className="catalog-toolbar-sticky -mx-4 mt-6 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <CatalogToolbar facets={catalog.facets} values={filterValues} />
          <CatalogActiveFilters values={filterValues} />
        </div>

        {catalog.items.length ? (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.items.map((session) => (
              <li key={`${session.id}-${session.startsAt}`}>
                <EventCard session={session} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="text-lg font-semibold text-slate-800">Ничего не найдено</p>
            <p className="mt-2 text-sm text-slate-500">
              Попробуйте изменить фильтры или сбросить поиск.
            </p>
          </div>
        )}

        <CatalogPaginationLinks
          page={query.page}
          total={catalog.total}
          limit={catalog.limit}
          searchParams={params}
        />
      </div>
    </SiteLayout>
  );
}
