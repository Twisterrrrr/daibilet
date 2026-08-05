'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { CatalogActiveFilters } from '@/components/CatalogActiveFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { CatalogResults, ViewModeToggle } from '@/components/CatalogResults.client';
import { CatalogToolbar } from '@/components/CatalogToolbar.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogDto } from '@daibilet/contracts/public';
import { CATALOG_PAGE_SIZE_DEFAULT, CATALOG_PAGE_SIZES } from '@daibilet/contracts/catalog';
import {
  buildCatalogHref,
  CATALOG_SORT_OPTIONS,
  catalogFiltersFromQuery,
  venueCatalogHrefWithSelectedCity,
  type CatalogFilterValues,
} from '@/lib/catalog-url';
import { pluralEvents } from '@/lib/format';
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

export function CatalogShell({ initialCatalog = null, initialQueryKey = '' }: CatalogShellProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const urlHasCity = Boolean(urlSearchParams.get('city')?.trim());
  // Keep SSR catalog visible during city bootstrap; only refetch when injected city differs.
  const [catalog, setCatalog] = useState<PublicCatalogDto | null>(() => initialCatalog);
  const [loading, setLoading] = useState(() => !initialCatalog);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<CatalogViewMode>('cards');

  const cityReady = selectedCity?.cityReady ?? true;
  /** Wait for storage resolve when URL has no city — avoids «Все города» then Уфа. */
  const cityBootstrapPending = !urlHasCity && Boolean(selectedCity) && !cityReady;

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
      limit: query.limit as 50 | 100 | undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice ?? query.priceMax,
      ageMax: query.ageMax,
      page: query.page,
    });
    // Header city picker is source of truth once resolved — URL catches up via router.replace.
    if (!cityReady || !selectedCity) return base;
    if (selectedCity.cityValue === 'all') return { ...base, city: undefined };
    return { ...base, city: selectedCity.cityValue };
  }, [query, cityReady, selectedCity]);

  /** Effective query key from resolved filters (header city may lead URL by one frame). */
  const effectiveQueryKey = useMemo(
    () => catalogQueryCacheKey({ ...query, city: filterValues.city }),
    [query, filterValues.city],
  );

  useEffect(() => {
    const fromUrl = urlSearchParams.get('view');
    if (fromUrl) {
      setViewModeState(parseCatalogViewMode(fromUrl));
      return;
    }
    setViewModeState(readStoredCatalogViewMode() || 'cards');
  }, [urlSearchParams]);

  useEffect(() => {
    if (cityBootstrapPending) {
      // Keep SSR cards while resolving stored city — only mark loading if we have nothing yet.
      if (!catalog) setLoading(true);
      return;
    }

    // Deep-link or post-replace URL already has city — SSR payload matches.
    if (initialQueryKey && effectiveQueryKey === initialQueryKey && initialCatalog && urlHasCity) {
      setCatalog(initialCatalog);
      setLoading(false);
      setError(null);
      return;
    }

    // True «all cities»: URL has no city and header city is all — SSR catalog is correct.
    if (initialQueryKey && effectiveQueryKey === initialQueryKey && initialCatalog && !filterValues.city) {
      setCatalog(initialCatalog);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams(urlSearchParams.toString());
    if (filterValues.city) params.set('city', filterValues.city);
    else params.delete('city');
    const qs = params.toString();
    fetch(`/api/public/events${qs ? `?${qs}` : ''}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('catalog_fetch_failed');
        return response.json() as Promise<PublicCatalogDto>;
      })
      .then((payload) => setCatalog(payload))
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return;
        setError('Не удалось загрузить каталог. Попробуйте обновить страницу.');
        setCatalog(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [
    urlSearchParams,
    effectiveQueryKey,
    initialQueryKey,
    initialCatalog,
    cityBootstrapPending,
    urlHasCity,
    filterValues.city,
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
    if (query.page <= totalPages) return;
    router.replace(
      buildCatalogHref({
        ...filterValues,
        page: totalPages > 1 ? totalPages : undefined,
      }),
      { scroll: false },
    );
  }, [catalog, loading, query.page, filterValues, router]);

  const facets = catalog?.facets ?? {
    cities: [],
    categories: [],
    subcategories: [],
    landings: [],
    priceSteps: [],
  };

  return (
    <>
      <div className="catalog-toolbar sticky top-[var(--site-header-height)] z-30 -mx-4 border-b border-slate-200/60 px-4 py-3 sm:-mx-6 sm:px-6 sm:py-3.5">
        <CatalogToolbar
          facets={facets}
          values={filterValues}
          disabled={(loading && !catalog) || cityBootstrapPending}
          cityReady={cityReady || urlHasCity}
        />
      </div>

      <CatalogActiveFilters values={filterValues} />

      {/* Meta слева; sort + view справа (без дубля сортировки) */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:mt-6">
        <p className="min-w-0 text-sm text-graphite-muted">
          {loading ? 'Загрузка…' : null}
          {!loading && catalog ? (
            <>
              {pluralEvents(catalog.total)}
              {catalog.items.length < catalog.total ? ` · показано ${catalog.items.length}` : ''}
            </>
          ) : null}
          {error ? error : null}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Сортировка"
            className="flex gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {CATALOG_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={filterValues.sort === option.value}
                disabled={loading || cityBootstrapPending}
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

          <div className="relative hidden lg:block">
            <label htmlFor="catalog-page-size" className="sr-only">
              Карточек на странице
            </label>
            <select
              id="catalog-page-size"
              value={filterValues.limit ?? CATALOG_PAGE_SIZE_DEFAULT}
              disabled={loading || cityBootstrapPending}
              onChange={(event) => {
                router.push(
                  buildCatalogHref({
                    ...filterValues,
                    limit: Number(event.target.value) as CatalogFilterValues['limit'],
                    page: undefined,
                  }),
                );
              }}
              className="inline-btn h-8 appearance-none rounded-lg bg-slate-100 pl-2.5 pr-7 text-xs font-medium text-slate-700 outline-none transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
            >
              {CATALOG_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} на стр.
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
          </div>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {loading || (cityBootstrapPending && !catalog) ? (
        <CatalogCardSkeletonGrid />
      ) : (
        <CatalogResults
          items={catalog?.items ?? []}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          city={filterValues.city}
          clearHref={buildCatalogHref({
            city: filterValues.city,
            sort: filterValues.sort,
            limit: filterValues.limit,
          })}
        />
      )}

      {catalog && !loading ? (
        <CatalogPaginationLinks
          page={Math.min(
            query.page,
            Math.max(1, Math.ceil((catalog.total || 0) / Math.max(catalog.limit || CATALOG_PAGE_SIZE_DEFAULT, 1))),
          )}
          total={catalog.total}
          limit={catalog.limit}
          searchParams={searchParamsRecord}
        />
      ) : null}

      <nav className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm text-slate-600">
        <Link href="/cities" className="font-medium hover:text-primary">
          Города
        </Link>
        <Link
          href={venueCatalogHrefWithSelectedCity('/venues', selectedCity?.cityValue)}
          className="font-medium hover:text-primary"
        >
          Площадки
        </Link>
        <Link
          href={venueCatalogHrefWithSelectedCity('/locations', selectedCity?.cityValue)}
          className="font-medium hover:text-primary"
        >
          Локации
        </Link>
        <Link href="/podborki" className="font-medium hover:text-primary">
          Подборки
        </Link>
      </nav>
    </>
  );
}

function CatalogCardSkeletonGrid() {
  return (
    <div
      className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Загрузка каталога"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-card bg-white shadow-card">
          <div className="aspect-[16/9] animate-pulse bg-slate-200/80" />
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
