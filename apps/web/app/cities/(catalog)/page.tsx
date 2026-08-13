import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CitiesIndexChrome } from '@/components/CitiesIndexChrome.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

export const metadata: Metadata = {
  title: 'Города России - экскурсии, музеи и мероприятия',
  description:
    'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.',
  alternates: { canonical: '/cities' },
};

/** Daily ISR; on-demand revalidateTag/path still works via /api/internal/revalidate. */
export const revalidate = 86400;

const CITIES_DESTINATIONS_TIMEOUT_MS = 2500;

export default async function CitiesIndexPage() {
  let destinations: Awaited<ReturnType<typeof getCachedDestinations>>['destinations'] = [];
  try {
    const payload = await withSoftTimeout(
      getCachedDestinations(),
      CITIES_DESTINATIONS_TIMEOUT_MS,
      { generatedAt: new Date(0).toISOString(), destinations: [] },
      'cities-index-destinations',
    );
    destinations = payload.destinations ?? [];
  } catch {
    destinations = [];
  }

  return (
    <SiteLayout>
      <Suspense
        fallback={
          <div className="container-page py-16">
            <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-6 h-48 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        }
      >
        <CitiesIndexChrome destinations={destinations} />
      </Suspense>
    </SiteLayout>
  );
}
