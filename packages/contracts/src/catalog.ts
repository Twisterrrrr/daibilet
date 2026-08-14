/** Public catalog page sizes (SSR default + UI selector). Launch: keep 50/100 only. */
export const CATALOG_PAGE_SIZES = [50, 100] as const;

export type CatalogPageSize = (typeof CATALOG_PAGE_SIZES)[number];

export const CATALOG_PAGE_SIZE_DEFAULT: CatalogPageSize = 50;

export const CATALOG_PAGE_SIZE_MAX: CatalogPageSize = 100;

export function isCatalogPageSize(value: number): value is CatalogPageSize {
  return (CATALOG_PAGE_SIZES as readonly number[]).includes(value);
}
