import type { Metadata } from 'next';

import { CatalogFilters } from '@/components/CatalogFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { EventCard } from '@/components/EventCard';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { pluralEvents } from '@/lib/format';
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

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Каталог событий</h1>
        <p className="mt-2 text-sm text-slate-500">{pluralEvents(catalog.total)}</p>

        <CatalogFilters
          facets={catalog.facets}
          values={{
            city: query.city,
            date: query.date,
            sort: query.sort,
            q: query.q,
          }}
        />

        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.items.map((session) => (
            <li key={`${session.id}-${session.startsAt}`}>
              <EventCard session={session} />
            </li>
          ))}
        </ul>

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
