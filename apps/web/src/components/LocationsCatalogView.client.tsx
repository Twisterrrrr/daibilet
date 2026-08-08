'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Search } from 'lucide-react';

import { CatalogInfiniteSentinel } from '@/components/CatalogInfiniteSentinel.client';
import { LocationCard } from '@/components/LocationCard.client';
import { LocationsCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';
import { formatNumber, pluralCities } from '@/lib/format';
import {
  catalogCityQueryValue,
  isAllCitiesQuery,
  persistSelectedCity,
  resolveCatalogCityFilter,
} from '@/lib/selected-city';
import {
  applyVenueCatalogEventCounts,
  fetchVenueCatalogEventCounts,
  fetchVenueCatalogPage,
  venueCatalogCacheKey,
  VENUE_CATALOG_PAGE_SIZE,
  type VenueCatalogFeedPage,
  type VenueCatalogFeedQuery,
  type VenueCatalogSort,
} from '@/lib/venue-catalog-feed';
import {
  LOCATION_CATALOG_TYPE_OPTIONS,
  normalizeVenueKind,
  venueTypeLabel,
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

function mergeLocationPages(
  prev: VenueCatalogFeedPage['venues'],
  next: VenueCatalogFeedPage['venues'],
): VenueCatalogFeedPage['venues'] {
  const seen = new Set(prev.map((item) => item.id));
  return [...prev, ...next.filter((item) => !seen.has(item.id))];
}

/** Patch event counts onto already-rendered cards (shell enrich / loadMore). */
function patchLocationEventCounts(
  prev: VenueCatalogFeedPage['venues'],
  counts: Record<string, number>,
  pageIds: Set<string>,
): VenueCatalogFeedPage['venues'] {
  if (!pageIds.size) return prev;
  return prev.map((venue) => {
    if (!pageIds.has(venue.id)) return venue;
    return {
      ...venue,
      events: counts[venue.id] ?? venue.events ?? 0,
      eventsPending: false,
    };
  });
}

/** City scope for type-chip cache (type excluded). */
function locationScopeKey(query: Pick<VenueCatalogFeedQuery, 'city' | 'sort' | 'q' | 'limit'>): string {
  return ['location', query.city || 'all', query.sort || 'events', query.q || '', String(query.limit || '')].join('|');
}

function applyInitialPage(
  page: VenueCatalogFeedPage,
  setters: {
    setVenues: (v: VenueCatalogFeedPage['venues']) => void;
    setTotal: (n: number) => void;
    setNextCursor: (c: string | null) => void;
    setStats: (s: VenueCatalogFeedPage['stats']) => void;
  },
) {
  setters.setVenues(page.venues);
  setters.setTotal(page.total);
  setters.setNextCursor(page.nextCursor);
  setters.setStats(page.stats);
}

export function LocationsCatalogView({
  initialPage,
  initialQueryKey = '',
}: {
  initialPage: VenueCatalogFeedPage;
  initialQueryKey?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortMode, setSortMode] = useState<VenueCatalogSort>('events');
  const [, startTransition] = useTransition();
  const [venues, setVenues] = useState(initialPage.venues);
  const [total, setTotal] = useState(initialPage.total);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [stats, setStats] = useState(initialPage.stats);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreLock = useRef(false);
  const catalogRequestId = useRef(0);
  const cityBaseRef = useRef<{ key: string; page: VenueCatalogFeedPage } | null>(null);

  const rawUrlCity = searchParams.get('city')?.trim() || '';
  const urlCityAll = isAllCitiesQuery(rawUrlCity);
  const urlCity = urlCityAll ? '' : rawUrlCity;
  // ?logistics= ignored: secondary logistics chips removed until product asks again.
  const rawType = searchParams.get('type')?.trim() || '';
  const typeFilter = rawType ? normalizeVenueKind(rawType) : 'all';
  const cityReady = selectedCity?.cityReady ?? true;

  const cityOptions = useMemo(() => cityOptionsFromStats(stats.cities || {}), [stats.cities]);

  const cityFilter = useMemo(() => {
    if (urlCityAll) return 'all';
    if (urlCity) {
      return resolveCatalogCityFilter(urlCity, cityOptions, selectedCity?.cityLabel);
    }
    if (!cityReady || !selectedCity || selectedCity.cityValue === 'all') return 'all';
    return resolveCatalogCityFilter(selectedCity.cityValue, cityOptions, selectedCity.cityLabel);
  }, [urlCity, urlCityAll, cityReady, selectedCity, cityOptions]);

  // Prefer ASCII slug - Cyrillic soft-nav hangs catalog fetch.
  const cityFetchKey = useMemo(() => {
    if (urlCityAll) return '';
    if (urlCity) return urlCity;
    if (cityFilter === 'all') return '';
    return catalogCityQueryValue(selectedCity?.destinations || [], cityFilter);
  }, [urlCity, urlCityAll, cityFilter, selectedCity?.destinations]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const feedQuery = useMemo(
    () => ({
      family: 'location' as const,
      city: cityFetchKey || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      sort: sortMode,
      q: debouncedQuery || undefined,
      limit: VENUE_CATALOG_PAGE_SIZE,
    }),
    [cityFetchKey, typeFilter, sortMode, debouncedQuery],
  );

  const feedQueryKey = useMemo(() => venueCatalogCacheKey(feedQuery), [feedQuery]);
  const scopeKey = useMemo(() => locationScopeKey(feedQuery), [feedQuery]);

  // City-scoped shell + instant type filter (same pattern as /venues).
  useEffect(() => {
    if (!cityReady && !rawUrlCity) {
      setCatalogLoading(false);
      return;
    }

    const isAllCitiesScope = !cityFetchKey && (urlCityAll || cityFilter === 'all');

    if (
      isAllCitiesScope &&
      typeFilter === 'all' &&
      !debouncedQuery &&
      sortMode === 'events' &&
      initialQueryKey &&
      feedQueryKey === initialQueryKey &&
      initialPage.venues.length > 0
    ) {
      catalogRequestId.current += 1;
      applyInitialPage(initialPage, { setVenues, setTotal, setNextCursor, setStats });
      cityBaseRef.current = { key: scopeKey, page: initialPage };
      setCatalogLoading(false);
      loadMoreLock.current = false;
      if (initialPage.countsPending) {
        const requestId = catalogRequestId.current;
        const controller = new AbortController();
        void fetchVenueCatalogEventCounts(
          initialPage.venues.map((venue) => venue.id),
          { signal: controller.signal },
        )
          .then((counts) => {
            if (requestId !== catalogRequestId.current) return;
            const enriched = applyVenueCatalogEventCounts(initialPage, counts);
            cityBaseRef.current = { key: scopeKey, page: enriched };
            setVenues(enriched.venues);
          })
          .catch(() => undefined);
        return () => {
          controller.abort();
        };
      }
      return;
    }

    const controller = new AbortController();
    const requestId = ++catalogRequestId.current;
    const cachedBase = cityBaseRef.current?.key === scopeKey ? cityBaseRef.current.page : null;
    const scopeChanged = cityBaseRef.current != null && cityBaseRef.current.key !== scopeKey;

    // Instant type chip preview from city-scoped base; cursor comes from typed server page.
    if (typeFilter !== 'all' && cachedBase && cachedBase.venues.length > 0) {
      const filtered = cachedBase.venues
        .filter((venue) => normalizeVenueKind(venue.type) === typeFilter)
        .slice(0, VENUE_CATALOG_PAGE_SIZE);
      setVenues(filtered);
      setTotal(Number(cachedBase.stats.types?.[typeFilter]) || filtered.length);
      setNextCursor(null);
      setStats(cachedBase.stats);
      setCatalogLoading(false);
    } else if (cachedBase && typeFilter === 'all') {
      setVenues(cachedBase.venues);
      setTotal(cachedBase.total);
      setNextCursor(cachedBase.nextCursor);
      setStats(cachedBase.stats);
      setCatalogLoading(false);
    } else {
      // City/scope change: drop previous city cards immediately (not cold SSR - stale client list).
      if (scopeChanged || !cachedBase) {
        setVenues([]);
        setNextCursor(null);
        setTotal(0);
      }
      setCatalogLoading(true);
    }
    loadMoreLock.current = false;

    const run = async () => {
      try {
        let basePage = cachedBase;
        if (!basePage) {
          // 1) Shell paint: locations + type chips without waiting on distinct product SQL.
          const shellQuery = { ...feedQuery, type: undefined, counts: false as const };
          const shellPage = await fetchVenueCatalogPage(shellQuery, { signal: controller.signal });
          if (requestId !== catalogRequestId.current) return;
          cityBaseRef.current = { key: scopeKey, page: shellPage };
          setStats(shellPage.stats);
          if (typeFilter === 'all') {
            setVenues(shellPage.venues);
            setTotal(shellPage.total);
            setNextCursor(shellPage.nextCursor);
            setCatalogLoading(false);
          } else {
            const filtered = shellPage.venues
              .filter((venue) => normalizeVenueKind(venue.type) === typeFilter)
              .slice(0, VENUE_CATALOG_PAGE_SIZE);
            setVenues(filtered);
            setTotal(Number(shellPage.stats.types?.[typeFilter]) || filtered.length);
            setNextCursor(null);
            setCatalogLoading(false);
          }

          // 2) Enrich event counts in background - never block city paint / type preview.
          if (shellPage.countsPending && shellPage.venues.length) {
            const enrichIds = shellPage.venues.map((venue) => venue.id);
            void fetchVenueCatalogEventCounts(enrichIds, { signal: controller.signal })
              .then((counts) => {
                if (requestId !== catalogRequestId.current) return;
                const enriched = applyVenueCatalogEventCounts(shellPage, counts);
                cityBaseRef.current = { key: scopeKey, page: enriched };
                setStats(enriched.stats);
                setVenues((prev) => patchLocationEventCounts(prev, counts, new Set(enrichIds)));
              })
              .catch(() => undefined);
          }
          basePage = shellPage;
        } else {
          setStats(basePage.stats);
        }

        if (typeFilter === 'all') {
          setVenues(basePage.venues);
          setTotal(basePage.total);
          setNextCursor(basePage.nextCursor);
          return;
        }

        // Type filter: server shell page for cursor; enrich counts in background.
        const typedShell = await fetchVenueCatalogPage(
          { ...feedQuery, counts: false },
          { signal: controller.signal },
        );
        if (requestId !== catalogRequestId.current) return;
        setVenues(typedShell.venues);
        setTotal(typedShell.total);
        setNextCursor(typedShell.nextCursor);
        setStats({
          ...typedShell.stats,
          types: basePage.stats.types,
          cities: basePage.stats.cities,
          venues: basePage.stats.venues,
          events: basePage.stats.events,
        });
        if (typedShell.countsPending && typedShell.venues.length) {
          const typedIds = typedShell.venues.map((venue) => venue.id);
          void fetchVenueCatalogEventCounts(typedIds, { signal: controller.signal })
            .then((counts) => {
              if (requestId !== catalogRequestId.current) return;
              setVenues((prev) => patchLocationEventCounts(prev, counts, new Set(typedIds)));
            })
            .catch(() => undefined);
        }
      } catch (error: unknown) {
        if (requestId !== catalogRequestId.current) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
      } finally {
        if (requestId === catalogRequestId.current) setCatalogLoading(false);
      }
    };

    void run();
    return () => {
      controller.abort();
    };
  }, [
    feedQuery,
    feedQueryKey,
    scopeKey,
    cityReady,
    rawUrlCity,
    urlCityAll,
    cityFilter,
    cityFetchKey,
    typeFilter,
    debouncedQuery,
    sortMode,
    initialQueryKey,
    initialPage,
  ]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore || catalogLoading || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    const cursor = nextCursor;
    const requestId = catalogRequestId.current;
    // Append shell cards ASAP; never block the button on event-counts SQL.
    void fetchVenueCatalogPage({ ...feedQuery, cursor, counts: false })
      .then((page) => {
        if (requestId !== catalogRequestId.current) return;
        // Transient API miss/504 → empty envelope; keep cursor so user can retry.
        if (!page.venues.length) return;
        setVenues((prev) => mergeLocationPages(prev, page.venues));
        setNextCursor(page.nextCursor);
        setTotal(page.total);
        loadMoreLock.current = false;
        setLoadingMore(false);

        if (!page.countsPending || !page.venues.length) return;
        const pageIds = new Set(page.venues.map((venue) => venue.id));
        void fetchVenueCatalogEventCounts(page.venues.map((venue) => venue.id))
          .then((counts) => {
            if (requestId !== catalogRequestId.current) return;
            setVenues((prev) => patchLocationEventCounts(prev, counts, pageIds));
          })
          .catch(() => {
            if (requestId !== catalogRequestId.current) return;
            setVenues((prev) =>
              prev.map((venue) =>
                pageIds.has(venue.id) ? { ...venue, eventsPending: false } : venue,
              ),
            );
          });
      })
      .catch(() => undefined)
      .finally(() => {
        loadMoreLock.current = false;
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, catalogLoading, feedQuery]);

  const cityPending = !rawUrlCity && Boolean(selectedCity) && !cityReady;
  const listPending = (cityPending || catalogLoading) && venues.length === 0;
  const listRefreshing = (cityPending || catalogLoading) && venues.length > 0;

  const setCityFilter = (next: string) => {
    persistSelectedCity(next === 'all' ? 'all' : next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.set('city', 'all');
    else {
      params.set(
        'city',
        catalogCityQueryValue(selectedCity?.destinations || [], next),
      );
    }
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
    params.delete('logistics');
    // Keep explicit city=all so storage inject cannot bounce back.
    if (urlCityAll && !params.get('city')) params.set('city', 'all');
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

  const cityCount = cityOptions.length;
  const eventsHref = catalogHrefWithSelectedCity(
    selectedCity?.selectedDestination?.slug || selectedCity?.cityValue,
  );
  const venuesHref = venueCatalogHrefWithSelectedCity(
    '/venues',
    selectedCity?.selectedDestination?.slug || selectedCity?.cityValue,
  );
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {venues.map((venue) => (
          <LocationCard key={venue.id} venue={venue} href={venueHref(venue)} nextSlot={venue.nextSlot} />
        ))}
      </div>
      {loadingMore ? <div className="mt-4"><LocationsCatalogSkeleton count={2} /></div> : null}
      {nextCursor ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore || catalogLoading}
            className="inline-flex min-h-11 w-full max-w-sm items-center justify-center rounded-full bg-primary-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            {loadingMore
              ? 'Загружаем…'
              : `Показать ещё ${Math.min(VENUE_CATALOG_PAGE_SIZE, Math.max(total - venues.length, 0)) || VENUE_CATALOG_PAGE_SIZE}`}
          </button>
          <p className="text-xs text-slate-500">
            Показано {formatNumber(venues.length)} из {formatNumber(total)}
          </p>
        </div>
      ) : null}
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
      {/* Mobile template: dense hero, kind chips primary. */}
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Локации' }]}
        eyebrow={`${formatNumber(heroTotal)} локаций · ${pluralCities(cityCount)}`}
        title={heroTitle}
        description={cityName ? heroDescription : 'Места встречи и точки старта. Город - в шапке.'}
        tone="light"
        className="bg-slate-50"
      >
        {/* Mobile: one horizontal chip rail (not a tall wrap stack). Desktop: wrap as before. */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
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
            {listPending || listRefreshing ? (
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

        {listBlock}

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
