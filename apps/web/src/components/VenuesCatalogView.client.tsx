'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Grid3X3, List, Search } from 'lucide-react';

import { CatalogInfiniteSentinel } from '@/components/CatalogInfiniteSentinel.client';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { InstitutionList } from '@/components/InstitutionListRow.client';
import { VenuesCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { HeroMedia } from '@/components/HeroMedia.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToGenitive } from '@/lib/city-declension';
import { formatNumber, pluralCities, pluralEvents, pluralVenues } from '@/lib/format';
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
  INSTITUTION_CATALOG_TYPE_OPTIONS,
  normalizeVenueKind,
} from '@/lib/venue-meta';
import { venueHref } from '@/lib/routes';

const VENUES_HERO_FRAMES = [
  {
    src: '/images/hero/hero-slavic-03.png',
    alt: 'Музей или театр',
  },
  {
    src: '/images/hero/hero-slavic-05.png',
    alt: 'Городская площадка',
  },
];

type ViewMode = 'cards' | 'list';

const VENUES_VIEW_MODE_KEY = 'daibilet:venues-view-mode';

const SORT_OPTIONS: Array<[VenueCatalogSort, string]> = [
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

function cityOptionsFromStats(cities: Record<string, number>): Array<[string, number]> {
  return [...Object.entries(cities)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
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

/** City-scoped shell first (cards ASAP); counts enrich is fire-and-forget at call sites. */
  prev: VenueCatalogFeedPage['venues'],
  next: VenueCatalogFeedPage['venues'],
): VenueCatalogFeedPage['venues'] {
  const seen = new Set(prev.map((item) => item.id));
  return [...prev, ...next.filter((item) => !seen.has(item.id))];
}

/** Patch event≠slots counts onto already-rendered cards (loadMore enrich). */
function patchVenueEventCounts(
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
function cityScopeKey(query: {
  family: string;
  city?: string;
  sort?: string;
  q?: string;
  limit?: number;
}): string {
  return [query.family, query.city || 'all', query.sort || 'events', query.q || '', String(query.limit || '')].join('|');
}

export function VenuesCatalogView({
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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
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
  const rawType = searchParams.get('type')?.trim() || '';
  const typeFilter = rawType ? normalizeVenueKind(rawType) : 'all';
  const cityReady = selectedCity?.cityReady ?? true;
  // `city=all` is resolved - do not wait for storage inject.
  const cityPending = !rawUrlCity && Boolean(selectedCity) && !cityReady;

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
    setViewMode(readStoredViewMode());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const feedQuery = useMemo(
    () => ({
      family: 'institution' as const,
      city: cityFetchKey || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      sort: sortMode,
      q: debouncedQuery || undefined,
      limit: VENUE_CATALOG_PAGE_SIZE,
    }),
    [cityFetchKey, typeFilter, sortMode, debouncedQuery],
  );

  const feedQueryKey = useMemo(() => venueCatalogCacheKey(feedQuery), [feedQuery]);
  const scopeKey = useMemo(() => cityScopeKey(feedQuery), [feedQuery]);

  // Filters reset cursor and refetch first page. Type-only changes prefer client filter.
  useEffect(() => {
    if (!cityReady && !rawUrlCity) {
      setCatalogLoading(false);
      return;
    }

    const isAllCitiesScope = !cityFetchKey && (urlCityAll || cityFilter === 'all');

    // SSR unfiltered page only when truly «all cities» / default sort.
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
      // SSR shell may omit event≠slots counts - enrich without blocking first paint.
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

    // Instant type chip preview from city-scoped base (same city/sort/q); cursor comes from server page.
    if (typeFilter !== 'all' && cachedBase && cachedBase.venues.length > 0) {
      const filtered = cachedBase.venues
        .filter((venue) => normalizeVenueKind(venue.type) === typeFilter)
        .slice(0, VENUE_CATALOG_PAGE_SIZE);
      setVenues(filtered);
      setTotal(Number(cachedBase.stats.types?.[typeFilter]) || filtered.length);
      setStats(cachedBase.stats);
      setCatalogLoading(false);
    } else if (!(cachedBase && typeFilter === 'all')) {
      setCatalogLoading(true);
    }
    loadMoreLock.current = false;

    const run = async () => {
      try {
        let basePage = cachedBase;
        if (!basePage) {
          // 1) Shell paint: venues + type chips without waiting on distinct product SQL.
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
            setCatalogLoading(false);
          }

          // 2) Enrich event≠slots in background - never block city paint / type preview.
          if (shellPage.countsPending && shellPage.venues.length) {
            const enrichIds = shellPage.venues.map((venue) => venue.id);
            void fetchVenueCatalogEventCounts(enrichIds, { signal: controller.signal })
              .then((counts) => {
                if (requestId !== catalogRequestId.current) return;
                const enriched = applyVenueCatalogEventCounts(shellPage, counts);
                cityBaseRef.current = { key: scopeKey, page: enriched };
                setStats(enriched.stats);
                setVenues((prev) => patchVenueEventCounts(prev, counts, new Set(enrichIds)));
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
        });
        if (typedShell.countsPending && typedShell.venues.length) {
          const typedIds = typedShell.venues.map((venue) => venue.id);
          void fetchVenueCatalogEventCounts(typedIds, { signal: controller.signal })
            .then((counts) => {
              if (requestId !== catalogRequestId.current) return;
              setVenues((prev) => patchVenueEventCounts(prev, counts, new Set(typedIds)));
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
    // Append shell cards ASAP; never block the button on event-counts or full hub SQL.
    void fetchVenueCatalogPage({ ...feedQuery, cursor, counts: false })
      .then((page) => {
        if (requestId !== catalogRequestId.current) return;
        // Transient API miss/504 → empty envelope; keep cursor so user can retry.
        if (!page.venues.length) return;
        setVenues((prev) => mergeVenuePages(prev, page.venues));
        setNextCursor(page.nextCursor);
        setTotal(page.total);
        loadMoreLock.current = false;
        setLoadingMore(false);

        if (!page.countsPending || !page.venues.length) return;
        const pageIds = new Set(page.venues.map((venue) => venue.id));
        void fetchVenueCatalogEventCounts(page.venues.map((venue) => venue.id))
          .then((counts) => {
            if (requestId !== catalogRequestId.current) return;
            setVenues((prev) => patchVenueEventCounts(prev, counts, pageIds));
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
        // If shell failed before unlock above, still release the button.
        loadMoreLock.current = false;
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, catalogLoading, feedQuery]);

  const setViewModePersisted = (value: ViewMode) => {
    setViewMode(value);
    try {
      localStorage.setItem(VENUES_VIEW_MODE_KEY, value);
    } catch {
      // ignore storage errors
    }
  };

  const setCityFilter = (next: string) => {
    // Prefer provider - resolveCityChangeNav writes `city=all` so storage inject cannot bounce.
    if (selectedCity?.setCity) {
      selectedCity.setCity(next === 'all' ? 'all' : next);
      return;
    }
    persistSelectedCity(next === 'all' ? 'all' : next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.set('city', 'all');
    else params.set('city', catalogCityQueryValue([], next));
    params.delete('scale');
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/venues?${qs}` : '/venues', { scroll: false });
    });
  };

  const setTypeFilter = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('type');
    else params.set('type', next);
    params.delete('scale');
    // Keep explicit city=all so storage inject cannot bounce back.
    if (urlCityAll && !params.get('city')) params.set('city', 'all');
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/venues?${qs}` : '/venues', { scroll: false });
    });
  };

  const listPending = (cityPending || catalogLoading) && venues.length === 0;
  const listRefreshing = (cityPending || catalogLoading) && venues.length > 0;

  // Type chips use city-scoped stats (untyped base), never global SSR leftovers.
  const typeOptions = useMemo(() => {
    const counts = stats.types || {};
    return INSTITUTION_CATALOG_TYPE_OPTIONS.filter((option) => counts[option.value]).map((option) => ({
      ...option,
      count: counts[option.value] || 0,
    }));
  }, [stats.types]);

  const cityCount = cityOptions.length;
  const eventsHref = catalogHrefWithSelectedCity(
    selectedCity?.selectedDestination?.slug || selectedCity?.cityValue,
  );
  const locationsHref = venueCatalogHrefWithSelectedCity(
    '/locations',
    selectedCity?.selectedDestination?.slug || selectedCity?.cityValue,
  );
  const cityName = cityFilter !== 'all' ? cityFilter : null;
  const heroTitle = cityName
    ? `Музеи, театры и пространства ${cityToGenitive(cityName)}`
    : 'Музеи, театры и пространства';
  const heroTotal = stats.venues || total;
  const scopedEvents = useMemo(
    () =>
      venues.reduce(
        (sum, venue) => sum + (venue.eventsPending ? 0 : venue.events || 0),
        0,
      ),
    [venues],
  );

  return (
    <>
      <HeroLayout
        variant="imageOverlay"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Площадки' }]}
        eyebrow={
          heroTotal
            ? cityCount
              ? `${pluralVenues(heroTotal)} · ${pluralCities(cityCount)}`
              : pluralVenues(heroTotal)
            : 'Площадки'
        }
        title={heroTitle}
        description={
          <>
            Постоянные экспозиции, временные выставки, вечерние программы.
            <br />
            Электронные билеты без очередей.
          </>
        }
        tone="dark"
        media={
          <HeroMedia
            frames={VENUES_HERO_FRAMES}
            overlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/50"
          />
        }
      >
        {!listPending && heroTotal ? (
          <p className="mx-auto mt-4 max-w-4xl text-sm font-medium text-white/85">
            В афише {pluralVenues(heroTotal)}
            {scopedEvents > 0 ? ` · ${pluralEvents(scopedEvents)}` : ''}
          </p>
        ) : null}
        <div className="mt-6 flex w-full max-w-5xl flex-col gap-3 rounded-2xl bg-white p-3 text-left text-slate-900 shadow-lg sm:flex-row sm:items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
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
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none disabled:opacity-70 sm:shrink-0"
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
            onChange={(event) => setSortMode(event.target.value as VenueCatalogSort)}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none sm:shrink-0"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {typeOptions.length ? (
          <div className="mt-4 flex w-full max-w-5xl flex-wrap justify-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25'
              }`}
            >
              Все места
            </button>
            {typeOptions.map((option) => {
              const active = typeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(active ? 'all' : option.value)}
                  className={`inline-flex h-10 items-center gap-1 rounded-full px-4 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-slate-900'
                      : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25'
                  }`}
                >
                  {option.label}
                  <span className="text-xs opacity-75">({option.count})</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </HeroLayout>

      <div className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex items-center justify-end gap-3 py-3">
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
          <Link href={locationsHref} className="text-sm font-semibold text-primary-600 hover:underline">
            Локации: причалы, парки, точки старта →
          </Link>
        </div>

        {listPending ? (
          <VenuesCatalogSkeleton count={8} />
        ) : venues.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <InstitutionList venues={venues} hrefFor={venueHref} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {venues.map((venue) => (
                  <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
                ))}
              </div>
            )}
            {loadingMore ? <div className="mt-6"><VenuesCatalogSkeleton count={3} /></div> : null}
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
            <p className="mt-1 text-sm">Попробуйте убрать фильтры или сменить город.</p>
          </div>
        )}

        <div className="prose prose-slate mt-12 max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900">Площадки в каталоге</h2>
          <p className="text-sm leading-7 text-slate-600">
            На Дайбилет собраны музеи, галереи, театры, концертные залы и клубы с актуальной афишей и покупкой через
            билетные системы организаторов. Причалы и точки отправления речных прогулок - в разделе{' '}
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
