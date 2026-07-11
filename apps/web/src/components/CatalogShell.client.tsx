'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CatalogActiveFilters } from '@/components/CatalogActiveFilters';
import { CatalogPaginationLinks } from '@/components/CatalogPaginationLinks';
import { CatalogResults, ViewModeToggle } from '@/components/CatalogResults.client';
import { CatalogToolbar } from '@/components/CatalogToolbar.client';
import type { PublicCatalogDto, PublicSessionDto } from '@daibilet/contracts/public';
import type { CatalogFilterValues } from '@/lib/catalog-url';
import {
  parseCatalogViewMode,
  readStoredCatalogViewMode,
  storeCatalogViewMode,
  type CatalogViewMode,
} from '@/lib/catalog-view-mode';

type CatalogShellProps = {
  facets: PublicCatalogDto['facets'];
  filterValues: CatalogFilterValues;
  items: PublicSessionDto[];
  page: number;
  total: number;
  limit: number;
  searchParams: Record<string, string | string[] | undefined>;
};

export function CatalogShell({
  facets,
  filterValues,
  items,
  page,
  total,
  limit,
  searchParams,
}: CatalogShellProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [viewMode, setViewModeState] = useState<CatalogViewMode>('cards');

  useEffect(() => {
    const fromUrl = urlSearchParams.get('view');
    if (fromUrl) {
      setViewModeState(parseCatalogViewMode(fromUrl));
      return;
    }
    setViewModeState(readStoredCatalogViewMode() || 'cards');
  }, [urlSearchParams]);

  const setViewMode = useCallback(
    (next: CatalogViewMode) => {
      setViewModeState(next);
      storeCatalogViewMode(next);
      const params = new URLSearchParams(urlSearchParams.toString());
      if (next === 'cards') params.delete('view');
      else params.set('view', next);
      const query = params.toString();
      router.replace(query ? `/events?${query}` : '/events', { scroll: false });
    },
    [router, urlSearchParams],
  );

  return (
    <>
      <div className="catalog-toolbar-sticky -mx-4 mt-6 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <CatalogToolbar facets={facets} values={filterValues} viewMode={viewMode} onViewModeChange={setViewMode} />
        <CatalogActiveFilters values={filterValues} />
      </div>

      <CatalogResults items={items} viewMode={viewMode} onViewModeChange={setViewMode} />

      <CatalogPaginationLinks page={page} total={total} limit={limit} searchParams={searchParams} />
    </>
  );
}

export { ViewModeToggle };
