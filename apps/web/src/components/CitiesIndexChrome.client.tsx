'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { List, Map as MapIcon, Search } from 'lucide-react';

import { CityCard } from '@/components/CityCard';
import { HeroLayout } from '@/components/HeroLayout';
import { LuckyCityButton } from '@/components/LuckyCityButton.client';
import { RegionDestinationLink } from '@/components/RegionDestinationLink';
import { RussiaMap } from '@/components/RussiaMap.client';
import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { filterOrphanRegions, resolveCityRegion } from '@/lib/cityRegionHub';
import { pluralCities, pluralEvents } from '@/lib/format';
import { cityHref, citySlug } from '@/lib/routes';

export type CitiesCatalogSort = 'popular' | 'name';

const POPULAR_TILE_COUNT = 8;
const SEARCH_DEBOUNCE_MS = 200;

export function parseCitiesCatalogSort(raw: string | null | undefined): CitiesCatalogSort {
  return raw === 'name' ? 'name' : 'popular';
}

function sortCities(list: PublicDestinationDto[], sort: CitiesCatalogSort) {
  return [...list].sort((a, b) => {
    if (sort === 'name') {
      return a.name.localeCompare(b.name, 'ru') || b.events - a.events;
    }
    return b.events - a.events || a.name.localeCompare(b.name, 'ru');
  });
}

/**
 * /cities hub: livesearch filters the grid, popular top tiles, mobile map/list toggle.
 */
export function CitiesIndexChrome({ destinations }: { destinations: PublicDestinationDto[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = parseCitiesCatalogSort(searchParams.get('sort'));
  const urlQuery = (searchParams.get('q') || '').trim();
  const [queryDraft, setQueryDraft] = useState(urlQuery);
  const [focused, setFocused] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    setQueryDraft(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const next = queryDraft.trim();
    if (next === urlQuery) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set('q', next);
      else params.delete('q');
      const qs = params.toString();
      router.replace(qs ? `/cities?${qs}` : '/cities', { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [queryDraft, urlQuery, router, searchParams]);

  const allCities = useMemo(
    () => destinations.filter((item) => item.type === 'city'),
    [destinations],
  );

  const filteredCities = useMemo(() => {
    const normalized = urlQuery.toLowerCase();
    const base = normalized
      ? allCities.filter((item) => item.name.toLowerCase().includes(normalized))
      : allCities;
    return sortCities(base, sort);
  }, [allCities, urlQuery, sort]);

  const popularTiles = useMemo(() => {
    if (urlQuery) return [];
    return sortCities(allCities, 'popular').slice(0, POPULAR_TILE_COUNT);
  }, [allCities, urlQuery]);

  const popularSlugSet = useMemo(
    () => new Set(popularTiles.map((city) => citySlug(city)).filter(Boolean)),
    [popularTiles],
  );

  const gridCities = useMemo(() => {
    if (urlQuery || popularSlugSet.size === 0) return filteredCities;
    return filteredCities.filter((city) => !popularSlugSet.has(citySlug(city)));
  }, [filteredCities, popularSlugSet, urlQuery]);

  const regions = useMemo(() => {
    const filtered = destinations.filter((item) => item.type === 'region' && item.events > 0);
    return [...filtered].sort(
      (a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'),
    );
  }, [destinations]);

  const orphanRegions = useMemo(
    () => (urlQuery ? [] : filterOrphanRegions(regions, allCities)),
    [regions, allCities, urlQuery],
  );

  const suggestions = useMemo(() => {
    const normalized = queryDraft.trim().toLowerCase();
    if (normalized.length < 1) return [];
    return sortCities(
      allCities.filter((item) => item.name.toLowerCase().includes(normalized)),
      'popular',
    ).slice(0, 6);
  }, [allCities, queryDraft]);

  const showSuggestions = focused && suggestions.length > 0;

  const setSort = (next: CitiesCatalogSort) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'popular') params.delete('sort');
    else params.set('sort', next);
    const qs = params.toString();
    router.replace(qs ? `/cities?${qs}#cities-all` : '/cities#cities-all', { scroll: false });
    window.requestAnimationFrame(() => {
      document.getElementById('cities-all')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <>
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Города' }]}
        title="Города России"
      >
        <div className="relative mt-5 w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Поиск города</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                placeholder="Начните вводить город - список ниже сузится..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
              />
            </label>

            <div
              className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end"
              role="group"
              aria-label="Быстрый переход"
            >
              <LuckyCityButton cities={destinations} variant="hero" className="shrink-0" />
              <div
                className="flex flex-wrap items-center gap-2"
                role="radiogroup"
                aria-label="Сортировка списка городов"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={sort === 'popular'}
                  onClick={() => setSort('popular')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    sort === 'popular'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Популярные
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={sort === 'name'}
                  onClick={() => setSort('name')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    sort === 'name'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  По алфавиту
                </button>
              </div>
            </div>
          </div>

          {showSuggestions ? (
            <ul
              className="absolute left-0 right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:right-auto sm:max-w-xl"
              role="listbox"
            >
              {suggestions.map((city) => (
                <li key={city.slug || city.name} role="option">
                  <Link
                    href={cityHref(city)}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{city.name}</span>
                    <span className="text-xs text-slate-500">{pluralEvents(city.events)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {popularTiles.length > 0 ? (
          <section className="mt-5" aria-label="Популярные города">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">
                Популярные направления
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">{pluralCities(popularTiles.length)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {popularTiles.map((city) => (
                <CityCard
                  key={`popular:${city.id || city.slug || city.name}`}
                  city={city}
                  compact
                  imageVariant="top"
                  region={resolveCityRegion(city, destinations)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 lg:hidden">
          <p className="text-sm text-slate-500">
            {urlQuery
              ? filteredCities.length
                ? pluralCities(filteredCities.length)
                : 'Нет совпадений'
              : pluralCities(allCities.length)}
          </p>
          <div
            className="flex overflow-hidden rounded-xl bg-[#F5F5F7] p-1"
            role="radiogroup"
            aria-label="Вид каталога городов"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mobileView === 'list'}
              aria-label="Список"
              onClick={() => setMobileView('list')}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                mobileView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <List className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mobileView === 'map'}
              aria-label="Карта"
              onClick={() => setMobileView('map')}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                mobileView === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <MapIcon className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div
          className={`mt-4 w-full lg:mt-5 ${mobileView === 'map' ? 'block' : 'hidden lg:block'}`}
        >
          <RussiaMap
            className="min-h-[16rem] w-full sm:min-h-[18rem] lg:min-h-[22rem]"
            destinations={allCities}
          />
        </div>
      </HeroLayout>

      <div
        id="cities-all"
        className={`container-page scroll-mt-24 bg-slate-50 py-10 ${
          mobileView === 'list' ? 'block' : 'hidden lg:block'
        }`}
      >
        {!filteredCities.length && !orphanRegions.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
            <p className="text-lg text-slate-400">
              {urlQuery ? 'Ничего не найдено' : 'Города скоро появятся'}
            </p>
            {urlQuery ? (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-primary-700 hover:underline"
                onClick={() => setQueryDraft('')}
              >
                Сбросить поиск
              </button>
            ) : null}
          </div>
        ) : null}

        {gridCities.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {gridCities.map((city) => (
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
              <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                Области и направления
              </h2>
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
