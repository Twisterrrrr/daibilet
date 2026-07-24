import * as React from 'react';
import { ChevronRight, Search } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LocationCard } from '@/components/LocationCard';
import { formatCountFloorTenPlus, formatNumber } from '@/data';
import { API_BASE_URL } from '@/lib/api-base';
import {
  readCachedLocationVenues,
  writeCachedLocationVenues,
} from '@/lib/venues-catalog-cache';
import { LOCATION_CATALOG_TYPE_OPTIONS, normalizeVenueKind, venueTypeLabel } from '@/lib/venue-meta';
import { venueCatalogHref, venueHref } from '@/routes';
import type { PublicVenue } from '@/types';

type SortMode = 'events' | 'asc' | 'desc';

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ['events', 'По афише'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

export function LocationsCatalogPage() {
  const [query, setQuery] = React.useState('');
  const [cityFilter, setCityFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [sortMode, setSortMode] = React.useState<SortMode>('events');
  const [venues, setVenues] = React.useState<PublicVenue[]>(() => readCachedLocationVenues() || []);
  const [isLoading, setIsLoading] = React.useState(() => !readCachedLocationVenues()?.length);

  React.useEffect(() => {
    document.title = 'Локации и точки сбора: причалы, парки, места встречи | Дайбилет';
    upsertMeta(
      'description',
      'Каталог локаций: причалы речных прогулок, парки, точки сбора пеших экскурсий, автобусные остановки и встречи в аэропорту.',
    );
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`${API_BASE_URL}/api/public/venues?limit=500&family=location`, { cache: 'default', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { venues?: PublicVenue[] };
      })
      .then((payload) => {
        if (!Array.isArray(payload.venues)) return;
        setVenues(payload.venues);
        writeCachedLocationVenues(payload.venues);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const cityOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const venue of venues) {
      if (!venue.city || venue.city === 'Не указан') continue;
      counts.set(venue.city, (counts.get(venue.city) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }, [venues]);

  const typeOptions = React.useMemo(() => {
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

  const filteredVenues = React.useMemo(() => {
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

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'orders') window.location.href = '/my-orders';
    else if (section === 'blog') window.location.href = '/blog';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else if (section === 'venues') window.location.href = '/venues';
    else if (section === 'locations') window.location.href = '/locations';
    else window.location.href = `/#${section}`;
  };

  const cityCount = cityOptions.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header cityLabel="Все города" onSection={goSection} searchQuery={query} searchCity={cityFilter !== 'all' ? cityFilter : undefined} />

      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex items-center gap-1.5 py-3 text-sm text-slate-500">
          <a href="/" className="hover:text-primary-600">
            Главная
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">Локации</span>
        </div>
      </div>

      <section className="border-b border-slate-200 bg-gradient-to-br from-cyan-500 via-sky-600 to-primary-600 text-white">
        <div className="container-page py-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
            {formatCountFloorTenPlus(venues.length)} локаций · {cityCount} {cityCount === 1 ? 'город' : cityCount >= 2 && cityCount <= 4 ? 'города' : 'городов'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">Локации и точки сбора</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            Причалы, парки и места встречи для экскурсий и событий.
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
            {!isLoading && venues.length ? <span className="font-normal text-slate-500"> из {formatNumber(venues.length)}</span> : null}
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
            <a href={venueCatalogHref('institution')} className="text-sm font-semibold text-primary-600 hover:underline">
              Площадки: музеи и театры →
            </a>
          </div>
        </div>

        {isLoading && !filteredVenues.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredVenues.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVenues.map((venue) => (
              <LocationCard key={venue.id} venue={venue} href={venueHref(venue)} nextSlot={venue.nextSlot} />
            ))}
          </div>
        ) : null}

        {!isLoading && !filteredVenues.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
            <p className="mt-1 text-sm">Попробуйте убрать фильтры или изменить запрос</p>
          </div>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
