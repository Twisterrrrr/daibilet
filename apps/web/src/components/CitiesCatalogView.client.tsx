'use client';

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Hash, Search } from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { RussiaMap } from '@/components/RussiaMap.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { resolveCityBrief } from '@/lib/cityInfo';
import { filterOrphanRegions, resolveCityRegion } from '@/lib/cityRegionHub';
import { pluralCities, pluralEvents } from '@/lib/format';

type SortMode = 'events' | 'asc' | 'desc';

const CITIES_HERO_FRAMES = [
  { src: '/images/hero/hero-slavic-01.png', alt: 'Туристы гуляют по исторической улице' },
  { src: '/images/hero/hero-slavic-04.png', alt: 'Вечерние огни города с набережной' },
];

export function CitiesCatalogView({ destinations }: { destinations: PublicDestinationDto[] }) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('events');

  const allCities = useMemo(
    () => destinations.filter((item) => item.type === 'city'),
    [destinations],
  );

  const topCities = useMemo(
    () => [...allCities].sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')).slice(0, 6),
    [allCities],
  );

  const totalEvents = useMemo(
    () => allCities.reduce((sum, city) => sum + (city.events || 0), 0),
    [allCities],
  );

  const cities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = allCities.filter((item) => !normalized || item.name.toLowerCase().includes(normalized));

    return [...filtered].sort((a, b) => {
      if (sortMode === 'events') return b.events - a.events || a.name.localeCompare(b.name, 'ru');
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
    });
  }, [allCities, query, sortMode]);

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

  const eyebrow =
    allCities.length > 0
      ? totalEvents > 0
        ? `${pluralCities(allCities.length)} · ${pluralEvents(totalEvents)}`
        : pluralCities(allCities.length)
      : 'Города';

  return (
    <>
      <HeroLayout
        variant="imageOverlay"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Города' }]}
        eyebrow={eyebrow}
        title="Города России"
        description="Выберите город - покажем афишу, площадки и подборки с актуальными билетами."
        tone="dark"
        media={
          <HeroMedia
            frames={CITIES_HERO_FRAMES}
            overlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/50"
          />
        }
      >
        <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-3 rounded-2xl bg-white p-3 text-left text-slate-900 shadow-lg sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти город"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
              aria-label="Поиск города"
            />
          </div>
          <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-end">
            <span className="hidden text-sm text-slate-500 sm:inline">Сортировка:</span>
            <CitiesSortControls sortMode={sortMode} onSortModeChange={setSortMode} />
          </div>
        </div>
      </HeroLayout>

      {topCities.length ? (
        <div className="border-b border-slate-200 bg-white">
          {/* Same content column as «Все города» below - no nested max-w (avoids left-biased row). */}
          <div className="container-page grid items-stretch gap-4 py-8 sm:py-10 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)] lg:gap-5">
            <ul className="grid h-full grid-cols-2 content-start gap-3 sm:grid-cols-3">
              {topCities.map((city) => (
                <li key={city.slug || city.name}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
            <RussiaMap className="h-full min-h-[14rem] self-stretch" />
          </div>
        </div>
      ) : null}

      <div className="container-page bg-slate-50 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Все города
            {cities.length > 0 ? (
              <span className="ml-2 text-base font-medium text-slate-500">({pluralCities(cities.length)})</span>
            ) : null}
          </h2>
        </div>

        {!cities.length && !orphanRegions.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
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
                События в городах без отдельной карточки - курорты, пригороды и малые населённые пункты
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orphanRegions.map((region) => (
                <RegionDestinationLink key={`region:${region.slug || region.name}`} region={region} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
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
        title="По алфавиту А-Я"
      >
        <ArrowDownAZ className="h-4 w-4" />
        <span className="sr-only">А-Я</span>
      </button>
      <button
        type="button"
        onClick={() => onSortModeChange('desc')}
        className={`inline-flex items-center gap-1.5 rounded-md ${buttonClass} text-sm font-medium transition-colors ${
          sortMode === 'desc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
        }`}
        title="По алфавиту Я-А"
      >
        <ArrowUpAZ className="h-4 w-4" />
        <span className="sr-only">Я-А</span>
      </button>
    </div>
  );
}
