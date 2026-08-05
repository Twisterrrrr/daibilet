'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Search } from 'lucide-react';

import { LocationCard } from '@/components/LocationCard.client';
import { LocationsCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';
import { formatCountFloorTenPlus, formatNumber, pluralCities } from '@/lib/format';
import { persistSelectedCity, resolveCatalogCityFilter } from '@/lib/selected-city';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { LOCATION_CATALOG_TYPE_OPTIONS, normalizeVenueKind, resolvePublicVenueType, venueTypeLabel } from '@/lib/venue-meta';
import { venueHref } from '@/lib/routes';

type SortMode = 'events' | 'asc' | 'desc';

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ['events', 'По афише'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

export function LocationsCatalogView({ venues: initialVenues }: { venues: VenueCatalogCard[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const [venues, setVenues] = useState(initialVenues);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('events');
  const [isPending, startTransition] = useTransition();
  const [catalogLoading, setCatalogLoading] = useState(false);

  const urlCity = searchParams.get('city')?.trim() || '';
  const rawType = searchParams.get('type')?.trim() || '';
  const typeFilter = rawType ? normalizeVenueKind(rawType) : 'all';
  const cityReady = selectedCity?.cityReady ?? true;

  // City-scoped API includes 0-event editorial must-see; global SSR alone can miss them.
  const cityFetchKey = useMemo(() => {
    if (urlCity && urlCity !== 'all') return urlCity;
    const dest = selectedCity?.selectedDestination;
    if (!dest || selectedCity?.cityValue === 'all') return '';
    return dest.sourceSlug || dest.slug || selectedCity.cityLabel || '';
  }, [urlCity, selectedCity]);

  useEffect(() => {
    // City-scoped fetch owns the list when a city filter is active.
    if (cityFetchKey) return;
    setVenues(initialVenues);
  }, [initialVenues, cityFetchKey]);

  useEffect(() => {
    if (!cityReady) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ family: 'location', limit: '500' });
    if (cityFetchKey) params.set('city', cityFetchKey);
    // Empty SSR always refetch; city filter always refetch for editorial places.
    if (!cityFetchKey && initialVenues.length > 0) return;
    setCatalogLoading(true);
    fetch(`/api/public/venues?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as { venues?: VenueCatalogCard[] }) : null))
      .then((data) => {
        if (data?.venues?.length) setVenues(data.venues);
      })
      .catch(() => undefined)
      .finally(() => setCatalogLoading(false));
    return () => controller.abort();
  }, [cityFetchKey, cityReady, initialVenues.length]);

  const cityPending = !urlCity && Boolean(selectedCity) && !cityReady;
  const listPending = cityPending || isPending || catalogLoading;

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of venues) {
      if (!venue.city || venue.city === 'Не указан') continue;
      counts.set(venue.city, (counts.get(venue.city) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }, [venues]);

  const cityFilter = useMemo(() => {
    if (urlCity) {
      return resolveCatalogCityFilter(urlCity, cityOptions, selectedCity?.cityLabel);
    }
    if (!cityReady || !selectedCity || selectedCity.cityValue === 'all') return 'all';
    return resolveCatalogCityFilter(selectedCity.cityValue, cityOptions, selectedCity.cityLabel);
  }, [urlCity, cityReady, selectedCity, cityOptions]);

  const setCityFilter = (next: string) => {
    persistSelectedCity(next === 'all' ? 'all' : next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('city');
    else params.set('city', next);
    // Type facets are city-scoped; drop stale global type (e.g. outdoor_location=151).
    params.delete('type');
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/locations?${qs}` : '/locations', { scroll: false });
    });
  };

  const setTypeFilter = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('type');
    else params.set('type', next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/locations?${qs}` : '/locations', { scroll: false });
    });
  };

  // Facet chip counts must match the city dropdown universe (e.g. SPb 20), not the global catalog.
  const cityScopedVenues = useMemo(() => {
    if (cityFilter === 'all') return venues;
    const byName = venues.filter((venue) => venue.city === cityFilter);
    // City-scoped API already narrowed the list; slug URL (?city=saint-petersburg)
    // may not equal display title «Санкт-Петербург».
    if (byName.length === 0 && cityFetchKey) return venues;
    return byName;
  }, [venues, cityFilter, cityFetchKey]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of cityScopedVenues) {
      const key = resolvePublicVenueType(venue.type, venue.name);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return LOCATION_CATALOG_TYPE_OPTIONS.filter((option) => counts.has(option.value)).map((option) => ({
      ...option,
      count: counts.get(option.value) || 0,
    }));
  }, [cityScopedVenues]);

  // Drop type=… that has 0 matches in the current city (deep-link / leftover URL).
  useEffect(() => {
    if (listPending || typeFilter === 'all') return;
    if (typeOptions.some((option) => option.value === typeFilter)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('type')) return;
    params.delete('type');
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/locations?${qs}` : '/locations', { scroll: false });
    });
  }, [listPending, typeFilter, typeOptions, searchParams, router]);

  const filteredVenues = useMemo(() => {
    if (listPending) return [];
    const normalized = query.trim().toLowerCase();
    const filtered = cityScopedVenues.filter((venue) => {
      if (typeFilter !== 'all' && resolvePublicVenueType(venue.type, venue.name) !== typeFilter) return false;
      if (!normalized) return true;
      return [venue.name, venue.city, venue.address, venue.shortDescription, venueTypeLabel(venue.type, venue.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === 'events') return right.events - left.events || left.name.localeCompare(right.name, 'ru');
      if (sortMode === 'desc') return right.name.localeCompare(left.name, 'ru');
      return left.name.localeCompare(right.name, 'ru');
    });
  }, [cityScopedVenues, query, typeFilter, sortMode, listPending]);

  const cityCount = cityOptions.length;
  const eventsHref = catalogHrefWithSelectedCity(selectedCity?.cityValue);
  const venuesHref = venueCatalogHrefWithSelectedCity('/venues', selectedCity?.cityValue);
  const cityName = cityFilter !== 'all' ? cityFilter : null;
  const heroTitle = cityName
    ? `Локации и точки сбора в ${cityToPrepositional(cityName)}`
    : 'Локации и точки сбора';
  const heroDescription = cityName
    ? `Причалы, парки и места встречи ${cityToGenitive(cityName)}.`
    : 'Причалы, парки и места встречи для экскурсий и событий.';

  return (
    <>
      {/* Mobile template: dense hero, type chips first (UX.LOC4). */}
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Локации' }]}
        eyebrow={`${formatCountFloorTenPlus(venues.length)} локаций · ${pluralCities(cityCount)}`}
        title={heroTitle}
        description={cityName ? heroDescription : 'Места встречи и точки старта. Город - в шапке.'}
        tone="light"
        className="bg-slate-50"
      >
        {typeOptions.length ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Все локации
              <span className="ml-1.5 text-xs opacity-75">({cityScopedVenues.length})</span>
            </button>
            {typeOptions.map((option) => {
              const active = typeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(active ? 'all' : option.value)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                  <span className="text-xs opacity-75">({option.count})</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название или адрес"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {/* sm+: city select; on mobile city lives in sticky header */}
          <select
            value={cityPending ? '' : cityFilter}
            disabled={cityPending}
            onChange={(event) => setCityFilter(event.target.value)}
            className="hidden rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none disabled:opacity-70 sm:block"
            aria-label="Город"
          >
            {cityPending ? <option value="">Город…</option> : null}
            <option value="all">Все города</option>
            {cityOptions.map(([city, count]) => (
              <option key={city} value={city}>
                {city} ({count})
              </option>
            ))}
          </select>
        </div>
      </HeroLayout>

      <div className="container-page py-6 sm:py-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {listPending ? (
              'Обновляем список…'
            ) : (
              <>
                Найдено: {formatNumber(filteredVenues.length)}
                {cityScopedVenues.length ? (
                  <span className="font-normal text-slate-500"> из {formatNumber(cityScopedVenues.length)}</span>
                ) : null}
              </>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Link href={venuesHref} className="text-sm font-semibold text-primary-600 hover:underline">
              Площадки: музеи и театры →
            </Link>
          </div>
        </div>

        {listPending ? (
          <LocationsCatalogSkeleton />
        ) : filteredVenues.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVenues.map((venue) => (
              <LocationCard key={venue.id} venue={venue} href={venueHref(venue)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
            <p className="mt-1 text-sm">Попробуйте убрать фильтры или изменить запрос</p>
          </div>
        )}

        <nav className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/cities" className="font-medium text-primary hover:underline">
            Все города
          </Link>
          <Link href={eventsHref} className="font-medium text-primary hover:underline">
            Афиша событий
          </Link>
        </nav>
      </div>
    </>
  );
}
