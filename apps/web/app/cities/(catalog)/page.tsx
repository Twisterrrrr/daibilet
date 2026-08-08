import type { Metadata } from 'next';

import { CitiesCatalogView } from '@/components/CitiesCatalogView.client';
import { CitiesHeroSearch } from '@/components/CitiesHeroSearch.client';
import { CityCard } from '@/components/CityCard';
import { HeroLayout } from '@/components/HeroLayout';
import { RussiaMap } from '@/components/RussiaMap.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { cityHasDaytimePreview, cityHasTopPreview, cityImageSlug } from '@/lib/city-images';
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
const TOP_CITIES_COUNT = 8;
const SECOND_OCTET_COUNT = 8;

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
  const byPopularity = (a: (typeof cities)[number], b: (typeof cities)[number]) =>
    b.events - a.events || a.name.localeCompare(b.name, 'ru');
  // Top-8 pins → daytime second-octet JPGs → remaining by popularity.
  const withTop = [...cities].filter(cityHasTopPreview).sort(byPopularity);
  const withDaytimeSecond = [...cities]
    .filter((city) => !cityHasTopPreview(city) && cityHasDaytimePreview(city))
    .sort(byPopularity);
  const withoutDaytime = [...cities].filter((city) => !cityHasDaytimePreview(city)).sort(byPopularity);
  const rankedCities = [...withTop, ...withDaytimeSecond, ...withoutDaytime];
  const topCities = rankedCities.slice(0, TOP_CITIES_COUNT);
  const secondOctet = rankedCities.slice(TOP_CITIES_COUNT, TOP_CITIES_COUNT + SECOND_OCTET_COUNT);
  const featuredSlugs = [...topCities, ...secondOctet]
    .map((city) => cityImageSlug(city))
    .filter(Boolean);

  return (
    <SiteLayout>
      <HeroLayout
        variant="minimal"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Города' }]}
        title="Города России"
        description="Выберите город - покажем афишу, площадки и подборки с актуальными событиями и билетами на них."
      >
        <CitiesHeroSearch destinations={cities} />
        {topCities.length ? (
          <ul className="mt-6 grid w-full grid-cols-2 content-start gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {topCities.map((city) => (
              <li key={city.slug || city.name} className="min-w-0">
                <CityCard city={city} imageVariant="top" compact />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 w-full lg:mt-5">
          <RussiaMap className="min-h-[16rem] w-full sm:min-h-[18rem] lg:min-h-[22rem]" destinations={cities} />
        </div>
      </HeroLayout>
      <div id="cities-all" className="container-page scroll-mt-24 bg-slate-50 py-10">
        {secondOctet.length ? (
          <section aria-label="Следующие города" className="mb-10 border-b border-slate-200/80 pb-10">
            <ul className="grid w-full grid-cols-2 content-start gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {secondOctet.map((city) => (
                <li key={city.slug || city.name} className="min-w-0">
                  {/* Same chrome as top-8: dark scrim + white title/stats on photo. */}
                  <CityCard city={city} compact imageVariant="top" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <CitiesCatalogView destinations={destinations} hideIntro excludeSlugs={featuredSlugs} />
      </div>
    </SiteLayout>
  );
}
