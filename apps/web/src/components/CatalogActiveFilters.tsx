import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';

import {
  AGE_FILTER_OPTIONS,
  buildCatalogHref,
  clearCatalogFilterKey,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

export function CatalogActiveFilters({ values }: { values: CatalogFilterValues }) {
  const chips: Array<{ key: keyof CatalogFilterValues; label: string }> = [];

  if (values.q?.trim()) chips.push({ key: 'q', label: `«${values.q.trim()}»` });
  if (values.city) chips.push({ key: 'city', label: values.city });
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
      label: values.from && values.to ? `${values.from} — ${values.to}` : values.from || values.to || '',
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
      className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      role="region"
      aria-label="Активные фильтры"
    >
      <span className="inline-flex items-center gap-1.5 pl-1 pr-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" />
        Активно · {chips.length}
      </span>
      {chips.map((chip) => (
        <Link
          key={`${chip.key}:${chip.label}`}
          href={buildCatalogHref(clearCatalogFilterKey(values, chip.key))}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary/20 transition hover:bg-primary/20"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden />
        </Link>
      ))}
      <Link
        href="/events"
        className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Сбросить фильтры
      </Link>
    </div>
  );
}
