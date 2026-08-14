'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

import {
  AGE_FILTER_OPTIONS,
  buildCatalogHref,
  clearCatalogFilterKey,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

/**
 * Extra chips only for filters that are NOT already visible in the date rail,
 * category rail, or header city picker. Selected category stays highlighted
 * in the chip strip itself.
 */
export function CatalogActiveFilters({ values }: { values: CatalogFilterValues }) {
  const chips: Array<{ key: keyof CatalogFilterValues; label: string; onClear?: () => void }> = [];

  if (values.q?.trim()) chips.push({ key: 'q', label: `«${values.q.trim()}»` });
  if (values.landing) chips.push({ key: 'landing', label: values.landing });
  // Exact day / preset already highlighted on the date rail; only custom ranges here.
  if ((values.from || values.to) && values.from !== values.to) {
    chips.push({
      key: 'from',
      label: values.from && values.to ? `${values.from} - ${values.to}` : values.from || values.to || '',
    });
  }
  // «Бесплатно» lives on the quick chip row.
  if (!(values.minPrice === 0 && values.maxPrice === 0)) {
    if (values.minPrice != null) chips.push({ key: 'minPrice', label: `от ${values.minPrice} ₽` });
    if (values.maxPrice != null) chips.push({ key: 'maxPrice', label: `до ${values.maxPrice} ₽` });
  }
  // «С детьми» (ageMax=12) lives on the quick chip row.
  if (values.ageMax != null && values.ageMax >= 0 && values.ageMax !== 12) {
    const ageLabel = AGE_FILTER_OPTIONS.find((item) => item.value === values.ageMax)?.label;
    chips.push({
      key: 'ageMax',
      label: ageLabel ? `Возраст ${ageLabel}` : `до ${values.ageMax}+`,
    });
  }

  if (!chips.length) return null;

  return (
    <div
      className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-3 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="region"
      aria-label="Дополнительные фильтры"
    >
      {chips.map((chip) => (
        <Link
          key={`${chip.key}:${chip.label}`}
          href={buildCatalogHref(clearCatalogFilterKey(values, chip.key))}
          onClick={chip.onClear}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-graphite transition hover:bg-slate-200/80"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden strokeWidth={1.75} />
        </Link>
      ))}
      <Link
        href={buildCatalogHref({
          city: values.city,
          category: values.category,
          date: values.date,
          sort: values.sort,
          limit: values.limit,
        })}
        className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-graphite-muted transition hover:bg-surface-muted hover:text-graphite"
      >
        <X className="h-3.5 w-3.5" aria-hidden strokeWidth={1.75} />
        Сбросить
      </Link>
    </div>
  );
}
