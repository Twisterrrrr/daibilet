import { CATALOG_PAGE_SIZE_DEFAULT, CATALOG_PAGE_SIZES, type CatalogPageSize } from '@daibilet/contracts/catalog';

export type CatalogSort = 'time' | 'price' | 'price_asc' | 'price_desc' | 'popular' | 'departing_soon';

export interface CatalogFilterValues {
  q?: string;
  city?: string;
  category?: string;
  landing?: string;
  date?: string;
  from?: string;
  to?: string;
  sort?: CatalogSort;
  limit?: CatalogPageSize;
  minPrice?: number;
  maxPrice?: number;
  ageMax?: number;
  page?: number;
}

export const CATALOG_SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'time', label: 'По времени' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'popular', label: 'Популярные' },
];

export const CATALOG_DATE_OPTIONS = [
  { value: 'all', label: 'Любая дата' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'На выходных' },
  { value: 'evening', label: 'Вечером' },
] as const;

export const AGE_FILTER_OPTIONS = [
  { value: -1, label: 'Любой возраст' },
  { value: 0, label: '0+' },
  { value: 6, label: '6+' },
  { value: 12, label: '12+' },
  { value: 16, label: '16+' },
  { value: 18, label: '18+' },
] as const;

export function catalogFiltersFromQuery(query: CatalogFilterValues): CatalogFilterValues {
  return {
    q: query.q || undefined,
    city: query.city && query.city !== 'all' ? query.city : undefined,
    category: query.category && query.category !== 'all' ? query.category : undefined,
    landing: query.landing && query.landing !== 'all' ? query.landing : undefined,
    date: query.date && query.date !== 'all' ? query.date : undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    sort: query.sort || 'time',
    limit: query.limit && CATALOG_PAGE_SIZES.includes(query.limit) ? query.limit : CATALOG_PAGE_SIZE_DEFAULT,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    ageMax: query.ageMax != null && query.ageMax >= 0 ? query.ageMax : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
  };
}

export function buildCatalogHref(values: CatalogFilterValues): string {
  const params = new URLSearchParams();

  if (values.q?.trim()) params.set('q', values.q.trim());
  if (values.city) params.set('city', values.city);
  if (values.category) params.set('category', values.category);
  if (values.landing) params.set('landing', values.landing);
  if (values.date) params.set('date', values.date);
  if (values.from) params.set('from', values.from);
  if (values.to) params.set('to', values.to);
  if (values.sort && values.sort !== 'time') params.set('sort', values.sort);
  if (values.limit && values.limit !== CATALOG_PAGE_SIZE_DEFAULT) params.set('limit', String(values.limit));
  if (values.minPrice != null) params.set('minPrice', String(values.minPrice));
  if (values.maxPrice != null) params.set('maxPrice', String(values.maxPrice));
  if (values.ageMax != null && values.ageMax >= 0) params.set('ageMax', String(values.ageMax));
  if (values.page && values.page > 1) params.set('page', String(values.page));

  const query = params.toString();
  return query ? `/events?${query}` : '/events';
}

export function mergeCatalogFilters(
  base: CatalogFilterValues,
  patch: Partial<CatalogFilterValues>,
  options?: { resetPage?: boolean },
): CatalogFilterValues {
  const next: CatalogFilterValues = { ...base, ...patch };
  if (options?.resetPage !== false) {
    delete next.page;
  }
  return catalogFiltersFromQuery(next);
}

export function clearCatalogFilterKey(
  base: CatalogFilterValues,
  key: keyof CatalogFilterValues,
): CatalogFilterValues {
  const next = { ...base };
  if (key === 'q') delete next.q;
  if (key === 'city') delete next.city;
  if (key === 'category') delete next.category;
  if (key === 'landing') delete next.landing;
  if (key === 'date') delete next.date;
  if (key === 'from') {
    delete next.from;
    delete next.to;
  }
  if (key === 'to') {
    delete next.from;
    delete next.to;
  }
  if (key === 'minPrice') delete next.minPrice;
  if (key === 'maxPrice') delete next.maxPrice;
  if (key === 'ageMax') delete next.ageMax;
  if (key === 'sort') next.sort = 'time';
  delete next.page;
  return catalogFiltersFromQuery(next);
}

export function countAdvancedFilters(values: CatalogFilterValues): number {
  let count = 0;
  if (values.from || values.to) count += 1;
  if (values.minPrice != null || values.maxPrice != null) count += 1;
  if (values.ageMax != null && values.ageMax >= 0) count += 1;
  if (values.landing) count += 1;
  return count;
}
