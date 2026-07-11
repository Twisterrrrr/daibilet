import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogShell } from '@/components/CatalogShell.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'События, экскурсии и билеты | Дайбилет',
  description: 'Полный каталог событий Дайбилет: фильтры по городу, дате, категории, цене и подборкам.',
  alternates: { canonical: '/events' },
};

export const revalidate = 300;

export default function EventsCatalogPage() {
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
          <CatalogShell />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
