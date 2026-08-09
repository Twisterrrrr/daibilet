import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CitiesCatalogView } from '@/components/CitiesCatalogView.client';
import { CitiesHeroSearch } from '@/components/CitiesHeroSearch.client';
import { HeroLayout } from '@/components/HeroLayout';
import { RussiaMap } from '@/components/RussiaMap.client';
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
    // Shared Data Cache with SiteLayout / home — never rebuild full catalog sessions inline.
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

  const cities = destinations.filter((item) => item.type === 'city');

  return (
    <SiteLayout>
      <HeroLayout
        variant="minimal"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Города' }]}
        title="Города России"
      >
        <Suspense
          fallback={
            <div className="mt-5 h-12 w-full animate-pulse rounded-2xl bg-slate-100" aria-hidden />
          }
        >
          <CitiesHeroSearch destinations={cities} />
        </Suspense>
        <div className="mt-4 w-full lg:mt-5">
          <RussiaMap className="min-h-[16rem] w-full sm:min-h-[18rem] lg:min-h-[22rem]" destinations={cities} />
        </div>
      </HeroLayout>
      <div id="cities-all" className="container-page scroll-mt-24 bg-slate-50 py-10">
        <Suspense fallback={null}>
          <CitiesCatalogView destinations={destinations} hideIntro />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
