import type { Metadata } from 'next';

import { CitiesCatalogView } from '@/components/CitiesCatalogView.client';
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

export const revalidate = 3600;

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
        {/* Top tiles + aside: full width of HeroLayout max-w-5xl column (H1 shares the same axis). */}
        <div
          className={
            topCities.length
              ? 'mt-6 grid w-full items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)] lg:gap-5'
              : 'mt-6 w-full'
          }
        >
          {topCities.length ? (
            <ul className="grid h-full grid-cols-2 content-start gap-3 sm:grid-cols-3">
              {topCities.map((city) => (
                <li key={city.slug || city.name}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          ) : null}
          <RussiaMap className="h-full min-h-[14rem] self-stretch" />
        </div>
      </HeroLayout>
      <div className="container-page bg-slate-50 py-10">
        <CitiesCatalogView destinations={destinations} hideIntro />
      </div>
    </SiteLayout>
  );
}
