'use client';

import { ChevronDown } from 'lucide-react';

import {
  CATALOG_SORT_OPTIONS,
  resolveCatalogSortSelectValue,
  type CatalogSort,
} from '@/lib/catalog-url';

type CatalogSortSelectProps = {
  value?: CatalogSort | string | null;
  disabled?: boolean;
  onChange: (sort: CatalogSort) => void;
  className?: string;
  /** Compact meta-row variant vs sticky toolbar. */
  size?: 'sm' | 'md';
};

/**
 * Single select for `/events` sort (replaces chip radiogroup).
 * Visible label is the option itself - no «Сортировка по:» prefix.
 */
export function CatalogSortSelect({
  value,
  disabled = false,
  onChange,
  className = '',
  size = 'sm',
}: CatalogSortSelectProps) {
  const selected = resolveCatalogSortSelectValue(value);
  const pad = size === 'md' ? 'h-9 pl-3 pr-9 text-sm' : 'h-8 pl-2.5 pr-8 text-xs';

  return (
    <div className={`relative inline-flex min-w-0 ${className}`}>
      <label className="sr-only" htmlFor="catalog-sort-select">
        Сортировка
      </label>
      <select
        id="catalog-sort-select"
        value={selected}
        disabled={disabled}
        aria-label="Сортировка"
        onChange={(event) => onChange(event.target.value as CatalogSort)}
        className={`w-full min-w-0 max-w-full appearance-none truncate rounded-full border-0 bg-[#F5F5F7] font-medium text-slate-800 outline-none transition hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 ${pad}`}
      >
        {CATALOG_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-500 ${
          size === 'md' ? 'right-3 h-4 w-4' : 'right-2.5 h-3.5 w-3.5'
        }`}
        strokeWidth={1.75}
      />
    </div>
  );
}
