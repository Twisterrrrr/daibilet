import type { Metadata } from 'next';

import { CitiesCatalogView } from '@/components/CitiesCatalogView.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';

export const metadata: Metadata = {
  title: 'Города России — экскурсии, музеи и мероприятия | Дайбилет',
  description:
    'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.',
  alternates: { canonical: '/cities' },
};

export const revalidate = 300;

export default async function CitiesIndexPage() {
  const destinations = await buildPublicDestinationsDto();

  return (
    <SiteLayout>
      <PageBreadcrumbBar items={[{ label: 'Главная', href: '/' }, { label: 'Города' }]} />
      <div className="container-page bg-slate-50 py-10">
        <CitiesCatalogView destinations={destinations.destinations} />
      </div>
    </SiteLayout>
  );
}
