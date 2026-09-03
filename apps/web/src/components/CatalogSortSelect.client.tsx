'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  id?: string;
};

/**
 * Custom sort menu: width follows the selected label, not the longest option
 * (native <select> on mobile refuses to shrink and knocks view-mode to the next row).
 * Visible copy is the option itself - never «Сортировка по:».
 */
export function CatalogSortSelect({
  value,
  disabled = false,
  onChange,
  className = '',
  size = 'sm',
  id,
}: CatalogSortSelectProps) {
  const autoId = useId();
  const selectId = id || autoId;
  const selected = resolveCatalogSortSelectValue(value);
  const selectedLabel =
    CATALOG_SORT_OPTIONS.find((option) => option.value === selected)?.label || 'Ближайшие';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pad = size === 'md' ? 'h-9 px-3 text-sm' : 'h-8 px-2.5 text-xs';

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Сортировка: ${selectedLabel}`}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border-0 bg-[#F5F5F7] font-medium text-slate-800 outline-none transition hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 ${pad} w-full justify-between`}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden
          className={`shrink-0 text-slate-500 ${size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} ${
            open ? 'rotate-180' : ''
          }`}
          strokeWidth={1.75}
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-labelledby={selectId}
          className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {CATALOG_SORT_OPTIONS.map((option) => {
            const active = option.value === selected;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full px-3 py-2 text-left text-sm font-medium transition ${
                    active ? 'bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
