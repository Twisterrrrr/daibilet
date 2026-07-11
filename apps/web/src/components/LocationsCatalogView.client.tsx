'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { LocationCard } from '@/components/LocationCard.client';
import type { PublicVenueDto } from '@daibilet/contracts/public';
import { formatNumber } from '@/lib/format';
import { LOCATION_CATALOG_TYPE_OPTIONS, normalizeVenueKind, venueTypeLabel } from '@/lib/venue-meta';
import { venueCatalogHref, venueHref } from '@/lib/routes';

type SortMode = 'events' | 'asc' | 'desc';

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ['events', 'По афише'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

export function LocationsCatalogView({ venues }: { venues: PublicVenueDto[] }) {
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('events');

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of venues) {
      if (!venue.city || venue.city === 'Не указан') continue;
      counts.set(venue.city, (counts.get(venue.city) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }, [venues]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of venues) {
      const key = normalizeVenueKind(venue.type);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return LOCATION_CATALOG_TYPE_OPTIONS.filter((option) => counts.has(option.value)).map((option) => ({
      ...option,
      count: counts.get(option.value) || 0,
    }));
  }, [venues]);

  const filteredVenues = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = venues.filter((venue) => {
      if (cityFilter !== 'all' && venue.city !== cityFilter) return false;
      if (typeFilter !== 'all' && normalizeVenueKind(venue.type) !== typeFilter) return false;
      if (!normalized) return true;
      return [venue.name, venue.city, venue.address, venue.shortDescription, venueTypeLabel(venue.type)]
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
  }, [venues, query, cityFilter, typeFilter, sortMode]);

  const cityCount = cityOptions.length;

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-cyan-500 via-sky-600 to-primary-600 text-white">
        <div className="container-page py-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
            {venues.length} локаций · {cityCount}{' '}
            {cityCount === 1 ? 'город' : cityCount >= 2 && cityCount <= 4 ? 'города' : 'городов'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
            Локации: причалы, парки и точки старта
          </h1>
          <p className="mt-3 max-w-2xl text-white/85">
            Куда приходить, как найти, во сколько встреча — чтобы не пропустить свой рейс или экскурсию.
          </p>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-lg sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Название локации или адрес"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none"
            >
              <option value="all">Все города</option>
              {cityOptions.map(([city, count]) => (
                <option key={city} value={city}>
                  {city} ({count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex gap-2 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>📍</span>
            Все локации
          </button>
          {typeOptions.map((option) => {
            const active = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(active ? 'all' : option.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{option.emoji}</span>
                {option.label}
                <span className="text-xs opacity-75">({option.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="container-page py-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Найдено: {formatNumber(filteredVenues.length)}
            {venues.length ? <span className="font-normal text-slate-500"> из {formatNumber(venues.length)}</span> : null}
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
            <Link href={venueCatalogHref('institution')} className="text-sm font-semibold text-primary-600 hover:underline">
              Площадки: музеи и театры →
            </Link>
          </div>
        </div>

        {filteredVenues.length > 0 ? (
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
          <Link href="/events" className="font-medium text-primary hover:underline">
            Афиша событий
          </Link>
        </nav>
      </div>
    </>
  );
}
