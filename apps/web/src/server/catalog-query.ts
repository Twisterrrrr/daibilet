import {
  CATALOG_PAGE_SIZE_DEFAULT,
  CATALOG_PAGE_SIZE_MAX,
  isCatalogPageSize,
} from '@daibilet/contracts/catalog';
import { publicCatalogQuerySchema, type PublicCatalogQuery } from '@daibilet/contracts/schemas';

export interface CatalogPageQuery extends PublicCatalogQuery {
  page: number;
}

/** Stable cache key for catalog SSR / client skip-fetch alignment. */
export function catalogQueryCacheKey(query: PublicCatalogQuery): string {
  const normalized = {
    q: query.q ?? '',
    city: query.city ?? '',
    category: query.category ?? '',
    landing: query.landing ?? '',
    date: query.date ?? '',
    from: query.from ?? '',
    to: query.to ?? '',
    sort: query.sort ?? 'time',
    limit: query.limit ?? CATALOG_PAGE_SIZE_DEFAULT,
    offset: query.offset ?? 0,
    minPrice: query.minPrice ?? '',
    maxPrice: query.maxPrice ?? query.priceMax ?? '',
    ageMax: query.ageMax ?? '',
    ids: Array.isArray(query.ids) ? [...query.ids].sort().join(',') : '',
  };
  return JSON.stringify(normalized);
}

export function searchParamsToRecord(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): Record<string, string> {
  if (input instanceof URLSearchParams) {
    return Object.fromEntries(input.entries());
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') result[key] = value;
    else if (Array.isArray(value) && value[0]) result[key] = value[0];
  }
  return result;
}

/** UI-only query keys — must not fail catalog SSR/API validation. */
const CATALOG_UI_QUERY_KEYS = new Set(['view']);

function catalogQueryParams(raw: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (CATALOG_UI_QUERY_KEYS.has(key)) continue;
    filtered[key] = value;
  }
  return {
    ...filtered,
    from: filtered.from || filtered.dateFrom,
    to: filtered.to || filtered.dateTo,
  };
}

/** SSR catalog: page 1 uses user limit or default 50; crawlable ?page=N uses fixed chunks. */
export function parseCatalogPageQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): CatalogPageQuery {
  const raw = searchParamsToRecord(input);
  const prepared = catalogQueryParams(raw);
  const parsed = publicCatalogQuerySchema.parse(prepared);
  const page = Math.max(1, Number.parseInt(raw.page || '1', 10) || 1);
  const userLimit = parsed.limit && isCatalogPageSize(parsed.limit) ? parsed.limit : undefined;

  if (page > 1) {
    return {
      ...parsed,
      page,
      limit: CATALOG_PAGE_SIZE_DEFAULT,
      offset: (page - 1) * CATALOG_PAGE_SIZE_DEFAULT,
    };
  }

  return {
    ...parsed,
    page: 1,
    limit: userLimit ?? CATALOG_PAGE_SIZE_DEFAULT,
    offset: parsed.offset ?? 0,
  };
}

export function parseCatalogApiQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): PublicCatalogQuery {
  const raw = searchParamsToRecord(input);
  const prepared = catalogQueryParams(raw);
  const parsed = publicCatalogQuerySchema.parse(prepared);
  const limit = parsed.limit
    ? Math.min(Math.max(parsed.limit, 1), CATALOG_PAGE_SIZE_MAX)
    : CATALOG_PAGE_SIZE_DEFAULT;
  return {
    ...parsed,
    limit,
    offset: parsed.offset ?? 0,
  };
}
