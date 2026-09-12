'use client';

import { useMemo } from 'react';

import { pluralEvents } from '@/lib/format';
import { buildCatalogPreviewQuery, useCatalogPreviewCount } from '@/lib/catalog-preview';
import type { CatalogFilterValues } from '@/lib/catalog-url';

type CatalogDrawerApplyFooterProps = {
  filters: CatalogFilterValues;
  disabled?: boolean;
  onApply: () => void;
};

export function CatalogDrawerApplyFooter({
  filters,
  disabled = false,
  onApply,
}: CatalogDrawerApplyFooterProps) {
  const queryString = useMemo(() => buildCatalogPreviewQuery(filters), [filters]);
  const { total, loading } = useCatalogPreviewCount(queryString);

  const label = loading
    ? 'Считаем…'
    : total === 0
      ? 'Нет событий'
      : total != null
        ? `Показать ${pluralEvents(total)}`
        : 'Показать события';

  return (
    <button
      type="button"
      disabled={disabled || loading || total === 0}
      onClick={onApply}
      className="inline-btn inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
