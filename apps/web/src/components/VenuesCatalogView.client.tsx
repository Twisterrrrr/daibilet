'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Grid3X3, List, Search } from 'lucide-react';

import { InstitutionCard } from '@/components/InstitutionCard.client';
import { InstitutionList } from '@/components/InstitutionListRow.client';
import { VenuesCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { VenueCatalogCard } from '@/lib/venue-map-types';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { formatNumber, pluralCities, pluralVenues } from '@/lib/format';
import { persistSelectedCity } from '@/lib/selected-city';
import { INSTITUTION_CATALOG_TYPE_OPTIONS, normalizeVenueKind, venueTypeLabel } from '@/lib/venue-meta';
import { venueHref } from '@/lib/routes';

const VENUES_HERO_FRAMES = [
  { src: '/images/hero/hero-slavic-03.png', alt: 'Зал музея или театра' },
  { src: '/images/hero/hero-slavic-05.png', alt: 'Городская площадка' },
];

type SortMode = 'events' | 'asc' | 'desc';
type ViewMode = 'cards' | 'list';

const VENUES_VIEW_MODE_KEY = 'daibilet:venues-view-mode';

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ['events', 'По афише'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

function readStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const stored = localStorage.getItem(VENUES_VIEW_MODE_KEY);
    return stored === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
}

export function VenuesCatalogView({ venues }: { venues: VenueCatalogCard[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('events');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isPending, startTransition] = useTransition();

  const urlCity = searchParams.get('city')?.trim() || '';
  const cityReady = selectedCity?.cityReady ?? true;
  const cityPending = !urlCity && Boolean(selectedCity) && !cityReady;
  const listPending = cityPending || isPending;

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
      const fromOptions = cityOptions.find(([name]) => name.toLowerCase() === urlCity.toLowerCase());
      if (fromOptions) return fromOptions[0];
      return urlCity;
    }
    if (!cityReady || !selectedCity || selectedCity.cityValue === 'all') return 'all';
    const fromOptions = cityOptions.find(([name]) => name === selectedCity.cityValue);
    return fromOptions ? fromOptions[0] : selectedCity.cityValue;
  }, [urlCity, cityReady, selectedCity, cityOptions]);

  useEffect(() => {
    setViewMode(readStoredViewMode());
  }, []);

  const setViewModePersisted = (value: ViewMode) => {
    setViewMode(value);
    try {
      localStorage.setItem(VENUES_VIEW_MODE_KEY, value);
    } catch {
      // ignore storage errors
    }
  };

  const setCityFilter = (next: string) => {
    persistSelectedCity(next === 'all' ? 'all' : next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('city');
    else params.set('city', next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/venues?${qs}` : '/venues', { scroll: false });
    });
  };

  const typeOptions = useMemo(() => {
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

  const filteredVenues = useMemo(() => {
    if (listPending) return [];
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
  }, [venues, query, cityFilter, typeFilter, sortMode, listPending]);

  const cityCount = cityOptions.length;
  const eventsHref = catalogHrefWithSelectedCity(selectedCity?.cityValue);
  const locationsHref = venueCatalogHrefWithSelectedCity('/locations', selectedCity?.cityValue);

  return (
    <>
      <HeroLayout
        variant="imageOverlay"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Площадки' }]}
        eyebrow={
          venues.length
            ? cityCount
              ? `${pluralVenues(venues.length)} · ${pluralCities(cityCount)}`
              : pluralVenues(venues.length)
            : 'Площадки'
        }
        title="Музеи, галереи, театры и клубы"
        description="Постоянные экспозиции, временные выставки, вечерние программы. Электронные билеты без очередей."
        tone="dark"
        media={
          <HeroMedia
            frames={VENUES_HERO_FRAMES}
            overlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/50"
          />
        }
      >
        <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-3 rounded-2xl bg-white p-3 text-left text-slate-900 shadow-lg sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Театр или клуб"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <select
            value={cityPending ? '' : cityFilter}
            disabled={cityPending}
            onChange={(event) => setCityFilter(event.target.value)}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none disabled:opacity-70"
          >
            {cityPending ? <option value="">Город…</option> : null}
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
      </HeroLayout>

      <div className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex items-center gap-3 py-3">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => startTransition(() => setTypeFilter('all'))}
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
                  onClick={() => startTransition(() => setTypeFilter(active ? 'all' : option.value))}
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
            {listPending ? (
              'Обновляем список…'
            ) : (
              <>
                Найдено: {formatNumber(filteredVenues.length)}
                {venues.length ? <span className="font-normal text-slate-500"> из {formatNumber(venues.length)}</span> : null}
              </>
            )}
          </h2>
          <Link href={locationsHref} className="text-sm font-semibold text-primary-600 hover:underline">
            Локации: причалы, парки, точки старта →
          </Link>
        </div>

        {listPending ? (
          <VenuesCatalogSkeleton />
        ) : filteredVenues.length > 0 ? (
          viewMode === 'list' ? (
            <InstitutionList venues={filteredVenues} hrefFor={venueHref} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVenues.map((venue) => (
                <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
            <p className="mt-1 text-sm">Попробуйте убрать фильтры или сменить город.</p>
          </div>
        )}

        <div className="prose prose-slate mt-12 max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900">Площадки в каталоге</h2>
          <p className="text-sm leading-7 text-slate-600">
            На Дайбилет собраны музеи, галереи, театры, концертные залы и клубы с актуальной афишей и покупкой через
            билетные системы организаторов. Причалы и точки отправления речных прогулок — в разделе{' '}
            <Link href={locationsHref} className="font-semibold text-primary-600 no-underline hover:underline">
              Локации
            </Link>
            .
          </p>
        </div>

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
