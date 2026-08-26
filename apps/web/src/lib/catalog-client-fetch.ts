import { CATALOG_PAGE_SIZE_DEFAULT, CATALOG_PAGE_SIZE_MAX, isCatalogPageSize, type CatalogPageSize } from '@daibilet/contracts/catalog';

/** Client-side catalog fetch budget. */
export function catalogClientFetchTimeoutMs(limit?: number | null): number {
  const size =
    typeof limit === 'number' && Number.isFinite(limit) ? limit : CATALOG_PAGE_SIZE_DEFAULT;
  if (size >= CATALOG_PAGE_SIZE_MAX) return 15_000;
  return 8_000;
}

export function readCatalogLimitFromSearchParams(params: URLSearchParams): CatalogPageSize | undefined {
  const raw = Number.parseInt(params.get('limit') || '', 10);
  if (!Number.isFinite(raw)) return undefined;
  if (isCatalogPageSize(raw)) return raw;
  return undefined;
}
