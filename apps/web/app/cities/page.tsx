import type { Metadata } from 'next';

import { CitiesCatalogView } from '@/components/CitiesCatalogView.client';
import { CitiesHeroSearch } from '@/components/CitiesHeroSearch.client';
import { CityCard } from '@/components/CityCard';
import { HeroLayout } from '@/components/HeroLayout';
import { RussiaMap } from '@/components/RussiaMap.client';
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

  const cities = destinations.filter((item) => item.type === 'city');
  const topCities = [...cities].sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')).slice(0, 6);

  return (
    <SiteLayout>
      <HeroLayout
        variant="minimal"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Города' }]}
        title="Города России"
        description="Выберите город - покажем афишу, площадки и подборки с актуальными билетами."
      >
        <CitiesHeroSearch destinations={cities} />
        {/* Top tiles + aside: full width of HeroLayout max-w-5xl column (H1 shares the same axis). */}
        <div
          className={
            topCities.length
              ? 'mt-6 grid w-full items-stretch gap-3 lg:grid-cols-[minmax(0,2.35fr)_minmax(12.5rem,0.9fr)] lg:gap-4'
              : 'mt-6 w-full'
          }
        >
          {topCities.length ? (
            <ul className="grid h-full grid-cols-2 content-start gap-2.5 sm:grid-cols-3">
              {topCities.map((city) => (
                <li key={city.slug || city.name} className="min-w-0">
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          ) : null}
          <RussiaMap className="h-full min-h-[14rem] self-stretch" />
        </div>
      </HeroLayout>
      <div id="cities-all" className="container-page scroll-mt-24 bg-slate-50 py-10">
        <CitiesCatalogView destinations={destinations} hideIntro />
      </div>
    </SiteLayout>
  );
}
