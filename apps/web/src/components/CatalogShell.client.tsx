'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CatalogActiveFilters } from '@/components/CatalogActiveFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { CatalogResults } from '@/components/CatalogResults.client';
import { CatalogToolbar } from '@/components/CatalogToolbar.client';
import type { PublicCatalogDto } from '@daibilet/contracts/public';
import { catalogFiltersFromQuery } from '@/lib/catalog-url';
import { pluralEvents } from '@/lib/format';
import {
  parseCatalogViewMode,
  readStoredCatalogViewMode,
  storeCatalogViewMode,
  type CatalogViewMode,
} from '@/lib/catalog-view-mode';
import { parseCatalogPageQuery, searchParamsToRecord } from '@/server/catalog-query';

export function CatalogShell() {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [catalog, setCatalog] = useState<PublicCatalogDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<CatalogViewMode>('cards');

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

  const filterValues = useMemo(
    () =>
      catalogFiltersFromQuery({
        q: query.q,
        city: query.city,
        category: query.category,
        landing: query.landing,
        date: query.date,
        from: query.from,
        to: query.to,
        sort: query.sort,
        limit: query.limit as 100 | 200 | 300 | undefined,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice ?? query.priceMax,
        ageMax: query.ageMax,
        page: query.page,
      }),
    [query],
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
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const qs = urlSearchParams.toString();
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
  }, [urlSearchParams]);

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

      <div className="catalog-toolbar-sticky -mx-4 mt-6 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <CatalogToolbar
          facets={facets}
          values={filterValues}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          disabled={loading && !catalog}
        />
      </div>

      {loading && !catalog ? (
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
        <Link href="/venues" className="font-medium hover:text-primary">
          Площадки
        </Link>
        <Link href="/locations" className="font-medium hover:text-primary">
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
