'use client';

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Hash } from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { resolveCityBrief } from '@/lib/cityInfo';
import { filterOrphanRegions, resolveCityRegion } from '@/lib/cityRegionHub';
import { pluralCities } from '@/lib/format';

type SortMode = 'events' | 'asc' | 'desc';

export function CitiesCatalogView({
  destinations,
  hideIntro = false,
}: {
  destinations: PublicDestinationDto[];
  /** When parent already rendered HeroLayout H1. */
  hideIntro?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('events');

  const cities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = destinations
      .filter((item) => item.type === 'city')
      .filter((item) => !normalized || item.name.toLowerCase().includes(normalized));

    return [...filtered].sort((a, b) => {
      if (sortMode === 'events') return b.events - a.events || a.name.localeCompare(b.name, 'ru');
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
    });
  }, [destinations, query, sortMode]);

  const regions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = destinations
      .filter((item) => item.type === 'region' && item.events > 0)
      .filter((item) => !normalized || item.name.toLowerCase().includes(normalized));

    return [...filtered].sort((a, b) => {
      if (sortMode === 'events') return b.events - a.events || a.name.localeCompare(b.name, 'ru');
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
    });
  }, [destinations, query, sortMode]);

  const orphanRegions = useMemo(() => filterOrphanRegions(regions, cities), [regions, cities]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {hideIntro ? (
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                Все города
                {cities.length > 0 ? (
                  <span className="ml-2 text-base font-medium text-slate-500">({pluralCities(cities.length)})</span>
                ) : null}
              </h2>
              <div className="shrink-0 sm:hidden">
                <CitiesSortControls sortMode={sortMode} onSortModeChange={setSortMode} compact />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-display text-3xl font-bold text-slate-900">Города</h1>
                <div className="shrink-0 sm:hidden">
                  <CitiesSortControls sortMode={sortMode} onSortModeChange={setSortMode} compact />
                </div>
              </div>
              <p className="mt-2 text-lg text-slate-500">
                {cities.length > 0 ? pluralCities(cities.length) : 'Города'}
                {' - экскурсии, музеи и мероприятия по всей территории России'}
              </p>
            </>
          )}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск города"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-56"
          />
          <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2">
            <span className="text-sm text-slate-500">Сортировка:</span>
            <CitiesSortControls sortMode={sortMode} onSortModeChange={setSortMode} />
          </div>
        </div>
      </div>

      {!cities.length && !orphanRegions.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <p className="text-lg text-slate-400">Ничего не найдено</p>
          <p className="mt-1 text-sm text-slate-400">Попробуйте изменить поисковый запрос</p>
        </div>
      ) : null}

      {cities.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <CityCard
              key={`${city.type}:${city.id || city.slug || city.name}`}
              city={city}
              large
              description={resolveCityBrief(city.slug, city.sourceSlug, city.name)}
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
              События в городах без отдельной карточки — курорты, пригороды и малые населённые пункты
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orphanRegions.map((region) => (
              <RegionDestinationLink key={`region:${region.slug || region.name}`} region={region} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function CitiesSortControls({
  sortMode,
  onSortModeChange,
  compact = false,
}: {
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  compact?: boolean;
}) {
  const buttonClass = compact ? 'px-2 py-2' : 'px-3 py-2';

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onSortModeChange('events')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'events' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По количеству событий"
      >
        <Hash className="h-4 w-4" />
        <span className="sr-only">По событиям</span>
      </button>
      <button
        type="button"
        onClick={() => onSortModeChange('asc')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'asc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По алфавиту А–Я"
      >
        <ArrowDownAZ className="h-4 w-4" />
        <span className="sr-only">А–Я</span>
      </button>
      <button
        type="button"
        onClick={() => onSortModeChange('desc')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'desc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По алфавиту Я–А"
      >
        <ArrowUpAZ className="h-4 w-4" />
        <span className="sr-only">Я–А</span>
      </button>
    </div>
  );
}
