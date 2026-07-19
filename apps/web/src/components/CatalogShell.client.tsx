'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CatalogActiveFilters } from '@/components/CatalogActiveFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { CatalogResults } from '@/components/CatalogResults.client';
import { CatalogToolbar } from '@/components/CatalogToolbar.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import type { PublicCatalogDto } from '@daibilet/contracts/public';
import { catalogFiltersFromQuery, venueCatalogHrefWithSelectedCity } from '@/lib/catalog-url';
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

  const queryKey = useMemo(() => catalogQueryCacheKey(query), [query]);

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
      limit: query.limit as 50 | 100 | 200 | 300 | undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice ?? query.priceMax,
      ageMax: query.ageMax,
      page: query.page,
    });
    if (base.city || !cityReady || !selectedCity || selectedCity.cityValue === 'all') return base;
    return { ...base, city: selectedCity.cityValue };
  }, [query, cityReady, selectedCity]);

  /** Effective query key including header-city inject (before URL catches up). */
  const effectiveQueryKey = useMemo(() => {
    if (!filterValues.city || query.city) return queryKey;
    return catalogQueryCacheKey({ ...query, city: filterValues.city });
  }, [filterValues.city, query, queryKey]);

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
    if (!params.get('city')?.trim() && filterValues.city) {
      params.set('city', filterValues.city);
    }
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

  const facets = catalog?.facets ?? {
    cities: [],
    categories: [],
    subcategories: [],
    landings: [],
    priceSteps: [],
  };

  return (
    <>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Каталог событий</h1>
        <p className="mt-2 text-sm text-slate-500">
          {loading && !catalog ? 'Загрузка…' : null}
          {catalog ? (
            <>
              {pluralEvents(catalog.total)}
              {catalog.items.length < catalog.total ? ` · показано ${catalog.items.length}` : ''}
            </>
          ) : null}
          {error ? error : null}
        </p>
      </div>

      <CatalogActiveFilters values={filterValues} />

      <div className="catalog-toolbar -mx-4 mt-6 border-b border-slate-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
        <CatalogToolbar
          facets={facets}
          values={filterValues}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          disabled={(loading && !catalog) || cityBootstrapPending}
          cityReady={cityReady || urlHasCity}
        />
      </div>

      {(loading && !catalog) || (cityBootstrapPending && !catalog) ? (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <CatalogResults
          items={catalog?.items ?? []}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {catalog ? (
        <CatalogPaginationLinks
          page={query.page}
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

export { ViewModeToggle } from '@/components/CatalogResults.client';
