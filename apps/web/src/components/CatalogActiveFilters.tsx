'use client';

import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';

import {
  AGE_FILTER_OPTIONS,
  buildCatalogHref,
  clearCatalogFilterKey,
  type CatalogFilterValues,
} from '@/lib/catalog-url';
import { persistSelectedCity } from '@/lib/selected-city';

export function CatalogActiveFilters({ values }: { values: CatalogFilterValues }) {
  const chips: Array<{ key: keyof CatalogFilterValues; label: string }> = [];

  if (values.q?.trim()) chips.push({ key: 'q', label: `«${values.q.trim()}»` });
  // Город только в хедере - не дублируем чипом (сброс города через селектор в шапке).
  if (values.category) chips.push({ key: 'category', label: values.category });
  if (values.landing) chips.push({ key: 'landing', label: values.landing });
  if (values.date) {
    const dateLabels: Record<string, string> = {
      today: 'Сегодня',
      tomorrow: 'Завтра',
      weekend: 'На выходных',
      evening: 'Вечером',
    };
    chips.push({ key: 'date', label: dateLabels[values.date] || values.date });
  }
  if (values.from || values.to) {
    chips.push({
      key: 'from',
      label: values.from && values.to ? `${values.from} - ${values.to}` : values.from || values.to || '',
    });
  }
  if (values.minPrice === 0 && values.maxPrice === 0) {
    chips.push({ key: 'minPrice', label: 'Бесплатно' });
  } else {
    if (values.minPrice != null) chips.push({ key: 'minPrice', label: `от ${values.minPrice} ₽` });
    if (values.maxPrice != null) chips.push({ key: 'maxPrice', label: `до ${values.maxPrice} ₽` });
  }
  if (values.ageMax != null && values.ageMax >= 0) {
    const ageLabel = AGE_FILTER_OPTIONS.find((item) => item.value === values.ageMax)?.label;
    chips.push({ key: 'ageMax', label: ageLabel ? `Возраст ${ageLabel}` : `до ${values.ageMax}+` });
  }

  if (!chips.length) return null;

  return (
    <div
      className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-3 sm:flex-wrap sm:overflow-visible sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white sm:p-2.5 sm:px-3"
      role="region"
      aria-label="Активные фильтры"
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 sm:pl-1 sm:pr-1">
        <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" />
        <span className="sm:hidden">{chips.length}</span>
        <span className="hidden sm:inline">Активно · {chips.length}</span>
      </span>
      {chips.map((chip) => (
        <Link
          key={`${chip.key}:${chip.label}`}
          href={buildCatalogHref(clearCatalogFilterKey(values, chip.key))}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary/20 transition hover:bg-primary/20"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden />
        </Link>
      ))}
      <Link
        href="/events"
        onClick={() => persistSelectedCity('all')}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 sm:ml-auto"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Сбросить
      </Link>
    </div>
  );
}
