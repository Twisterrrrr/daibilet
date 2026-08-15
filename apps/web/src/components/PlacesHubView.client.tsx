'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Grid3X3, List, SlidersHorizontal } from 'lucide-react';

import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { InstitutionCard } from '@/components/InstitutionCard.client';
import { InstitutionList } from '@/components/InstitutionListRow.client';
import { LocationCard } from '@/components/LocationCard.client';
import { PlacesSearch } from '@/components/PlacesSearch.client';
import { VenuesCatalogSkeleton } from '@/components/VenueCatalogSkeletons';
import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { placesSearchHref } from '@/lib/catalog-url';
import { pluralCities, pluralPlaces } from '@/lib/format';
import { buildPlacesListingCopy, normalizePlacesFamily } from '@/lib/places-seo';
import {
  catalogCityQueryValue,
  ensureCityInOptions,
  isAllCitiesQuery,
  persistSelectedCity,
  resolveSectionCityFilter,
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
  PLACES_HUB_CATEGORY_CHIPS,
  countCatalogFamilies,
  normalizeVenueKind,
  placesHubCategoryCount,
  resolvePlacesHubCategoryChip,
} from '@/lib/venue-meta';
import { venueHref, venuePageTemplate } from '@/lib/routes';
import { isRegionLikeCityTitle, resolveVenuePlaceCity } from '@/lib/venue-place-city';

type ViewMode = 'cards' | 'list';

const PLACES_VIEW_MODE_KEY = 'daibilet:places-view-mode';

const SORT_OPTIONS: Array<[VenueCatalogSort, string]> = [
  ['events', 'По событиям'],
  ['mixed', 'Смешанно'],
  ['asc', 'А-Я'],
  ['desc', 'Я-А'],
];

type PlacesScope = 'all' | 'events';

const FILTER_SCOPE_OPTIONS: Array<[PlacesScope, string]> = [
  ['all', 'Показывать все'],
  ['events', 'Только с событиями'],
];

function cityOptionsFromStats(cities: Record<string, number>): Array<[string, number]> {
  return [...Object.entries(cities)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}

/** Населённые пункты внутри региона (City.title = регион, slug = город). */
function settlementOptionsFromVenues(
  venues: VenueCatalogFeedPage['venues'],
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const venue of venues) {
    if (!isRegionLikeCityTitle(venue.city)) continue;
    const label = resolveVenuePlaceCity(venue.city, venue.citySlug);
    if (!label || label === String(venue.city || '').trim()) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
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
  hasEvents?: boolean;
}): string {
  return [
    query.family,
    query.city || 'all',
    query.sort || 'events',
    query.q || '',
    String(query.limit || ''),
    query.hasEvents ? 'events' : 'all',
  ].join('|');
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

function parseHasEventsParam(raw: string | null): boolean {
  const value = String(raw || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function parseSortParam(raw: string | null): VenueCatalogSort {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'asc' || value === 'desc' || value === 'mixed' || value === 'events') return value;
  return 'events';
}

function readStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const stored = localStorage.getItem(PLACES_VIEW_MODE_KEY);
    return stored === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
}

function venueMatchesPlacesChip(
  venueType: string | null | undefined,
  chip: ReturnType<typeof resolvePlacesHubCategoryChip>,
): boolean {
  if (!chip) return true;
  return chip.types.includes(normalizeVenueKind(venueType));
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
  const [, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [venues, setVenues] = useState(initialPage.venues);
  const [total, setTotal] = useState(initialPage.total);
  const [stats, setStats] = useState(initialPage.stats);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogRequestId = useRef(0);
  const cityBaseRef = useRef<{ key: string; page: VenueCatalogFeedPage } | null>(null);

  const q = searchParams.get('q')?.trim() || '';
  const family = parseFamilyParam(searchParams.get('family'));
  const hasEvents = parseHasEventsParam(searchParams.get('hasEvents'));
  const sortMode = parseSortParam(searchParams.get('sort'));
  const scope: PlacesScope = hasEvents ? 'events' : 'all';
  const rawUrlCity = searchParams.get('city')?.trim() || '';
  const urlCityAll = isAllCitiesQuery(rawUrlCity);
  const urlCity = urlCityAll ? '' : rawUrlCity;
  const rawType = searchParams.get('type')?.trim() || '';
  const categoryChip = resolvePlacesHubCategoryChip(rawType);
  const typeFilter = categoryChip?.id || (rawType ? normalizeVenueKind(rawType) : 'all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
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

  const cityOptions = useMemo(() => {
    const destCities = (selectedCity?.destinations || []).filter((item) => item.type === 'city');
    const counts = stats.cities || {};
    const fromDestinations = destCities.length
      ? destCities
          .map((item) => [item.name, counts[item.name] || 0] as [string, number])
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      : cityOptionsFromStats(counts);
    const settlements = settlementOptionsFromVenues(venues);
    const headerLabel = String(selectedCity?.cityLabel || '').trim();
    const urlToken = String(urlCity || '').trim();
    const venuesInRegion =
      venues.length > 0 && venues.every((venue) => isRegionLikeCityTitle(venue.city));
    const regionScoped =
      isRegionLikeCityTitle(headerLabel) ||
      isRegionLikeCityTitle(urlToken) ||
      /bashkortostan|respublika-|область|край/i.test(urlToken) ||
      venuesInRegion;
    let options = fromDestinations;
    if (regionScoped && settlements.length > 0) {
      const regionTitle = isRegionLikeCityTitle(headerLabel)
        ? headerLabel
        : venuesInRegion
          ? String(venues[0]?.city || '').trim()
          : '';
      const stillOnRegion =
        isRegionLikeCityTitle(headerLabel) ||
        isRegionLikeCityTitle(urlToken) ||
        /bashkortostan|respublika-/i.test(urlToken);
      options =
        regionTitle && stillOnRegion
          ? ([[regionTitle, venues.length || 1] as [string, number], ...settlements])
          : settlements;
    }
    return ensureCityInOptions(options, headerLabel);
  }, [stats.cities, venues, selectedCity?.cityLabel, selectedCity?.destinations, urlCity]);

  const cityFilter = useMemo(
    () =>
      resolveSectionCityFilter({
        cityReady,
        headerCityValue: selectedCity?.cityValue,
        headerCityLabel: selectedCity?.cityLabel,
        urlCity,
        urlCityAll,
        cityOptions,
      }),
    [urlCity, urlCityAll, cityReady, selectedCity, cityOptions],
  );

  const cityFetchKey = useMemo(() => {
    if (cityFilter === 'all') return '';
    return catalogCityQueryValue(selectedCity?.destinations || [], cityFilter);
  }, [cityFilter, selectedCity?.destinations]);

  useEffect(() => {
    setViewMode(readStoredViewMode());
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && filtersRef.current?.contains(target)) return;
      setFiltersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

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

  const prevFiltersRef = useRef({ sort: sortMode, q, family, hasEvents });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      prev.sort !== sortMode || prev.q !== q || prev.family !== family || prev.hasEvents !== hasEvents;
    prevFiltersRef.current = { sort: sortMode, q, family, hasEvents };
    if (!changed || listPage <= 1) return;
    setListPage(1);
    writePageToUrl(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional filter-drift reset
  }, [sortMode, q, family, hasEvents, listPage]);

  const feedQuery = useMemo(
    () => ({
      family,
      city: cityFetchKey || undefined,
      type: categoryChip
        ? categoryChip.types.join(',')
        : typeFilter !== 'all'
          ? typeFilter
          : undefined,
      sort: sortMode,
      q: q || undefined,
      hasEvents: hasEvents || undefined,
      page: listPage,
      limit: VENUE_CATALOG_PAGE_SIZE,
    }),
    [family, cityFetchKey, categoryChip, typeFilter, sortMode, q, hasEvents, listPage],
  );

  const feedQueryKey = useMemo(() => venueCatalogCacheKey(feedQuery), [feedQuery]);
  const scopeKey = useMemo(() => cityScopeKey(feedQuery), [feedQuery]);
  const allowShell = !hasEvents && (sortMode === 'asc' || sortMode === 'desc');

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
      !hasEvents &&
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

    if (listPage === 1 && cachedBase && typeFilter === 'all') {
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
            { ...feedQuery, counts: allowShell ? false : true },
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
              counts: allowShell ? (false as const) : true,
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
            counts: allowShell ? (false as const) : true,
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
    hasEvents,
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
      if (next === 'all') params.delete('type');
      else params.set('type', next);
      params.delete('page');
      if (urlCityAll && !params.get('city')) params.set('city', 'all');
    });
  };

  const setScope = (next: PlacesScope) => {
    setListPage(1);
    setFiltersOpen(false);
    replaceCatalogUrl((params) => {
      params.delete('family');
      params.delete('hasEvents');
      params.delete('page');
      if (next === 'events') params.set('hasEvents', '1');
      if (urlCityAll && !params.get('city')) params.set('city', 'all');
    });
  };

  /** Mobile dropdown: Все места | С событиями | categories (mutually exclusive with events). */
  const mobileTypeSelectValue = hasEvents ? 'events' : typeFilter === 'all' ? 'all' : typeFilter;

  const applyMobileTypeSelect = (next: string) => {
    setListPage(1);
    setFiltersOpen(false);
    replaceCatalogUrl((params) => {
      params.delete('family');
      params.delete('hasEvents');
      params.delete('type');
      params.delete('page');
      if (next === 'events') {
        params.set('hasEvents', '1');
      } else if (next !== 'all') {
        params.set('type', next);
      }
      if (urlCityAll && !params.get('city')) params.set('city', 'all');
    });
  };

  const setSortFilter = (next: VenueCatalogSort) => {
    setListPage(1);
    replaceCatalogUrl((params) => {
      if (next === 'events') params.delete('sort');
      else params.set('sort', next);
      params.delete('page');
      if (urlCityAll && !params.get('city')) params.set('city', 'all');
    });
  };

  const listPending = (cityPending || catalogLoading) && venues.length === 0;
  const listRefreshing = (cityPending || catalogLoading) && venues.length > 0;

  const categoryChips = useMemo(() => {
    const counts = stats.types || {};
    return PLACES_HUB_CATEGORY_CHIPS.map((chip) => ({
      ...chip,
      count: placesHubCategoryCount(counts, chip),
    })).filter((chip) => chip.count > 0);
  }, [stats.types]);

  const cityCount = cityOptions.length;
  const cityName = cityFilter !== 'all' ? cityFilter : null;
  const citySlugForCopy =
    cityFilter !== 'all'
      ? selectedCity?.selectedDestination?.slug || cityFetchKey || cityName
      : '';
  const pageTitleText = buildPlacesListingCopy(cityName, family, citySlugForCopy).h1;
  const families = countCatalogFamilies(stats.types);
  const placesTotal = families.institutions + families.locations;
  const placesEyebrow = cityName
    ? `${pluralPlaces(placesTotal)} • ${cityName}`
    : `${pluralPlaces(placesTotal)} • ${pluralCities(cityCount)}`;
  const hideCityOnCards = cityFilter !== 'all';
  const cityQuery =
    cityFetchKey && cityFetchKey !== 'all'
      ? cityFetchKey
      : selectedCity?.selectedDestination?.slug || undefined;
  const paginationParams = useMemo(() => {
    const params = searchParamsRecord(searchParams);
    if (listPage > 1) params.page = String(listPage);
    else delete params.page;
    return params;
  }, [searchParams, listPage]);

  const allTypesOn = typeFilter === 'all';
  const filtersActiveCount = hasEvents ? 1 : 0;

  return (
    <>
      <HeroLayout
        variant="minimal"
        dense
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Места' }]}
        eyebrow={placesEyebrow}
        title={pageTitleText}
        tone="light"
        className=""
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
        </div>

        {/* Mobile: one dropdown (categories + «С событиями») - no separate Фильтры button. */}
        <div className="mt-4 sm:hidden">
          <label className="sr-only" htmlFor="places-hub-mobile-type">
            Тип места
          </label>
          <select
            id="places-hub-mobile-type"
            value={mobileTypeSelectValue}
            onChange={(event) => applyMobileTypeSelect(event.target.value)}
            className="w-full rounded-xl bg-[#F5F5F7] px-3 py-2.5 text-sm outline-none"
          >
            <option value="all">Все места</option>
            <option value="events">С событиями</option>
            {categoryChips.map((chip) => (
              <option key={chip.id} value={chip.id}>
                {chip.label}
              </option>
            ))}
          </select>
        </div>

        {/* sm+: chip rail + Фильтры (events scope) as before */}
        <div className="mt-4 hidden gap-2 sm:flex sm:items-start">
          <div className="min-w-0 flex-1" data-places-hub-chips>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`catalog-chip min-h-9 ${allTypesOn ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
              >
                <span className="whitespace-nowrap">Все места</span>
              </button>
              {categoryChips.map((chip) => {
                const active = typeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setTypeFilter(active ? 'all' : chip.id)}
                    className={`catalog-chip min-h-9 ${active ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
                  >
                    <span className="whitespace-nowrap">{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={filtersRef} className="relative shrink-0 self-start">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-haspopup="menu"
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition ${
                filtersOpen || filtersActiveCount > 0
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Фильтры
              {filtersActiveCount > 0 ? (
                <span className="grid min-w-5 place-items-center rounded-md bg-white/25 px-1.5 text-xs">
                  {filtersActiveCount}
                </span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div
                role="menu"
                aria-label="Дополнительные фильтры"
                className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg"
              >
                {FILTER_SCOPE_OPTIONS.map(([value, label]) => {
                  const active = scope === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => setScope(value)}
                      className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm transition ${
                        active
                          ? 'bg-primary-50 font-semibold text-primary-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </HeroLayout>

      <div className="container-page py-6 sm:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {listPending || listRefreshing
              ? 'Обновляем список…'
              : total > 0
                ? pluralPlaces(total)
                : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortMode}
              onChange={(event) => setSortFilter(event.target.value as VenueCatalogSort)}
              className="rounded-xl bg-[#F5F5F7] px-3 py-2 text-sm outline-none"
              aria-label="Сортировка"
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
        </div>

        {listPending ? (
          <VenuesCatalogSkeleton count={8} />
        ) : venues.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <InstitutionList venues={venues} hrefFor={venueHref} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {venues.map((venue, index) =>
                  venuePageTemplate(venue.type) === 'institution' ? (
                    <InstitutionCard
                      key={venue.id}
                      venue={venue}
                      href={venueHref(venue)}
                      hideCity={hideCityOnCards}
                      priority={index < 3}
                    />
                  ) : (
                    <LocationCard
                      key={venue.id}
                      venue={venue}
                      href={venueHref(venue)}
                      hideCity={hideCityOnCards}
                      priority={index < 3}
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
