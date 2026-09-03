import {
  CATALOG_PAGE_SIZE_DEFAULT,
  CATALOG_PAGE_SIZE_MAX,
  isCatalogPageSize,
} from '@daibilet/contracts/catalog';
import { publicCatalogQuerySchema, type PublicCatalogQuery } from '@daibilet/contracts/schemas';

export interface CatalogPageQuery extends PublicCatalogQuery {
  page: number;
}

function resolveCatalogOffset(
  query: { offset?: number; page?: number; limit?: number },
  limit: number,
): number {
  if (query.offset != null) return query.offset;
  const page = Math.max(1, query.page ?? 1);
  return page > 1 ? (page - 1) * limit : 0;
}

/** Filter snapshot for catalog cache keys (client listPage / SSR page). */
export function catalogFiltersCacheKey(
  filters: {
    q?: string;
    city?: string;
    category?: string;
    landing?: string;
    date?: string;
    from?: string;
    to?: string;
    sort?: string;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    ageMax?: number;
  },
  page: number,
): string {
  return catalogQueryCacheKey({
    q: filters.q,
    city: filters.city,
    category: filters.category,
    landing: filters.landing,
    date: filters.date,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
    limit: filters.limit,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    ageMax: filters.ageMax,
    page,
  });
}

/** Stable cache key for catalog SSR / client skip-fetch alignment. */
export function catalogQueryCacheKey(query: PublicCatalogQuery & { page?: number }): string {
  const limit = query.limit ?? CATALOG_PAGE_SIZE_DEFAULT;
  const normalized = {
    q: query.q ?? '',
    city: query.city ?? '',
    category: query.category ?? '',
    landing: query.landing ?? '',
    date: query.date ?? '',
    from: query.from ?? '',
    to: query.to ?? '',
    sort: query.sort ?? 'time',
    limit,
    offset: resolveCatalogOffset(query, limit),
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

/** SSR catalog: page N uses user limit (or default 50) for limit + offset. */
export function parseCatalogPageQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): CatalogPageQuery {
  const raw = searchParamsToRecord(input);
  const prepared = catalogQueryParams(raw);
  const parsed = publicCatalogQuerySchema.parse(prepared);
  const page = Math.max(1, Number.parseInt(raw.page || '1', 10) || 1);
  const userLimit = parsed.limit && isCatalogPageSize(parsed.limit) ? parsed.limit : undefined;

  const limit = userLimit ?? CATALOG_PAGE_SIZE_DEFAULT;

  if (page > 1) {
    return {
      ...parsed,
      page,
      limit,
      offset: resolveCatalogOffset({ ...parsed, page }, limit),
    };
  }

  return {
    ...parsed,
    page: 1,
    limit,
    offset: resolveCatalogOffset(parsed, limit),
  };
}

/** Last API page already present in the current catalog snapshot (1-based). */
export function resolveCatalogLastFetchedPage(offset: number | undefined, limit: number): number {
  const pageSize = Math.max(limit, 1);
  return Math.floor(Math.max(0, offset ?? 0) / pageSize) + 1;
}

/** Next page to request for append «Показать ещё» (null when everything is loaded). */
export function resolveCatalogNextFetchPage(
  snapshot: { offset?: number; total: number; items: unknown[] },
  limit: number,
): number | null {
  const pageSize = Math.max(limit, 1);
  const total = Math.max(0, snapshot.total);
  if (snapshot.items.length >= total) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const next = resolveCatalogLastFetchedPage(snapshot.offset, pageSize) + 1;
  return next <= totalPages ? next : null;
}

/** Stable query string for `/api/public/events` — not tied to Next `useSearchParams` sync. */
export function buildCatalogApiSearchParams(
  filters: {
    q?: string;
    city?: string;
    category?: string;
    landing?: string;
    date?: string;
    from?: string;
    to?: string;
    sort?: string;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    ageMax?: number;
  },
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set('q', q);
  if (filters.city) params.set('city', filters.city);
  if (filters.category) params.set('category', filters.category);
  if (filters.landing) params.set('landing', filters.landing);
  if (filters.date && filters.date !== 'all') params.set('date', filters.date);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.sort && filters.sort !== 'time') params.set('sort', filters.sort);
  const limit = filters.limit && filters.limit > 0 ? filters.limit : CATALOG_PAGE_SIZE_DEFAULT;
  if (limit !== CATALOG_PAGE_SIZE_DEFAULT) {
    params.set('limit', String(limit));
  }
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
  if (filters.ageMax != null && filters.ageMax >= 0) params.set('ageMax', String(filters.ageMax));
  const safePage = Math.max(1, page);
  // Nginx often proxies `/api/public/events` straight to backend, which pages by `offset`
  // (not `page`). Always send offset so «Показать ещё» does not re-fetch page 1.
  const offset = safePage > 1 ? (safePage - 1) * limit : 0;
  if (offset > 0) params.set('offset', String(offset));
  if (safePage > 1) params.set('page', String(safePage));
  return params;
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
  const page = Math.max(1, parsed.page ?? 1);
  return {
    ...parsed,
    limit,
    offset: resolveCatalogOffset({ ...parsed, page }, limit),
  };
}
