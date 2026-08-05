'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Map as MapIcon, Search } from 'lucide-react';

import { CatalogInfiniteSentinel } from '@/components/CatalogInfiniteSentinel.client';
import { LocationCard } from '@/components/LocationCard.client';
import { LocationsCatalogMap } from '@/components/LocationsCatalogMap.client';
import { LocationsCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';
import { formatCountFloorTenPlus, formatNumber, pluralCities } from '@/lib/format';
import { persistSelectedCity, resolveCatalogCityFilter } from '@/lib/selected-city';
import {
  fetchVenueCatalogPage,
  fetchVenueCatalogPins,
  VENUE_CATALOG_PAGE_SIZE,
  type VenueCatalogFeedPage,
  type VenueCatalogMapPin,
  type VenueCatalogSort,
} from '@/lib/venue-catalog-feed';
import {
  LOCATION_CATALOG_TYPE_OPTIONS,
  LOCATION_LOGISTICS_OPTIONS,
  normalizeVenueKind,
  venueTypeLabel,
  type LocationLogisticsGroup,
} from '@/lib/venue-meta';
import { venueHref } from '@/lib/routes';

const SORT_OPTIONS: Array<[VenueCatalogSort, string]> = [
  ['events', 'По афише'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

function cityOptionsFromStats(cities: Record<string, number>): Array<[string, number]> {
  return [...Object.entries(cities)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}

export function LocationsCatalogView({ initialPage }: { initialPage: VenueCatalogFeedPage }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortMode, setSortMode] = useState<VenueCatalogSort>('events');
  const [isPending, startTransition] = useTransition();
  const [venues, setVenues] = useState(initialPage.venues);
  const [total, setTotal] = useState(initialPage.total);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [stats, setStats] = useState(initialPage.stats);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPins, setMapPins] = useState<VenueCatalogMapPin[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const loadMoreLock = useRef(false);

  const urlCity = searchParams.get('city')?.trim() || '';
  const rawLogistics = searchParams.get('logistics')?.trim() || '';
  const logisticsFilter: LocationLogisticsGroup | 'all' =
    rawLogistics === 'pier' || rawLogistics === 'bus' || rawLogistics === 'walking' ? rawLogistics : 'all';
  // Kind chips are primary; logistics stays a secondary quick-toggle (does not hide kinds).
  const rawType = searchParams.get('type')?.trim() || '';
  const typeFilter = rawType ? normalizeVenueKind(rawType) : 'all';
  const cityReady = selectedCity?.cityReady ?? true;

  const cityOptions = useMemo(() => cityOptionsFromStats(stats.cities || {}), [stats.cities]);

  const cityFilter = useMemo(() => {
    if (urlCity) {
      return resolveCatalogCityFilter(urlCity, cityOptions, selectedCity?.cityLabel);
    }
    if (!cityReady || !selectedCity || selectedCity.cityValue === 'all') return 'all';
    return resolveCatalogCityFilter(selectedCity.cityValue, cityOptions, selectedCity.cityLabel);
  }, [urlCity, cityReady, selectedCity, cityOptions]);

  const cityFetchKey = useMemo(() => {
    if (urlCity && urlCity !== 'all') return urlCity;
    if (cityFilter !== 'all') return cityFilter;
    const dest = selectedCity?.selectedDestination;
    if (!dest || selectedCity?.cityValue === 'all') return '';
    return dest.sourceSlug || dest.slug || selectedCity.cityLabel || '';
  }, [urlCity, cityFilter, selectedCity]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Desktop: open map by default when enough pins exist - pins load lazily below.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (mq.matches) setShowMap(true);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const feedQuery = useMemo(
    () => ({
      family: 'location' as const,
      city: cityFetchKey || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      logistics: logisticsFilter !== 'all' ? logisticsFilter : undefined,
      sort: sortMode,
      q: debouncedQuery || undefined,
      limit: VENUE_CATALOG_PAGE_SIZE,
    }),
    [cityFetchKey, typeFilter, logisticsFilter, sortMode, debouncedQuery],
  );

  // Filters reset cursor and refetch first page server-side (not client filter on 5k).
  useEffect(() => {
    if (!cityReady && !urlCity) return;
    const controller = new AbortController();
    setCatalogLoading(true);
    loadMoreLock.current = false;
    fetchVenueCatalogPage(feedQuery, { signal: controller.signal })
      .then((page) => {
        setVenues(page.venues);
        setTotal(page.total);
        setNextCursor(page.nextCursor);
        setStats(page.stats);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [feedQuery, cityReady, urlCity]);

  // Map pins: only when showMap - separate lean mode=pins request.
  useEffect(() => {
    if (!showMap) return;
    if (!cityReady && !urlCity) return;
    const controller = new AbortController();
    setMapLoading(true);
    fetchVenueCatalogPins(
      {
        family: 'location',
        city: cityFetchKey || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        logistics: logisticsFilter !== 'all' ? logisticsFilter : undefined,
        q: debouncedQuery || undefined,
      },
      { signal: controller.signal },
    )
      .then((pins) => setMapPins(pins))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setMapLoading(false);
      });
    return () => controller.abort();
  }, [showMap, cityFetchKey, typeFilter, logisticsFilter, debouncedQuery, cityReady, urlCity]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore || catalogLoading || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    fetchVenueCatalogPage({ ...feedQuery, cursor: nextCursor })
      .then((page) => {
        setVenues((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...page.venues.filter((item) => !seen.has(item.id))];
        });
        setNextCursor(page.nextCursor);
        setTotal(page.total);
        if (page.stats.venues) setStats(page.stats);
      })
      .catch(() => undefined)
      .finally(() => {
        loadMoreLock.current = false;
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, catalogLoading, feedQuery]);

  const cityPending = !urlCity && Boolean(selectedCity) && !cityReady;
  const listPending = cityPending || isPending || catalogLoading;

  const setCityFilter = (next: string) => {
    persistSelectedCity(next === 'all' ? 'all' : next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('city');
    else params.set('city', next);
    // Facets are city-scoped; drop stale filters.
    params.delete('type');
    params.delete('logistics');
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

  const setLogisticsFilter = (next: LocationLogisticsGroup | 'all') => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('logistics');
    else params.set('logistics', next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/locations?${qs}` : '/locations', { scroll: false });
    });
  };

  const typeOptions = useMemo(() => {
    const counts = stats.types || {};
    const known = LOCATION_CATALOG_TYPE_OPTIONS.filter((option) => counts[option.value]).map((option) => ({
      ...option,
      count: counts[option.value] || 0,
    }));
    const knownValues = new Set(known.map((option) => option.value));
    const extras = Object.entries(counts)
      .filter(([value, count]) => Boolean(count) && !knownValues.has(value) && value !== 'online')
      .map(([value, count]) => ({
        value,
        label: venueTypeLabel(value),
        template: 'location' as const,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
    return [...known, ...extras];
  }, [stats.types]);

  const logisticsOptions = useMemo(() => {
    const counts = stats.logistics || {};
    const scopedTotal = stats.venues || total;
    return LOCATION_LOGISTICS_OPTIONS.filter(
      (option) => option.value === 'all' || counts[option.value],
    ).map((option) => ({
      ...option,
      count: option.value === 'all' ? scopedTotal : counts[option.value] || 0,
    }));
  }, [stats.logistics, stats.venues, total]);

  const mapPinsForUi = useMemo(
    () =>
      mapPins.map((pin) => ({
        id: pin.id,
        title: pin.name,
        href: venueHref({ id: pin.id, slug: pin.slug, name: pin.name, type: pin.kind }),
        latitude: pin.latitude,
        longitude: pin.longitude,
        typeLabel: venueTypeLabel(pin.kind, pin.name),
      })),
    [mapPins],
  );

  const onPinClick = (id: string) => {
    setSelectedPinId(id);
    const node = cardRefs.current.get(id);
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

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
  const heroTotal = stats.venues || total;

  const listBlock = listPending ? (
    <LocationsCatalogSkeleton />
  ) : venues.length > 0 ? (
    <>
      <div className="grid grid-cols-1 gap-3">
        {venues.map((venue) => (
          <div
            key={venue.id}
            ref={(node) => {
              if (node) cardRefs.current.set(venue.id, node);
              else cardRefs.current.delete(venue.id);
            }}
            className={selectedPinId === venue.id ? 'ring-2 ring-primary-500/40 rounded-2xl' : undefined}
          >
            <LocationCard venue={venue} href={venueHref(venue)} nextSlot={venue.nextSlot} />
          </div>
        ))}
      </div>
      {loadingMore ? <div className="mt-4"><LocationsCatalogSkeleton count={3} /></div> : null}
      <CatalogInfiniteSentinel enabled={Boolean(nextCursor) && !loadingMore} onIntersect={loadMore} />
    </>
  ) : (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
      <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
      <p className="mt-1 text-sm">Попробуйте убрать фильтры или изменить запрос</p>
    </div>
  );

  return (
    <>
      {/* Mobile template: dense hero, kind chips primary + logistics secondary. */}
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Локации' }]}
        eyebrow={`${formatCountFloorTenPlus(heroTotal)} локаций · ${pluralCities(cityCount)}`}
        title={heroTitle}
        description={cityName ? heroDescription : 'Места встречи и точки старта. Город - в шапке.'}
        tone="light"
        className="bg-slate-50"
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              typeFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Все точки
            <span className="text-xs opacity-75">({heroTotal})</span>
          </button>
          {typeOptions.map((option) => {
            const active = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(active ? 'all' : option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {option.label}
                <span className="text-xs opacity-75">({option.count})</span>
              </button>
            );
          })}
        </div>

        {logisticsOptions.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {logisticsOptions.map((option) => {
              const active = logisticsFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLogisticsFilter(active && option.value !== 'all' ? 'all' : option.value)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
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
                Найдено: {formatNumber(total)}
                {venues.length && venues.length < total ? (
                  <span className="font-normal text-slate-500"> · показано {formatNumber(venues.length)}</span>
                ) : null}
              </>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMap((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                showMap
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={showMap}
            >
              <MapIcon className="h-4 w-4" />
              {showMap ? 'Скрыть карту' : 'Показать картой'}
            </button>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as VenueCatalogSort)}
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

        {showMap ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,42%)] lg:items-start">
            <div className="min-w-0">{listBlock}</div>
            <aside className="sticky top-[calc(var(--site-header-height)+1rem)] hidden self-start lg:block">
              {mapLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  Загружаем точки карты…
                </div>
              ) : mapPinsForUi.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <LocationsCatalogMap
                    pins={mapPinsForUi}
                    selectedId={selectedPinId}
                    onPinClick={onPinClick}
                    layoutKey={`${showMap}-${mapPinsForUi.length}-${cityFilter}-${typeFilter}-${logisticsFilter}`}
                    className="h-[min(70vh,640px)] w-full"
                  />
                  <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                    {formatNumber(mapPinsForUi.length)} точек с координатами на карте
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  У отфильтрованных точек пока нет координат для карты.
                </div>
              )}
            </aside>
            {/* Mobile map panel when toggle on */}
            <div className="lg:hidden">
              {mapLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Загружаем карту…
                </div>
              ) : mapPinsForUi.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <LocationsCatalogMap
                    pins={mapPinsForUi}
                    selectedId={selectedPinId}
                    onPinClick={onPinClick}
                    layoutKey={`m-${showMap}-${mapPinsForUi.length}`}
                    className="h-72 w-full"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Нет координат для карты.
                </div>
              )}
            </div>
          </div>
        ) : (
          listBlock
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
