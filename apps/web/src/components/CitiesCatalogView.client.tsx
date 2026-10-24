'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { CityCard } from '@/components/CityCard';
import { parseCitiesCatalogSort } from '@/components/CitiesHeroSearch.client';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { filterOrphanRegions, resolveCityRegion } from '@/lib/cityRegionHub';
import { pluralCities } from '@/lib/format';

export function CitiesCatalogView({
  destinations,
  hideIntro = false,
}: {
  destinations: PublicDestinationDto[];
  /** When parent already rendered HeroLayout H1. */
  hideIntro?: boolean;
}) {
  const searchParams = useSearchParams();
  const sort = parseCitiesCatalogSort(searchParams.get('sort'));

  const cities = useMemo(() => {
    const filtered = destinations.filter((item) => item.type === 'city');

    return [...filtered].sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name, 'ru') || b.events - a.events;
      }
      return b.events - a.events || a.name.localeCompare(b.name, 'ru');
    });
  }, [destinations, sort]);

  const allCities = useMemo(
    () => destinations.filter((item) => item.type === 'city'),
    [destinations],
  );

  const regions = useMemo(() => {
    const filtered = destinations.filter((item) => item.type === 'region' && item.events > 0);
    return [...filtered].sort(
      (a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'),
    );
  }, [destinations]);

  const orphanRegions = useMemo(
    () => filterOrphanRegions(regions, allCities),
    [regions, allCities],
  );

  return (
    <>
      {!hideIntro ? (
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900">Города</h1>
          <p className="mt-2 text-lg text-slate-500">
            {cities.length > 0 ? pluralCities(cities.length) : 'Города'}
            {' - экскурсии, музеи и мероприятия по всей территории России'}
          </p>
        </div>
      ) : null}

      {!cities.length && !orphanRegions.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <p className="text-lg text-slate-400">Города скоро появятся</p>
        </div>
      ) : null}

      {cities.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7">
          {cities.map((city) => (
            <CityCard
              key={`${city.type}:${city.id || city.slug || city.name}`}
              city={city}
              compact
              region={resolveCityRegion(city, destinations)}
            />
          ))}
        </div>
      ) : null}

      {orphanRegions.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-10">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Области и направления</h2>
            <p className="mt-1 text-sm text-slate-500">
              События в городах без отдельной карточки - курорты, пригороды и малые населённые пункты
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {orphanRegions.map((region) => (
              <RegionDestinationLink key={`region:${region.slug || region.name}`} region={region} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
