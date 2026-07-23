import type { Metadata } from 'next';

import { CitiesCatalogView } from '@/components/CitiesCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';

export const metadata: Metadata = {
  title: 'Города России - экскурсии, музеи и мероприятия',
  description:
    'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.',
  alternates: { canonical: '/cities' },
};

/** Daily ISR; on-demand revalidateTag/path still works via /api/internal/revalidate. */
export const revalidate = 86400;

export default async function CitiesIndexPage() {
  let destinations: Awaited<ReturnType<typeof buildPublicDestinationsDto>>['destinations'] = [];
  try {
    const payload = await buildPublicDestinationsDto();
    destinations = payload.destinations ?? [];
  } catch {
    destinations = [];
  }

  return (
    <SiteLayout>
      <CitiesCatalogView destinations={destinations} />
    </SiteLayout>
  );
}
