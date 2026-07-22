import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { SiteLayout } from '@/components/SiteLayout';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { catalogQueryCacheKey, parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';

const EVENTS_TITLE = 'События, экскурсии и билеты';
const EVENTS_DESCRIPTION =
  'Полный каталог событий Дайбилет: фильтры по городу, дате, категории, цене и подборкам.';

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

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventsCatalogPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  let pageQuery: ReturnType<typeof parseCatalogPageQuery>;
  try {
    pageQuery = parseCatalogPageQuery(raw);
  } catch {
    pageQuery = parseCatalogPageQuery({});
  }
  let initialCatalog: Awaited<ReturnType<typeof getCachedCatalog>> | null = null;

  try {
    initialCatalog = await getCachedCatalog(pageQuery);
  } catch {
    initialCatalog = null;
  }

  const initialQueryKey = catalogQueryCacheKey(pageQuery);

  return (
    <SiteLayout>
      <PageBreadcrumbBar items={[{ label: 'Главная', href: '/' }, { label: 'События' }]} />
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
