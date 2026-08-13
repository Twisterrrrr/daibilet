'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Grid3X3, List, Route } from 'lucide-react';

import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { InstitutionList } from '@/components/InstitutionListRow.client';
import { LocationCard } from '@/components/LocationCard.client';
import { PlacesSearch } from '@/components/PlacesSearch.client';
import { VenuesCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { placesSearchHref } from '@/lib/catalog-url';
import { pluralCities, pluralLocations, pluralVenues } from '@/lib/format';
import { buildPlacesListingCopy, normalizePlacesFamily } from '@/lib/places-seo';
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
  type VenueCatalogFamily,
  type VenueCatalogFeedPage,
  type VenueCatalogSort,
} from '@/lib/venue-catalog-feed';
import {
  CATALOG_TYPE_OPTIONS,
  INSTITUTION_CATALOG_TYPE_OPTIONS,
  LOCATION_CATALOG_TYPE_OPTIONS,
  countCatalogFamilies,
  normalizeVenueKind,
} from '@/lib/venue-meta';
import { venueHref, venuePageTemplate } from '@/lib/routes';

type ViewMode = 'cards' | 'list';

const PLACES_VIEW_MODE_KEY = 'daibilet:places-view-mode';

const SORT_OPTIONS: Array<[VenueCatalogSort, string]> = [
  ['events', 'По афише'],
  ['mixed', 'Смешанно'],
  ['asc', 'А-Я'],
  ['desc', 'Я-А'],
];

function readStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const stored = localStorage.getItem(PLACES_VIEW_MODE_KEY);
    return stored === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
}

function cityOptionsFromStats(cities: Record<string, number>): Array<[string, number]> {
  return [...Object.entries(cities)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
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

function patchVenueEventCounts(
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

function cityScopeKey(query: {
  family: string;
  city?: string;
  sort?: string;
  q?: string;
  limit?: number;
}): string {
  return [query.family, query.city || 'all', query.sort || 'events', query.q || '', String(query.limit || '')].join('|');
}

function searchParamsRecord(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function parseFamilyParam(raw: string | null): 'all' | VenueCatalogFamily {
  const family = normalizePlacesFamily(raw);
  return family || 'all';
}

/**
 * Unified Places catalog chrome (same layout as `/venues` screenshot).
 * Cards keep `/venues/[slug]` and `/locations/[slug]`.
 */
export function PlacesHubView({
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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [, startTransition] = useTransition();
  const [venues, setVenues] = useState(initialPage.venues);
  const [total, setTotal] = useState(initialPage.total);
  const [stats, setStats] = useState(initialPage.stats);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogRequestId = useRef(0);
  const cityBaseRef = useRef<{ key: string; page: VenueCatalogFeedPage } | null>(null);

  const q = searchParams.get('q')?.trim() || '';
  const family = parseFamilyParam(searchParams.get('family'));
  const rawUrlCity = searchParams.get('city')?.trim() || '';
  const urlCityAll = isAllCitiesQuery(rawUrlCity);
  const urlCity = urlCityAll ? '' : rawUrlCity;
  const rawType = searchParams.get('type')?.trim() || '';
  const typeFilter = rawType ? normalizeVenueKind(rawType) : 'all';
  const urlPage = parseVenueCatalogPageParam(searchParams.get('page'));
  const [listPage, setListPage] = useState(urlPage);
  const cityReady = selectedCity?.cityReady ?? true;
  const cityPending = !rawUrlCity && Boolean(selectedCity) && !cityReady;

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

  const cityFetchKey = useMemo(() => {
    if (urlCityAll) return '';
    if (urlCity) return urlCity;
    if (cityFilter === 'all') return '';
    return catalogCityQueryValue(selectedCity?.destinations || [], cityFilter);
  }, [urlCity, urlCityAll, cityFilter, selectedCity?.destinations]);

  useEffect(() => {
    setViewMode(readStoredViewMode());
  }, []);

  const replaceCatalogUrl = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/places?${qs}` : '/places', { scroll: false });
    });
  };

  const writePageToUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    const href = qs ? `/places?${qs}` : '/places';
    window.history.pushState(null, '', href);
  };

  const goToListPage = (page: number) => {
    const next = Math.max(1, page);
    setListPage(next);
    writePageToUrl(next);
    window.scrollTo(0, 0);
  };

  const prevFiltersRef = useRef({ sort: sortMode, q, family });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed = prev.sort !== sortMode || prev.q !== q || prev.family !== family;
    prevFiltersRef.current = { sort: sortMode, q, family };
    if (!changed || listPage <= 1) return;
    setListPage(1);
    writePageToUrl(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional filter-drift reset
  }, [sortMode, q, family, listPage]);

  const feedQuery = useMemo(
    () => ({
      family,
      city: cityFetchKey || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      sort: sortMode,
      q: q || undefined,
      page: listPage,
      limit: VENUE_CATALOG_PAGE_SIZE,
    }),
    [family, cityFetchKey, typeFilter, sortMode, q, listPage],
  );

  const feedQueryKey = useMemo(() => venueCatalogCacheKey(feedQuery), [feedQuery]);
  const scopeKey = useMemo(() => cityScopeKey(feedQuery), [feedQuery]);

  useEffect(() => {
    if (!cityReady && !rawUrlCity) {
      setCatalogLoading(false);
      return;
    }

    const isAllCitiesScope = !cityFetchKey && (urlCityAll || cityFilter === 'all');
    const isDefaultFirstPage =
      isAllCitiesScope &&
      family === 'all' &&
      typeFilter === 'all' &&
      !q &&
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
          setVenues((prev) => patchVenueEventCounts(prev, counts, pageIds, stopCounts));
        })
        .catch(() => undefined);
    };

    const run = async () => {
      try {
        let basePage = cachedBase;
        const needsExactSlice = typeFilter !== 'all' || listPage > 1;

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
              venuesWithEvents: basePage.stats.venuesWithEvents,
              events: basePage.stats.events,
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
                  venuesWithEvents: shellPage.stats.venuesWithEvents,
                  events: shellPage.stats.events,
                }));
              })
              .catch(() => undefined);
          }
          return;
        }

        if (!basePage) {
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
    family,
    q,
    sortMode,
    listPage,
    initialQueryKey,
    initialPage,
  ]);

  const setViewModePersisted = (value: ViewMode) => {
    setViewMode(value);
    try {
      localStorage.setItem(PLACES_VIEW_MODE_KEY, value);
    } catch {
      // ignore storage errors
    }
  };

  const setCityFilter = (next: string) => {
    setListPage(1);
    if (selectedCity?.setCity) {
      selectedCity.setCity(next === 'all' ? 'all' : next);
      return;
    }
    persistSelectedCity(next === 'all' ? 'all' : next);
    replaceCatalogUrl((params) => {
      if (next === 'all') params.set('city', 'all');
      else params.set('city', catalogCityQueryValue([], next));
      params.delete('page');
    });
  };

  const setTypeFilter = (next: string) => {
    setListPage(1);
    replaceCatalogUrl((params) => {
      if (next === 'all') {
        params.delete('type');
        params.delete('family');
      } else {
        params.set('type', next);
        params.delete('family');
      }
      params.delete('page');
      if (urlCityAll && !params.get('city')) params.set('city', 'all');
    });
  };

  const listPending = (cityPending || catalogLoading) && venues.length === 0;
  const listRefreshing = (cityPending || catalogLoading) && venues.length > 0;

  const typeOptions = useMemo(() => {
    const counts = stats.types || {};
    const pool =
      family === 'institution'
        ? INSTITUTION_CATALOG_TYPE_OPTIONS
        : family === 'location'
          ? LOCATION_CATALOG_TYPE_OPTIONS
          : CATALOG_TYPE_OPTIONS;
    return pool.filter((option) => counts[option.value]).map((option) => ({
      ...option,
      count: counts[option.value] || 0,
    }));
  }, [stats.types, family]);

  const cityCount = cityOptions.length;
  const cityName = cityFilter !== 'all' ? cityFilter : null;
  const pageTitleText = buildPlacesListingCopy(cityName).h1;
  const families = countCatalogFamilies(stats.types);
  const hideCityOnCards = cityFilter !== 'all';
  const cityQuery =
    cityFetchKey && cityFetchKey !== 'all'
      ? cityFetchKey
      : selectedCity?.selectedDestination?.slug || undefined;
  const myDayHref = cityQuery ? `/my-day?city=${encodeURIComponent(cityQuery)}` : '/my-day';
  const paginationParams = useMemo(() => {
    const params = searchParamsRecord(searchParams);
    if (listPage > 1) params.page = String(listPage);
    else delete params.page;
    return params;
  }, [searchParams, listPage]);

  const allPlacesOn = family === 'all' && typeFilter === 'all';

  return (
    <>
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Места' }]}
        eyebrow={`${pluralVenues(families.institutions)} • ${pluralLocations(families.locations)} • ${pluralCities(cityCount)}`}
        title={pageTitleText}
        tone="light"
        className="bg-white"
      >
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
          <PlacesSearch mode="hub" initialQuery={q} tone="muted" />
          <select
            value={cityPending ? '' : cityFilter}
            disabled={cityPending}
            onChange={(event) => setCityFilter(event.target.value)}
            className="rounded-xl bg-[#F5F5F7] px-3 py-2.5 text-sm outline-none disabled:opacity-70 sm:max-w-[12rem] sm:shrink-0"
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

        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`catalog-chip ${allPlacesOn ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
          >
            <span className="whitespace-nowrap">Все места</span>
          </button>
          {typeOptions.map((option) => {
            const active = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(active ? 'all' : option.value)}
                className={`catalog-chip ${active ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Link
            href={myDayHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
          >
            <Route className="h-4 w-4" strokeWidth={1.75} />
            Собрать день
          </Link>
        </div>
      </HeroLayout>

      <div className="container-page py-6 sm:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {listPending || listRefreshing
              ? 'Обновляем список…'
              : total > 0
                ? `${total} ${total === 1 ? 'место' : total < 5 ? 'места' : 'мест'}`
                : null}
          </p>
          <div className="flex shrink-0 overflow-hidden rounded-xl bg-[#F5F5F7] p-1" role="radiogroup" aria-label="Вид каталога">
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
              <Grid3X3 className="h-4 w-4" strokeWidth={1.75} />
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
              <List className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {listPending ? (
          <VenuesCatalogSkeleton count={8} />
        ) : venues.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <InstitutionList venues={venues} hrefFor={venueHref} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {venues.map((venue) =>
                  venuePageTemplate(venue.type) === 'institution' ? (
                    <InstitutionCard
                      key={venue.id}
                      venue={venue}
                      href={venueHref(venue)}
                      hideCity={hideCityOnCards}
                      showFamilyTag
                    />
                  ) : (
                    <LocationCard
                      key={venue.id}
                      venue={venue}
                      href={venueHref(venue)}
                      nextSlot={venue.nextSlot}
                      hideCity={hideCityOnCards}
                    />
                  ),
                )}
              </div>
            )}
            <CatalogPaginationLinks
              page={listPage}
              total={total}
              limit={VENUE_CATALOG_PAGE_SIZE}
              searchParams={paginationParams}
              basePath="/places"
              onPageChange={goToListPage}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">{q ? 'Ничего не нашли' : 'Пока нет мест'}</p>
            <p className="mt-1 text-sm">
              {q ? 'Попробуйте другое название или смените город.' : 'Попробуйте убрать фильтры или сменить город.'}
            </p>
            {q ? (
              <Link href={placesSearchHref({ city: cityQuery })} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                Сбросить поиск
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
