import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { CitiesIndexChrome } from '@/components/CitiesIndexChrome.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { INDEX_FOLLOW_ROBOTS, canonicalHref } from '@/lib/seo-meta';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { cityHref } from '@/lib/routes';
import { getCachedDestinations } from '@/server/cached-public-surfaces';

const CITIES_HUB_DESCRIPTION =
  'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.';

export const metadata: Metadata = {
  title: 'Города России - экскурсии, музеи и мероприятия',
  description: CITIES_HUB_DESCRIPTION,
  alternates: { canonical: canonicalHref('/cities') },
  robots: INDEX_FOLLOW_ROBOTS,
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
          <main className="container-page py-12" data-ssr-cities-catalog>
            <h1 className="font-display text-3xl font-bold text-slate-950">Города России</h1>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {destinations.filter((item) => item.type === 'city').map((city) => (
                <li key={city.slug || city.name}>
                  <Link href={cityHref(city)} className="block rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-900 hover:border-slate-300">
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </main>
        }
      >
        <CitiesIndexChrome destinations={destinations} />
      </Suspense>
    </SiteLayout>
  );
}
