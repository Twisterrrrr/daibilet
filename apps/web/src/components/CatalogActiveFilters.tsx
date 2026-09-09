'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

import { displayCatalogLabel } from '@/lib/catalog-labels';
import { formatCatalogDateRangeLabel } from '@/lib/catalog-date-rail';
import {
  catalogExcludeThemeChip,
  normalizeExcludeLandingList,
  removeExcludeLanding,
} from '@/lib/catalog-exclude-themes';
import {
  AGE_FILTER_OPTIONS,
  buildCatalogHref,
  clearCatalogFilterKey,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

const DATE_CHIP_LABELS: Record<string, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'На выходных',
  evening: 'Вечером',
};

function humanDateChipLabel(raw: string): string | null {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return null;
  if (DATE_CHIP_LABELS[key]) return DATE_CHIP_LABELS[key];
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return formatCatalogDateRangeLabel(key, key)?.replace(/\u2014/g, '-') || key;
  }
  return raw.trim();
}

/**
 * Removable chips for the active catalog slice.
 * Category / search / date always surface here so the H1 is not the only signal.
 * City stays in the header picker (not duplicated as a chip).
 */
export function CatalogActiveFilters({
  values,
  className = '',
}: {
  values: CatalogFilterValues;
  className?: string;
}) {
  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (values.q?.trim()) {
    chips.push({
      key: 'q',
      label: `«${values.q.trim()}»`,
      href: buildCatalogHref(clearCatalogFilterKey(values, 'q')),
    });
  }
  if (values.category) {
    chips.push({
      key: 'category',
      label: displayCatalogLabel(values.category),
      href: buildCatalogHref(clearCatalogFilterKey(values, 'category')),
    });
  }
  if (values.landing) {
    chips.push({
      key: 'landing',
      label: values.landing,
      href: buildCatalogHref(clearCatalogFilterKey(values, 'landing')),
    });
  }

  for (const slug of normalizeExcludeLandingList(values.excludeLanding)) {
    chips.push({
      key: `exclude:${slug}`,
      label: `без ${catalogExcludeThemeChip(slug)}`,
      href: buildCatalogHref({
        ...values,
        excludeLanding: removeExcludeLanding(values.excludeLanding, slug),
        page: undefined,
      }),
    });
  }

  if (values.from || values.to) {
    const rangeLabel = formatCatalogDateRangeLabel(values.from, values.to)?.replace(/\u2014/g, '-');
    chips.push({
      key: 'from',
      label: rangeLabel || [values.from, values.to].filter(Boolean).join(' - '),
      href: buildCatalogHref(clearCatalogFilterKey(values, 'from')),
    });
  } else if (values.date) {
    const dateLabel = humanDateChipLabel(values.date);
    if (dateLabel) {
      chips.push({
        key: 'date',
        label: dateLabel,
        href: buildCatalogHref(clearCatalogFilterKey(values, 'date')),
      });
    }
  }

  // «Бесплатно» lives on the quick chip row.
  if (!(values.minPrice === 0 && values.maxPrice === 0)) {
    if (values.minPrice != null) {
      chips.push({
        key: 'minPrice',
        label: `от ${values.minPrice} ₽`,
        href: buildCatalogHref(clearCatalogFilterKey(values, 'minPrice')),
      });
    }
    if (values.maxPrice != null) {
      chips.push({
        key: 'maxPrice',
        label: `до ${values.maxPrice} ₽`,
        href: buildCatalogHref(clearCatalogFilterKey(values, 'maxPrice')),
      });
    }
  }
  // «С детьми» (ageMax=12) lives on the quick chip row.
  if (values.ageMax != null && values.ageMax >= 0 && values.ageMax !== 12) {
    const ageLabel = AGE_FILTER_OPTIONS.find((item) => item.value === values.ageMax)?.label;
    chips.push({
      key: 'ageMax',
      label: ageLabel ? `Возраст ${ageLabel}` : `до ${values.ageMax}+`,
      href: buildCatalogHref(clearCatalogFilterKey(values, 'ageMax')),
    });
  }

  if (!chips.length) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-graphite-muted ${className}`}
      role="region"
      aria-label="Активные фильтры"
    >
      {chips.map((chip) => (
        <Link
          key={`${chip.key}:${chip.label}`}
          href={chip.href}
          className="inline-flex items-center gap-1 text-graphite transition hover:text-primary"
        >
          <span>{chip.label}</span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden strokeWidth={2} />
          <span className="sr-only">Убрать фильтр</span>
        </Link>
      ))}
      <Link
        href={buildCatalogHref({
          city: values.city,
          sort: values.sort,
          limit: values.limit,
        })}
        className="inline-flex items-center gap-1 text-graphite-muted/80 transition hover:text-graphite"
      >
        Сбросить все
      </Link>
    </div>
  );
}

/** Resolve a short date label for H1 (presets + ISO day/range). */
export function catalogActiveDateHeadingLabel(values: CatalogFilterValues): string | null {
  if (values.from || values.to) {
    return formatCatalogDateRangeLabel(values.from, values.to)?.replace(/\u2014/g, '-') || null;
  }
  if (values.date) return humanDateChipLabel(values.date);
  return null;
}
