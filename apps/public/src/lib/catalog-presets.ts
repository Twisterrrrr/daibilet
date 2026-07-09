type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening';

export type CatalogPresetSlug = 'evening' | 'weekend' | 'free' | 'cheap' | 'soon';

export type CatalogPreset = {
  slug: CatalogPresetSlug;
  label: string;
};

export const CATALOG_PRESETS: CatalogPreset[] = [
  { slug: 'evening', label: 'Сегодня вечером' },
  { slug: 'weekend', label: 'На выходных' },
  { slug: 'free', label: 'Бесплатно' },
  { slug: 'cheap', label: 'До 2000 ₽' },
  { slug: 'soon', label: 'Скоро начнётся' },
];

export const CATALOG_PRESET_EMOJI: Record<CatalogPresetSlug, string> = {
  evening: '🌙',
  weekend: '🎉',
  free: '🆓',
  cheap: '💸',
  soon: '⚡️',
};

export const CATALOG_PRESET_HINT: Record<CatalogPresetSlug, string> = {
  evening: 'Открыть подборку → каталог событий с этим фильтром.',
  weekend: 'Открыть подборку → каталог событий с этим фильтром.',
  free: 'Открыть подборку → каталог событий с этим фильтром.',
  cheap: 'Открыть подборку → каталог событий с этим фильтром.',
  soon: 'Открыть подборку → каталог событий с этим фильтром.',
};

export type CatalogFiltersSnapshot = {
  date: DateFilter;
  minPrice: string;
  maxPrice: string;
  sort: 'time' | 'price' | 'popular';
};

export function catalogPresetMatches(slug: CatalogPresetSlug, filters: CatalogFiltersSnapshot): boolean {
  if (slug === 'evening') return filters.date === 'evening';
  if (slug === 'weekend') return filters.date === 'weekend';
  if (slug === 'free') return filters.minPrice === '0' && filters.maxPrice === '0';
  if (slug === 'cheap') return filters.maxPrice === '2000' && filters.minPrice === 'all';
  if (slug === 'soon') return filters.sort === 'time';
  return false;
}

export function applyCatalogPreset(
  slug: CatalogPresetSlug,
  active: boolean,
): Partial<CatalogFiltersSnapshot & { dateFrom: string; dateTo: string; ageMax: number }> {
  if (active) {
    return { date: 'all', minPrice: 'all', maxPrice: 'all', sort: 'popular', dateFrom: '', dateTo: '', ageMax: -1 };
  }
  if (slug === 'evening') return { date: 'evening', dateFrom: '', dateTo: '' };
  if (slug === 'weekend') return { date: 'weekend', dateFrom: '', dateTo: '' };
  if (slug === 'free') return { minPrice: '0', maxPrice: '0', date: 'all' };
  if (slug === 'cheap') return { maxPrice: '2000', minPrice: 'all', date: 'all' };
  return { sort: 'time', date: 'all' };
}
