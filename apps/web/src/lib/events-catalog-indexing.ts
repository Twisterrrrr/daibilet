export const EVENTS_CATALOG_PATH = '/events';
export const EVENTS_CATALOG_NOINDEX = 'noindex, follow';
export const EVENTS_CATALOG_ROBOTS_HINT_HEADER = 'X-Daibilet-Robots';
export const EVENTS_CATALOG_CANONICAL_HINT_HEADER = 'X-Daibilet-Canonical';

export type EventsCatalogUrlClass =
  | 'hub'
  | 'duplicate'
  | 'pagination'
  | 'facet'
  | 'unknown'
  | 'promoted';

export type EventsCatalogPromotion = {
  /** Normalized query produced by this module, without a leading `?`. */
  signature: string;
  destinationPath: string;
  active: boolean;
};

export type EventsCatalogIndexingDecision = {
  urlClass: EventsCatalogUrlClass;
  normalizedQuery: string;
  canonicalPath: string;
  indexable: boolean;
  sitemapEligible: boolean;
  robots: typeof EVENTS_CATALOG_NOINDEX | null;
  redirectPath: string | null;
};

/**
 * A promoted filter must move to a clean editorial route. Query URLs stay a UX
 * concern and never become indexable landing pages in place.
 */
export const EVENTS_CATALOG_PROMOTIONS: readonly EventsCatalogPromotion[] = [];

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'yclid',
  'ysclid',
  'fbclid',
  'ref',
]);

const PRESENTATION_PARAMS = new Set(['view']);

const CATALOG_PARAMS = new Set([
  'q',
  'city',
  'category',
  'landing',
  'excludeLanding',
  'date',
  'from',
  'to',
  'sort',
  'limit',
  'minPrice',
  'maxPrice',
  'ageMax',
  'page',
]);

const PARAM_ALIASES: Readonly<Record<string, string>> = {
  dateFrom: 'from',
  dateTo: 'to',
  priceMax: 'maxPrice',
};

function parseInput(input: URL | URLSearchParams | string): {
  pathname: string;
  params: URLSearchParams;
} {
  if (input instanceof URL) {
    return { pathname: input.pathname, params: input.searchParams };
  }
  if (input instanceof URLSearchParams) {
    return { pathname: EVENTS_CATALOG_PATH, params: input };
  }
  const parsed = new URL(input, 'https://daibilet.ru');
  return { pathname: parsed.pathname, params: parsed.searchParams };
}

function normalizeInteger(value: string): string {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return trimmed;
  return String(Number.parseInt(trimmed, 10));
}

function normalizeParamValue(key: string, rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  if (key === 'page') {
    const normalized = normalizeInteger(value);
    return /^\d+$/.test(normalized) && Number(normalized) <= 1 ? null : normalized;
  }
  if (key === 'limit') {
    const normalized = normalizeInteger(value);
    return normalized === '50' ? null : normalized;
  }
  if (key === 'sort') {
    const normalized = value.toLowerCase() === 'price' ? 'price_asc' : value.toLowerCase();
    return normalized === 'time' ? null : normalized;
  }
  if (key === 'city' || key === 'category' || key === 'landing' || key === 'date') {
    return value.toLowerCase() === 'all' ? null : value;
  }
  if (key === 'excludeLanding') {
    const values = [
      ...new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)),
    ];
    values.sort((left, right) => left.localeCompare(right));
    return values.length ? values.join(',') : null;
  }
  if (key === 'minPrice' || key === 'maxPrice' || key === 'ageMax') {
    return normalizeInteger(value);
  }
  return value;
}

export function normalizeEventsCatalogQuery(input: URLSearchParams): {
  params: URLSearchParams;
  hasUnknownParams: boolean;
  hadRawParams: boolean;
} {
  // Match Object.fromEntries/searchParams behavior used by the catalog: the
  // last occurrence of a repeated key wins.
  const raw = new Map<string, string>();
  for (const [key, value] of input.entries()) raw.set(key, value);

  for (const [alias, canonical] of Object.entries(PARAM_ALIASES)) {
    if (!raw.has(canonical) && raw.has(alias)) raw.set(canonical, raw.get(alias) || '');
    raw.delete(alias);
  }

  const normalizedEntries: Array<[string, string]> = [];
  let hasUnknownParams = false;

  for (const [key, rawValue] of raw.entries()) {
    if (TRACKING_PARAMS.has(key) || PRESENTATION_PARAMS.has(key)) continue;
    if (!CATALOG_PARAMS.has(key)) {
      hasUnknownParams = true;
      normalizedEntries.push([key, rawValue.trim()]);
      continue;
    }
    const value = normalizeParamValue(key, rawValue);
    if (value != null) normalizedEntries.push([key, value]);
  }

  normalizedEntries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyOrder = leftKey.localeCompare(rightKey);
    return keyOrder || leftValue.localeCompare(rightValue);
  });

  return {
    params: new URLSearchParams(normalizedEntries),
    hasUnknownParams,
    hadRawParams: raw.size > 0 || [...input.keys()].length > 0,
  };
}

function normalizePath(path: string): string {
  const value = String(path || '').trim();
  if (!value || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

export function evaluateEventsCatalogIndexing(
  input: URL | URLSearchParams | string,
  promotions: readonly EventsCatalogPromotion[] = EVENTS_CATALOG_PROMOTIONS,
): EventsCatalogIndexingDecision {
  const { pathname, params } = parseInput(input);
  if (normalizePath(pathname) !== EVENTS_CATALOG_PATH) {
    throw new Error(`Events catalog indexing only supports ${EVENTS_CATALOG_PATH}`);
  }

  const normalized = normalizeEventsCatalogQuery(params);
  const normalizedQuery = normalized.params.toString();

  if (!normalizedQuery) {
    const duplicate = normalized.hadRawParams;
    return {
      urlClass: duplicate ? 'duplicate' : 'hub',
      normalizedQuery,
      canonicalPath: EVENTS_CATALOG_PATH,
      indexable: true,
      sitemapEligible: !duplicate,
      robots: null,
      redirectPath: null,
    };
  }

  const promotion = promotions.find(
    (item) => item.active && item.signature === normalizedQuery,
  );
  if (promotion) {
    return {
      urlClass: 'promoted',
      normalizedQuery,
      canonicalPath: normalizePath(promotion.destinationPath),
      indexable: false,
      sitemapEligible: false,
      robots: null,
      redirectPath: normalizePath(promotion.destinationPath),
    };
  }

  const keys = [...normalized.params.keys()];
  const paginationOnly = keys.length === 1 && keys[0] === 'page';
  const urlClass: EventsCatalogUrlClass = normalized.hasUnknownParams
    ? 'unknown'
    : paginationOnly
      ? 'pagination'
      : 'facet';

  return {
    urlClass,
    normalizedQuery,
    canonicalPath: `${EVENTS_CATALOG_PATH}?${normalizedQuery}`,
    indexable: false,
    sitemapEligible: false,
    robots: EVENTS_CATALOG_NOINDEX,
    redirectPath: null,
  };
}

export function absoluteEventsCatalogCanonical(path: string, siteUrl: string): string {
  const origin = String(siteUrl || 'https://daibilet.ru').replace(/\/+$/, '');
  return new URL(path, `${origin}/`).toString();
}

/** Mirrors nginx publication rules: internal hints become public only on 200. */
export function publicEventsCatalogSeoHeaders(
  decision: EventsCatalogIndexingDecision,
  status: number,
  siteUrl = 'https://daibilet.ru',
): Record<string, string> {
  if (status !== 200 || decision.redirectPath) return {};
  const headers: Record<string, string> = {
    Link: `<${absoluteEventsCatalogCanonical(decision.canonicalPath, siteUrl)}>; rel="canonical"`,
  };
  if (decision.robots) headers['X-Robots-Tag'] = decision.robots;
  return headers;
}

export function isEventsCatalogSitemapEligibleUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, 'https://daibilet.ru');
    if (normalizePath(url.pathname) !== EVENTS_CATALOG_PATH) return true;
    return evaluateEventsCatalogIndexing(url).sitemapEligible;
  } catch {
    return false;
  }
}
