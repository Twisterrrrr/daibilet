import type { CatalogFilterValues } from '@/lib/catalog-url';

export type CatalogPresetSlug = 'evening' | 'weekend' | 'free' | 'cheap' | 'soon';

export const CATALOG_PRESETS: Array<{ slug: CatalogPresetSlug; label: string; emoji: string }> = [
  { slug: 'evening', label: 'Сегодня вечером', emoji: '🌙' },
  { slug: 'weekend', label: 'На выходных', emoji: '🎉' },
  { slug: 'free', label: 'Бесплатно', emoji: '🆓' },
  { slug: 'cheap', label: 'До 2000 ₽', emoji: '💸' },
  { slug: 'soon', label: 'Скоро начнётся', emoji: '⚡️' },
];

export function catalogPresetMatches(slug: CatalogPresetSlug, filters: CatalogFilterValues): boolean {
  if (slug === 'evening') return filters.date === 'evening';
  if (slug === 'weekend') return filters.date === 'weekend';
  if (slug === 'free') return filters.minPrice === 0 && filters.maxPrice === 0;
  if (slug === 'cheap') return filters.maxPrice === 2000 && filters.minPrice == null;
  if (slug === 'soon') return filters.sort === 'time' && !filters.date;
  return false;
}

export function buildCatalogPresetValues(
  slug: CatalogPresetSlug,
  active: boolean,
): CatalogFilterValues {
  if (active) {
    return { sort: 'popular' };
  }
  if (slug === 'evening') return { date: 'evening', sort: 'time' };
  if (slug === 'weekend') return { date: 'weekend', sort: 'popular' };
  if (slug === 'free') return { minPrice: 0, maxPrice: 0, sort: 'popular' };
  if (slug === 'cheap') return { maxPrice: 2000, sort: 'price_asc' };
  return { sort: 'time' };
}
