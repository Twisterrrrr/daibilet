'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { LocationCard } from '@/components/LocationCard.client';
import { LocationsCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { PlacesSearch } from '@/components/PlacesSearch.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
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
  parseVenueCatalogPageParam,
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
  ['events', 'По событиям'],
  ['asc', 'А–Я'],
  ['desc', 'Я–А'],
];

function cityOptionsFromStats(cities: Record<string, number>): Array<[string, number]> {
  return [...Object.entries(cities)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}

/** Patch event counts onto already-rendered cards (shell enrich). */
function patchLocationEventCounts(
  prev: VenueCatalogFeedPage['venues'],
  counts: Record<string, number>,
  pageIds: Set<string>,
  stopCounts: Record<string, number> = {},
): VenueCatalogFeedPage['venues'] {
  if (!pageIds.size) return prev;
  return prev.map((venue) => {
    if (!pageIds.has(venue.id)) return venue;
    const stops = Number(stopCounts[venue.id] ?? venue.stopEventCount ?? 0) || 0;
    return {
      ...venue,
      events: counts[venue.id] ?? venue.events ?? 0,
      stopEventCount: stops > 0 ? stops : undefined,
      eventsPending: false,
    };
  });
}

/** City scope for type-chip cache (type + page excluded). */
function locationScopeKey(query: Pick<VenueCatalogFeedQuery, 'city' | 'sort' | 'q' | 'limit'>): string {
  return ['location', query.city || 'all', query.sort || 'events', query.q || '', String(query.limit || '')].join('|');
}

function applyListPage(
  page: VenueCatalogFeedPage,
  setters: {
    setVenues: (v: VenueCatalogFeedPage['venues']) => void;
    setTotal: (n: number) => void;
    setStats: (s: VenueCatalogFeedPage['stats']) => void;
  },
) {
  setters.setVenues(page.venues);
  setters.setTotal(page.total);
  setters.setStats(page.stats);
}

function searchParamsRecord(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((value, key) => {
    out[key] = value;
  });
  return out;
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
  const [sortMode, setSortMode] = useState<VenueCatalogSort>('events');
  const [, startTransition] = useTransition();
  const [venues, setVenues] = useState(initialPage.venues);
  const [total, setTotal] = useState(initialPage.total);
  const [stats, setStats] = useState(initialPage.stats);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogRequestId = useRef(0);
  const cityBaseRef = useRef<{ key: string; page: VenueCatalogFeedPage } | null>(null);

  const rawUrlCity = searchParams.get('city')?.trim() || '';
  const urlCityAll = isAllCitiesQuery(rawUrlCity);
  const urlCity = urlCityAll ? '' : rawUrlCity;
  const rawType = searchParams.get('type')?.trim() || '';
  const typeFilter = rawType ? normalizeVenueKind(rawType) : 'all';
  const urlPage = parseVenueCatalogPageParam(searchParams.get('page'));
  // Local page drives the list; soft-nav <Link ?page=> remounts via loading.tsx and feels hung.
  const [listPage, setListPage] = useState(urlPage);
  const cityReady = selectedCity?.cityReady ?? true;

  useEffect(() => {
    setListPage(urlPage);
  }, [urlPage]);

  useEffect(() => {
    const onPopState = () => {
      setListPage(parseVenueCatalogPageParam(new URLSearchParams(window.location.search).get('page')));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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

  const replaceCatalogUrl = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/locations?${qs}` : '/locations', { scroll: false });
    });
  };

  const writePageToUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    const href = qs ? `/locations?${qs}` : '/locations';
    window.history.pushState(null, '', href);
  };

  const goToListPage = (page: number) => {
    const next = Math.max(1, page);
    setListPage(next);
    writePageToUrl(next);
    window.scrollTo(0, 0);
  };

  // Search / sort change → back to page 1 (shareable URL). Skip mount so ?page=N stays shareable.
  const prevFiltersRef = useRef({ sort: sortMode });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed = prev.sort !== sortMode;
    prevFiltersRef.current = { sort: sortMode };
    if (!changed || listPage <= 1) return;
    setListPage(1);
    writePageToUrl(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional filter-drift reset
  }, [sortMode, listPage]);

  const feedQuery = useMemo(
    () => ({
      family: 'location' as const,
      city: cityFetchKey || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      sort: sortMode,
      page: listPage,
      limit: VENUE_CATALOG_PAGE_SIZE,
    }),
    [cityFetchKey, typeFilter, sortMode, listPage],
  );

  const feedQueryKey = useMemo(() => venueCatalogCacheKey(feedQuery), [feedQuery]);
  const scopeKey = useMemo(() => locationScopeKey(feedQuery), [feedQuery]);

  // City-scoped shell + classic ?page= (type chips / progressive counts preserved).
  useEffect(() => {
    if (!cityReady && !rawUrlCity) {
      setCatalogLoading(false);
      return;
    }

    const isAllCitiesScope = !cityFetchKey && (urlCityAll || cityFilter === 'all');
    const isDefaultFirstPage =
      isAllCitiesScope &&
      typeFilter === 'all' &&
      listPage === 1 &&
      sortMode === 'events' &&
      initialQueryKey &&
      feedQueryKey === initialQueryKey &&
      initialPage.venues.length > 0;

    if (isDefaultFirstPage) {
      catalogRequestId.current += 1;
      applyListPage(initialPage, { setVenues, setTotal, setStats });
      cityBaseRef.current = { key: scopeKey, page: initialPage };
      setCatalogLoading(false);
      if (initialPage.countsPending) {
        const requestId = catalogRequestId.current;
        const controller = new AbortController();
        void fetchVenueCatalogEventCounts(
          initialPage.venues.map((venue) => venue.id),
          { signal: controller.signal },
        )
          .then(({ counts, stopCounts }) => {
            if (requestId !== catalogRequestId.current) return;
            const enriched = applyVenueCatalogEventCounts(initialPage, counts, stopCounts);
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

    // Instant type chip preview only on page 1 from city-scoped base.
    if (listPage === 1 && typeFilter !== 'all' && cachedBase && cachedBase.venues.length > 0) {
      const filtered = cachedBase.venues
        .filter((venue) => normalizeVenueKind(venue.type) === typeFilter)
        .slice(0, VENUE_CATALOG_PAGE_SIZE);
      setVenues(filtered);
      setTotal(Number(cachedBase.stats.types?.[typeFilter]) || filtered.length);
      setStats(cachedBase.stats);
      setCatalogLoading(false);
    } else if (listPage === 1 && cachedBase && typeFilter === 'all') {
      setVenues(cachedBase.venues);
      setTotal(cachedBase.total);
      setStats(cachedBase.stats);
      setCatalogLoading(false);
    } else {
      // Stale-first: keep SSR / previous cards while city-hydrate or page fetch runs.
      // Clearing to [] made /locations feel «hung» after SelectedCity bootstrap.
      setCatalogLoading(true);
    }

    const enrichPage = (page: VenueCatalogFeedPage) => {
      if (!page.countsPending || !page.venues.length) return;
      const pageIds = new Set(page.venues.map((venue) => venue.id));
      void fetchVenueCatalogEventCounts(page.venues.map((venue) => venue.id), {
        signal: controller.signal,
      })
        .then(({ counts, stopCounts }) => {
          if (requestId !== catalogRequestId.current) return;
          setVenues((prev) => patchLocationEventCounts(prev, counts, pageIds, stopCounts));
        })
        .catch(() => undefined);
    };

    const run = async () => {
      try {
        let basePage = cachedBase;
        const needsExactSlice = typeFilter !== 'all' || listPage > 1;

        // Page>1 / typed: fetch the slice first. Do not block on city shell (was sequential hang).
        if (needsExactSlice) {
          const slice = await fetchVenueCatalogPage(
            { ...feedQuery, counts: false },
            { signal: controller.signal },
          );
          if (requestId !== catalogRequestId.current) return;
          setVenues(slice.venues);
          setTotal(slice.total);
          if (basePage) {
            setStats({
              ...slice.stats,
              types: basePage.stats.types,
              cities: basePage.stats.cities,
              venues: basePage.stats.venues,
              events: basePage.stats.events,
              venuesWithEvents: basePage.stats.venuesWithEvents,
            });
          } else {
            setStats(slice.stats);
          }
          setCatalogLoading(false);
          enrichPage(slice);

          if (!basePage) {
            const shellQuery = {
              ...feedQuery,
              type: undefined,
              page: 1,
              counts: false as const,
            };
            void fetchVenueCatalogPage(shellQuery, { signal: controller.signal })
              .then((shellPage) => {
                if (requestId !== catalogRequestId.current) return;
                cityBaseRef.current = { key: scopeKey, page: shellPage };
                setStats((prev) => ({
                  ...prev,
                  types: shellPage.stats.types,
                  cities: shellPage.stats.cities,
                  venues: shellPage.stats.venues,
                  events: shellPage.stats.events,
                  venuesWithEvents: shellPage.stats.venuesWithEvents,
                }));
              })
              .catch(() => undefined);
          }
          return;
        }

        if (!basePage) {
          // 1) Shell paint: locations + type chips without waiting on distinct product SQL.
          const shellQuery = {
            ...feedQuery,
            type: undefined,
            page: 1,
            counts: false as const,
          };
          const shellPage = await fetchVenueCatalogPage(shellQuery, { signal: controller.signal });
          if (requestId !== catalogRequestId.current) return;
          cityBaseRef.current = { key: scopeKey, page: shellPage };
          setStats(shellPage.stats);
          setVenues(shellPage.venues);
          setTotal(shellPage.total);
          setCatalogLoading(false);
          enrichPage(shellPage);
          return;
        }

        setStats(basePage.stats);
        setVenues(basePage.venues);
        setTotal(basePage.total);
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
    sortMode,
    listPage,
    initialQueryKey,
    initialPage,
  ]);

  const cityPending = !rawUrlCity && Boolean(selectedCity) && !cityReady;
  const listPending = (cityPending || catalogLoading) && venues.length === 0;
  const listRefreshing = (cityPending || catalogLoading) && venues.length > 0;

  const setCityFilter = (next: string) => {
    persistSelectedCity(next === 'all' ? 'all' : next);
    setListPage(1);
    replaceCatalogUrl((params) => {
      if (next === 'all') params.set('city', 'all');
      else {
        params.set('city', catalogCityQueryValue(selectedCity?.destinations || [], next));
      }
      params.delete('type');
      params.delete('logistics');
      params.delete('page');
    });
  };

  const setTypeFilter = (next: string) => {
    setListPage(1);
    replaceCatalogUrl((params) => {
      if (next === 'all') params.delete('type');
      else params.set('type', next);
      params.delete('logistics');
      params.delete('page');
      if (urlCityAll && !params.get('city')) params.set('city', 'all');
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
      }));
    return [...known, ...extras].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'));
  }, [stats.types]);

  const eventsHref = catalogHrefWithSelectedCity(
    selectedCity?.selectedDestination?.slug || selectedCity?.cityValue,
  );
  const venuesHref = venueCatalogHrefWithSelectedCity(
    '/venues',
    selectedCity?.selectedDestination?.slug || selectedCity?.cityValue,
  );
  const cityName = cityFilter !== 'all' ? cityFilter : null;
  const heroTitle = cityName ? `Локации в ${cityToPrepositional(cityName)}` : 'Локации и точки сбора';
  const hideCityOnCards = cityFilter !== 'all';
  const paginationParams = useMemo(() => {
    const params = searchParamsRecord(searchParams);
    if (listPage > 1) params.page = String(listPage);
    else delete params.page;
    return params;
  }, [searchParams, listPage]);

  const listBlock = listPending ? (
    <LocationsCatalogSkeleton />
  ) : venues.length > 0 ? (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {venues.map((venue, index) => (
          <LocationCard
            key={venue.id}
            venue={venue}
            href={venueHref(venue)}
            hideCity={hideCityOnCards}
            priority={index < 4}
          />
        ))}
      </div>
      <CatalogPaginationLinks
        page={listPage}
        total={total}
        limit={VENUE_CATALOG_PAGE_SIZE}
        searchParams={paginationParams}
        basePath="/locations"
        onPageChange={goToListPage}
      />
    </>
  ) : (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
      <p className="text-lg font-semibold text-slate-700">Ничего не нашли</p>
      <p className="mt-1 text-sm">Попробуйте убрать фильтры или изменить запрос</p>
    </div>
  );

  return (
    <>
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Места', href: '/places' }, { label: 'Локации' }]}
        title={heroTitle}
        tone="light"
        className="bg-white"
      >
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
          <PlacesSearch mode="jump" tone="muted" />
          <select
            value={cityPending ? '' : cityFilter}
            disabled={cityPending}
            onChange={(event) => setCityFilter(event.target.value)}
            className="hidden rounded-xl bg-[#F5F5F7] px-3 py-2.5 text-sm outline-none disabled:opacity-70 sm:block sm:max-w-[12rem] sm:shrink-0"
            aria-label="Город"
          >
            {cityPending ? <option value="">Город…</option> : null}
            <option value="all">Все города</option>
            {cityOptions.map(([city]) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as VenueCatalogSort)}
            className="rounded-xl bg-[#F5F5F7] px-3 py-2.5 text-sm outline-none sm:max-w-[10rem] sm:shrink-0"
            aria-label="Сортировка"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`catalog-chip shrink-0 ${
              typeFilter === 'all' ? 'catalog-chip-on' : 'catalog-chip-idle'
            }`}
          >
            <span className="whitespace-nowrap">Все точки</span>
          </button>
          {typeOptions.map((option) => {
            const active = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(active ? 'all' : option.value)}
                className={`catalog-chip shrink-0 ${active ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>

        <Link
          href={venuesHref}
          className="mt-3 inline-block text-sm text-slate-500 transition hover:text-slate-700"
        >
          Площадки: музеи и театры →
        </Link>
        <Link
          href="/places"
          className="mt-2 ml-0 block text-sm text-slate-400 transition hover:text-slate-600 sm:ml-3 sm:inline"
        >
          Все места
        </Link>
      </HeroLayout>

      <div className="container-page py-6 sm:py-8">
        {listPending || listRefreshing ? (
          <p className="mb-4 text-sm text-slate-500">Обновляем список…</p>
        ) : null}

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
