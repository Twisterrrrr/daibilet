'use client';

import { useEffect, useState } from 'react';

import type { CatalogFilterValues } from '@/lib/catalog-url';

import type { AdvancedCatalogFilters } from '@/components/CatalogAdvancedFiltersPanel.client';

export const CATALOG_PREVIEW_DEBOUNCE_MS = 350;

/** Build `limit=1` query for live result count from committed catalog filters. */
export function buildCatalogPreviewQuery(filters: CatalogFilterValues): string {
  const params = new URLSearchParams();
  params.set('limit', '1');
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.city) params.set('city', filters.city);
  if (filters.category) params.set('category', filters.category);
  if (filters.sort && filters.sort !== 'time') params.set('sort', filters.sort);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  else if (filters.date) params.set('date', filters.date);
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
  if (filters.ageMax != null && filters.ageMax >= 0) params.set('ageMax', String(filters.ageMax));
  if (filters.landing) params.set('landing', filters.landing);
  return params.toString();
}

/** Preview query when advanced sheet draft differs from URL (sheet footer). */
export function buildAdvancedPreviewQuery(
  context: { q?: string; city?: string; category?: string; sort?: string },
  draft: AdvancedCatalogFilters,
  minDraft: string,
  maxDraft: string,
): string {
  const params = new URLSearchParams();
  params.set('limit', '1');
  if (context.q?.trim()) params.set('q', context.q.trim());
  if (context.city) params.set('city', context.city);
  if (context.category) params.set('category', context.category);
  if (context.sort && context.sort !== 'time') params.set('sort', context.sort);

  const hasRange = Boolean(draft.dateFrom || draft.dateTo);
  if (hasRange) {
    if (draft.dateFrom) params.set('from', draft.dateFrom);
    if (draft.dateTo) params.set('to', draft.dateTo);
  } else if (draft.date) {
    params.set('date', draft.date);
  }

  const minPrice = minDraft.trim() ? Number(minDraft.trim()) : NaN;
  const maxPrice = maxDraft.trim() ? Number(maxDraft.trim()) : NaN;
  if (Number.isFinite(minPrice)) params.set('minPrice', String(minPrice));
  if (Number.isFinite(maxPrice)) params.set('maxPrice', String(maxPrice));
  if (draft.ageMax >= 0) params.set('ageMax', String(draft.ageMax));
  if (draft.landing && draft.landing !== 'all') params.set('landing', draft.landing);

  return params.toString();
}

export function useCatalogPreviewCount(queryString: string | null, debounceMs = CATALOG_PREVIEW_DEBOUNCE_MS) {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!queryString) {
      setTotal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/public/events?${queryString}`, {
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('preview failed');
        const payload = (await response.json()) as { total?: number };
        if (!cancelled) {
          setTotal(typeof payload.total === 'number' ? payload.total : null);
        }
      } catch {
        if (!cancelled) setTotal(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryString, debounceMs]);

  return { total, loading };
}
