import * as React from 'react';
import { ChevronRight, Grid3X3, List, Search } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { InstitutionCard } from '@/components/InstitutionCard';
import { InstitutionList } from '@/components/InstitutionListRow';
import { formatNumber } from '@/data';
import { API_BASE_URL } from '@/lib/api-base';
import {
  INSTITUTION_CATALOG_TYPE_OPTIONS,
  normalizeVenueKind,
  venuePageTemplate,
  venueTypeLabel,
} from '@/lib/venue-meta';
import { venueCatalogHref, venueHref } from '@/routes';
import type { PublicVenue } from '@/types';

type SortMode = 'events' | 'asc' | 'desc';
type ViewMode = 'cards' | 'list';

const VENUES_VIEW_MODE_KEY = 'daibilet:venues-view-mode';

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ['events', 'По афише'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

export function VenuesCatalogPage() {
  const [query, setQuery] = React.useState('');
  const [cityFilter, setCityFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [sortMode, setSortMode] = React.useState<SortMode>('events');
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => readStoredViewMode());
  const [venues, setVenues] = React.useState<PublicVenue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const setViewModePersisted = React.useCallback((value: ViewMode) => {
    setViewMode(value);
    try {
      localStorage.setItem(VENUES_VIEW_MODE_KEY, value);
    } catch {
      // ignore storage errors
    }
  }, []);

  React.useEffect(() => {
    document.title = 'Площадки: музеи, галереи и театры — билеты онлайн | Дайбилет';
    upsertMeta(
      'description',
      'Каталог площадок Дайбилет: музеи, галереи, театры и арт-пространства. Актуальная афиша и электронные билеты.',
    );
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`${API_BASE_URL}/api/public/venues?limit=500`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { venues?: PublicVenue[] };
      })
      .then((payload) => {
        if (Array.isArray(payload.venues)) {
          setVenues(payload.venues.filter((venue) => venuePageTemplate(venue.type) === 'institution'));
        }
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
    return INSTITUTION_CATALOG_TYPE_OPTIONS.filter((option) => counts.has(option.value)).map((option) => ({
      ...option,
      count: counts.get(option.value) || 0,
    }));
  }, [venues]);

  const filteredVenues = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = venues.filter((venue) => {
      if (cityFilter !== 'all' && venue.city !== cityFilter) return false;
      if (typeFilter !== 'all' && normalizeVenueKind(venue.type) !== typeFilter) return false;
      if (!normalized) return true;
      return [venue.name, venue.city, venue.address, venue.shortDescription, venueTypeLabel(venue.type)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'events') return b.events - a.events || a.name.localeCompare(b.name, 'ru');
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
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
          <span className="text-slate-900">Площадки</span>
        </div>
      </div>

      <section className="border-b border-slate-200 bg-gradient-to-br from-sky-500 via-primary-600 to-indigo-700 text-white">
        <div className="container-page py-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
            {venues.length} площадок · {cityCount}{' '}
            {cityCount === 1 ? 'город' : cityCount >= 2 && cityCount <= 4 ? 'города' : 'городов'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
            Площадки: музеи, галереи, театры и арт-пространства
          </h1>
          <p className="mt-3 max-w-2xl text-white/85">
            Постоянные экспозиции, временные выставки, вечерние программы. Электронные билеты без очередей.
          </p>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-lg sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Название или район"
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
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none"
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex items-center gap-3 py-3">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>✨</span>
              Все места
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

          <div className="flex shrink-0 overflow-hidden rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Вид каталога">
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'cards'}
              aria-label="Карточки"
              onClick={() => setViewModePersisted('cards')}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'list'}
              aria-label="Список"
              onClick={() => setViewModePersisted('list')}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Найдено: {formatNumber(filteredVenues.length)}
            {!isLoading && venues.length ? (
              <span className="font-normal text-slate-500"> из {formatNumber(venues.length)}</span>
            ) : null}
          </h2>
          <a href={venueCatalogHref('location')} className="text-sm font-semibold text-primary-600 hover:underline">
            Локации: причалы, парки, точки старта →
          </a>
        </div>

        {isLoading && !filteredVenues.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">Площадки загружаются…</p>
          </div>
        ) : null}

        {!isLoading && filteredVenues.length > 0 ? (
          viewMode === 'list' ? (
            <InstitutionList venues={filteredVenues} hrefFor={venueHref} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVenues.map((venue) => (
                <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
              ))}
            </div>
          )
        ) : null}

        {!isLoading && !filteredVenues.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
            <p className="mt-1 text-sm">Попробуйте убрать фильтры или сменить город.</p>
          </div>
        ) : null}

        <div className="prose prose-slate mt-12 max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900">Площадки в каталоге</h2>
          <p className="text-sm leading-7 text-slate-600">
            На Дайбилет собраны музеи, галереи, театры, концертные залы и клубы с актуальной афишей и покупкой через
            билетные системы организаторов. Причалы и точки отправления речных прогулок — в разделе{' '}
            <a href="/locations" className="font-semibold text-primary-600 no-underline hover:underline">
              Локации
            </a>
            .
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VENUES_VIEW_MODE_KEY);
    return stored === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
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
