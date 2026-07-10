import {
  CATALOG_PAGE_SIZE_DEFAULT,
  CATALOG_PAGE_SIZE_MAX,
  isCatalogPageSize,
} from '@daibilet/contracts/catalog';
import { publicCatalogQuerySchema, type PublicCatalogQuery } from '@daibilet/contracts/schemas';

export interface CatalogPageQuery extends PublicCatalogQuery {
  page: number;
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

/** SSR catalog: page 1 always limit=100; crawlable ?page=N uses fixed 100-item chunks. */
export function parseCatalogPageQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): CatalogPageQuery {
  const raw = searchParamsToRecord(input);
  const prepared = {
    ...raw,
    from: raw.from || raw.dateFrom,
    to: raw.to || raw.dateTo,
  };
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
  const prepared = {
    ...raw,
    from: raw.from || raw.dateFrom,
    to: raw.to || raw.dateTo,
  };
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
