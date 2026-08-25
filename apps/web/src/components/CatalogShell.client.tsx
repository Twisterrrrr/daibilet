'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CatalogActiveFilters } from '@/components/CatalogActiveFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { CatalogResults, ViewModeToggle } from '@/components/CatalogResults.client';
import { CatalogToolbar } from '@/components/CatalogToolbar.client';
import { EventsCityGate } from '@/components/EventsCityGate.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogDto, PublicCatalogListItemDto } from '@daibilet/contracts/public';
import { CATALOG_PAGE_SIZE_DEFAULT, CATALOG_PAGE_SIZES, isCatalogPageSize, type CatalogPageSize } from '@daibilet/contracts/catalog';
import {
  buildCatalogHref,
  CATALOG_SORT_OPTIONS,
  catalogFiltersFromQuery,
  venueCatalogHrefWithSelectedCity,
  type CatalogFilterValues,
} from '@/lib/catalog-url';
import { catalogClientFetchTimeoutMs } from '@/lib/catalog-client-fetch';
import { pluralEvents } from '@/lib/format';
import { resolveCatalogFetchCity } from '@/lib/selected-city';
import {
  parseCatalogViewMode,
  readStoredCatalogViewMode,
  storeCatalogViewMode,
  type CatalogViewMode,
} from '@/lib/catalog-view-mode';
import { parseCatalogPageQuery, searchParamsToRecord, catalogQueryCacheKey } from '@/server/catalog-query';

type CatalogShellProps = {
  initialCatalog?: PublicCatalogDto | null;
  initialQueryKey?: string;
};

function parseEventsCatalogPageParam(raw: string | null): number {
  const parsed = Number.parseInt(raw || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function catalogItemKey(item: PublicCatalogListItemDto): string {
  return `${item.id}-${item.startsAt}`;
}

function mergeCatalogItems(
  existing: PublicCatalogListItemDto[],
  incoming: PublicCatalogListItemDto[],
): PublicCatalogListItemDto[] {
  const seen = new Set(existing.map(catalogItemKey));
  const merged = [...existing];
  for (const item of incoming) {
    const key = catalogItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

export function CatalogShell({ initialCatalog = null, initialQueryKey = '' }: CatalogShellProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const rawUrlCity = urlSearchParams.get('city')?.trim() || '';
  const urlCityIsAll = rawUrlCity.toLowerCase() === 'all';
  const urlHasCity = Boolean(rawUrlCity) && !urlCityIsAll;
  // Keep SSR catalog visible during city bootstrap; only refetch when injected city differs.
  const [catalog, setCatalog] = useState<PublicCatalogDto | null>(() => initialCatalog);
  const [loading, setLoading] = useState(() => !initialCatalog);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<CatalogViewMode>('cards');
  const pagingModeRef = useRef<'replace' | 'append'>('replace');
  const catalogRef = useRef<PublicCatalogDto | null>(initialCatalog);
  catalogRef.current = catalog;

  const cityReady = selectedCity?.cityReady ?? true;
  /** Wait for storage resolve when URL has no city — avoids «Все города» then Уфа. */
  const cityBootstrapPending = !rawUrlCity && Boolean(selectedCity) && !cityReady;
  /** Hard geo: no mixed national feed until the user picks a city. */
  const needsCityGate =
    !cityBootstrapPending &&
    cityReady &&
    (urlCityIsAll || (!urlHasCity && (!selectedCity || selectedCity.cityValue === 'all')));

  const searchParamsRecord = useMemo(
    () => searchParamsToRecord(Object.fromEntries(urlSearchParams.entries())),
    [urlSearchParams],
  );

  const query = useMemo(() => {
    try {
      return parseCatalogPageQuery(searchParamsRecord);
    } catch {
      return parseCatalogPageQuery({});
    }
  }, [searchParamsRecord]);

  // Local page drives the list; soft-nav <Link ?page=> remounts via loading.tsx and feels hung.
  const urlPage = query.page;
  const [listPage, setListPage] = useState(urlPage);
  const pendingResultsScrollRef = useRef(false);
  const prevFiltersKeyRef = useRef<string | null>(null);

  const ignoreNextUrlPageRef = useRef(false);

  const writePageToUrl = useCallback((page: number) => {
    const params = new URLSearchParams(window.location.search);
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    const href = qs ? `/events?${qs}` : '/events';
    // Next patches history.pushState and would sync useSearchParams → reset paging to replace.
    ignoreNextUrlPageRef.current = true;
    window.history.pushState(null, '', href);
  }, []);

  useEffect(() => {
    if (ignoreNextUrlPageRef.current) {
      ignoreNextUrlPageRef.current = false;
      return;
    }
    pagingModeRef.current = 'replace';
    setListPage(urlPage);
  }, [urlPage]);

  useEffect(() => {
    const onPopState = () => {
      pagingModeRef.current = 'replace';
      setListPage(parseEventsCatalogPageParam(new URLSearchParams(window.location.search).get('page')));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const filterValues = useMemo(() => {
    const base = catalogFiltersFromQuery({
      q: query.q,
      city: query.city,
      category: query.category,
      landing: query.landing,
      date: query.date,
      from: query.from,
      to: query.to,
      sort: query.sort,
      limit: query.limit != null && isCatalogPageSize(query.limit) ? query.limit : undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice ?? query.priceMax,
      ageMax: query.ageMax,
      page: listPage,
    });
    const fetchCity = resolveCatalogFetchCity({
      urlCity: rawUrlCity,
      urlCityAll: urlCityIsAll,
      cityReady,
      headerCityValue: selectedCity?.cityValue,
      destinations: selectedCity?.destinations || [],
    });
    return { ...base, city: fetchCity };
  }, [query, cityReady, selectedCity, rawUrlCity, urlCityIsAll, listPage]);

  const filtersQueryKey = useMemo(
    () =>
      catalogQueryCacheKey({
        ...query,
        city: filterValues.city,
        page: 1,
      }),
    [query, filterValues.city],
  );

  useEffect(() => {
    if (prevFiltersKeyRef.current === null) {
      prevFiltersKeyRef.current = filtersQueryKey;
      return;
    }
    if (prevFiltersKeyRef.current === filtersQueryKey) return;
    prevFiltersKeyRef.current = filtersQueryKey;
    pagingModeRef.current = 'replace';
    setListPage(1);
    writePageToUrl(1);
  }, [filtersQueryKey, writePageToUrl]);

  const goToListPage = useCallback(
    (page: number) => {
      pagingModeRef.current = 'replace';
      const next = Math.max(1, page);
      setListPage(next);
      writePageToUrl(next);
      pendingResultsScrollRef.current = true;
    },
    [writePageToUrl],
  );

  const loadMoreNextPage = useCallback(() => {
    if (loading || loadingMore || !catalog) return;
    const limit = Math.max(catalog.limit || CATALOG_PAGE_SIZE_DEFAULT, 1);
    const totalPages = Math.max(1, Math.ceil(catalog.total / limit));
    if (listPage >= totalPages) return;
    pagingModeRef.current = 'append';
    const next = listPage + 1;
    setListPage(next);
    writePageToUrl(next);
  }, [loading, loadingMore, catalog, listPage, writePageToUrl]);

  useEffect(() => {
    if (!pendingResultsScrollRef.current || loading || loadingMore || !catalog) return;
    pendingResultsScrollRef.current = false;
    document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [loading, loadingMore, catalog, listPage]);

  const hasExtraCatalogFilters = useMemo(() => {
    const dateActive = Boolean(filterValues.date) && filterValues.date !== 'all';
    return Boolean(
      filterValues.q ||
        filterValues.category ||
        filterValues.landing ||
        dateActive ||
        filterValues.from ||
        filterValues.to ||
        filterValues.minPrice != null ||
        filterValues.maxPrice != null ||
        (filterValues.ageMax != null && filterValues.ageMax >= 0),
    );
  }, [filterValues]);

  /** Effective query key from resolved filters (header city may lead URL by one frame). */
  const effectiveQueryKey = useMemo(
    () => catalogQueryCacheKey({ ...query, city: filterValues.city, page: listPage }),
    [query, filterValues.city, listPage],
  );

  const paginationSearchParams = useMemo(() => {
    const next = { ...searchParamsRecord };
    if (listPage > 1) next.page = String(listPage);
    else delete next.page;
    return next;
  }, [searchParamsRecord, listPage]);

  useEffect(() => {
    const fromUrl = urlSearchParams.get('view');
    if (fromUrl) {
      setViewModeState(parseCatalogViewMode(fromUrl));
      return;
    }
    setViewModeState(readStoredCatalogViewMode() || 'cards');
  }, [urlSearchParams]);

  // Cyrillic ?city= names break client refetch — canonicalize to destination slug.
  useEffect(() => {
    if (!rawUrlCity || urlCityIsAll) return;
    const destinations = selectedCity?.destinations || [];
    if (!destinations.length) return;
    const normalized = resolveCatalogFetchCity({
      urlCity: rawUrlCity,
      urlCityAll: false,
      cityReady: true,
      headerCityValue: null,
      destinations,
    });
    if (!normalized || normalized === rawUrlCity) return;
    const params = new URLSearchParams(window.location.search);
    params.set('city', normalized);
    const qs = params.toString();
    router.replace(qs ? `/events?${qs}` : '/events', { scroll: false });
  }, [rawUrlCity, urlCityIsAll, router, selectedCity?.destinations]);

  useEffect(() => {
    if (cityBootstrapPending) {
      // Keep SSR cards while resolving stored city — only mark loading if we have nothing yet.
      if (!catalog) setLoading(true);
      return;
    }

    // Geo gate: do not keep/refetch the national mixed feed.
    if (needsCityGate) {
      setCatalog(null);
      setLoading(false);
      setError(null);
      return;
    }

    const appendMode = pagingModeRef.current === 'append';

    // Deep-link / SSR shortcuts — skip when appending the next batch.
    if (!appendMode) {
      if (initialQueryKey && effectiveQueryKey === initialQueryKey && initialCatalog && urlHasCity) {
        setCatalog(initialCatalog);
        setLoading(false);
        setError(null);
        return;
      }

      if (initialQueryKey && effectiveQueryKey === initialQueryKey && initialCatalog && !filterValues.city) {
        setCatalog(initialCatalog);
        setLoading(false);
        setError(null);
        return;
      }
    }

    let timedOut = false;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutMs = catalogClientFetchTimeoutMs(filterValues.limit);
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    if (appendMode && catalogRef.current) {
      setLoadingMore(true);
    } else {
      // Stale-first: keep previous cards while page/filter fetch runs (avoid skeleton wipe).
      setLoading(true);
    }
    setError(null);

    const params = new URLSearchParams(urlSearchParams.toString());
    if (filterValues.city) params.set('city', filterValues.city);
    else params.delete('city');
    // pushState does not update Next searchParams — listPage is source of truth for paging.
    if (listPage <= 1) params.delete('page');
    else params.set('page', String(listPage));
    const qs = params.toString();
    fetch(`/api/public/events${qs ? `?${qs}` : ''}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('catalog_fetch_failed');
        return response.json() as Promise<PublicCatalogDto>;
      })
      .then((payload) => {
        setCatalog((prev) => {
          if (appendMode && prev) {
            return {
              ...payload,
              items: mergeCatalogItems(prev.items, payload.items),
            };
          }
          return payload;
        });
      })
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          if (timedOut && !cancelled) {
            setError('Каталог загружается дольше обычного. Попробуйте уменьшить «На странице» или обновить.');
          }
          return;
        }
        setError('Не удалось загрузить каталог. Попробуйте обновить страницу.');
        if (!appendMode) setCatalog(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        pagingModeRef.current = 'replace';
        setLoading(false);
        setLoadingMore(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    urlSearchParams,
    effectiveQueryKey,
    initialQueryKey,
    initialCatalog,
    cityBootstrapPending,
    needsCityGate,
    urlHasCity,
    filterValues.city,
    filterValues.limit,
    listPage,
  ]);

  const setViewMode = useCallback(
    (next: CatalogViewMode) => {
      setViewModeState(next);
      storeCatalogViewMode(next);
      const params = new URLSearchParams(urlSearchParams.toString());
      if (next === 'cards') params.delete('view');
      else params.set('view', next);
      const queryString = params.toString();
      router.replace(queryString ? `/events?${queryString}` : '/events', { scroll: false });
    },
    [router, urlSearchParams],
  );

  useEffect(() => {
    if (!catalog || loading) return;
    const limit = Math.max(catalog.limit || CATALOG_PAGE_SIZE_DEFAULT, 1);
    const totalPages = Math.max(1, Math.ceil(catalog.total / limit));
    if (listPage <= totalPages) return;
    const clamped = totalPages > 1 ? totalPages : 1;
    setListPage(clamped);
    writePageToUrl(clamped);
  }, [catalog, loading, listPage, writePageToUrl]);

  const facets = catalog?.facets ?? {
    cities: [],
    categories: [],
    subcategories: [],
    landings: [],
    priceSteps: [],
  };

  if (needsCityGate) {
    return <EventsCityGate />;
  }

  return (
    <CatalogToolbar
      facets={facets}
      values={filterValues}
      disabled={(loading && !catalog) || cityBootstrapPending}
      cityReady={cityReady || urlHasCity}
      layout="split"
    >
      {/* Active chips: sm+ only - on mobile filters live in the drawer. */}
      <div className="hidden sm:block">
        <CatalogActiveFilters values={filterValues} />
      </div>

      {/* Meta слева; sort только mobile; view справа */}
      <div
        id="catalog-results"
        className="catalog-meta-row mt-3 scroll-mt-[calc(var(--site-header-height)+5.5rem)] flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:mt-4"
      >
        <p className="min-w-0 text-sm text-graphite-muted">
          {loading && !catalog ? 'Загрузка…' : null}
          {/* Event count: sm+ only - mobile keeps the row for sort + view. */}
          <span className="hidden sm:inline">
            {loading && catalog ? 'Обновляем… · ' : null}
            {catalog ? (
              <>
                {pluralEvents(catalog.total)}
                {catalog.items.length < catalog.total ? ` · показано ${catalog.items.length}` : ''}
              </>
            ) : null}
          </span>
          {error ? error : null}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Событий на странице"
            className="hidden items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 sm:inline-flex"
          >
            {CATALOG_PAGE_SIZES.map((size) => {
              const active = (filterValues.limit || CATALOG_PAGE_SIZE_DEFAULT) === size;
              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={(loading && !catalog) || cityBootstrapPending}
                  onClick={() => {
                    if (active) return;
                    router.push(
                      buildCatalogHref({
                        ...filterValues,
                        limit: size as CatalogPageSize,
                        page: undefined,
                      }),
                    );
                  }}
                  className={`inline-btn h-7 min-w-[2.5rem] rounded-md px-2 text-xs font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
          <div
            role="radiogroup"
            aria-label="Сортировка"
            className="flex gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
          >
            {CATALOG_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={filterValues.sort === option.value}
                disabled={(loading && !catalog) || cityBootstrapPending}
                onClick={() => {
                  router.push(
                    buildCatalogHref({
                      ...filterValues,
                      sort: option.value,
                      page: undefined,
                    }),
                  );
                }}
                className={`inline-btn h-7 shrink-0 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60 ${
                  filterValues.sort === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {(loading && !catalog) || (cityBootstrapPending && !catalog) ? (
        <CatalogCardSkeletonGrid />
      ) : (
        <CatalogResults
          items={catalog?.items ?? []}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          city={filterValues.city}
          sort={filterValues.sort}
          hasExtraFilters={hasExtraCatalogFilters}
          clearHref={buildCatalogHref({
            city: filterValues.city,
            sort: filterValues.sort,
            limit: filterValues.limit,
          })}
        />
      )}

      {catalog ? (
        <CatalogPaginationLinks
          page={Math.min(
            listPage,
            Math.max(1, Math.ceil((catalog.total || 0) / Math.max(catalog.limit || CATALOG_PAGE_SIZE_DEFAULT, 1))),
          )}
          shownCount={catalog.items.length}
          total={catalog.total}
          limit={catalog.limit}
          searchParams={paginationSearchParams}
          onPageChange={goToListPage}
          onLoadMore={loadMoreNextPage}
          loadingMore={loadingMore}
        />
      ) : null}

      <nav className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-8 text-sm text-slate-600 md:pb-0">
        <Link href="/cities" className="font-medium hover:text-primary">
          Города
        </Link>
        <Link
          href={venueCatalogHrefWithSelectedCity('/venues', selectedCity?.cityValue)}
          className="font-medium hover:text-primary"
        >
          Места: площадки
        </Link>
        <Link
          href={venueCatalogHrefWithSelectedCity('/locations', selectedCity?.cityValue)}
          className="font-medium hover:text-primary"
        >
          Локации
        </Link>
        <Link href="/places" className="font-medium hover:text-primary">
          Все места
        </Link>
        <Link href="/podborki" className="font-medium hover:text-primary">
          Подборки
        </Link>
      </nav>
    </CatalogToolbar>
  );
}

function CatalogCardSkeletonGrid() {
  return (
    <div
      className="catalog-card-grid mt-5"
      aria-busy="true"
      aria-label="Загрузка каталога"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="aspect-[16/10] animate-pulse bg-slate-200/80" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200/80" />
            <div className="h-4 w-[85%] animate-pulse rounded bg-slate-200/70" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-5 w-20 animate-pulse rounded bg-slate-200/80" />
              <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200/80" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { ViewModeToggle } from '@/components/CatalogResults.client';
