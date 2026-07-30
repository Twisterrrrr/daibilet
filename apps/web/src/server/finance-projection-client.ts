/**
 * Server-only HTTP client for finance public projection APIs (CF.P1b).
 * Fail-soft: missing env / timeout / non-OK → empty list. Never throws to callers.
 */

import {
  mapAdmissionListPayload,
  mapAdmissionProduct,
  resolveCityAdmissionMinPublished,
  shouldShowCityAdmissionBlock,
  type FinanceAdmissionListResult,
  type FinanceAdmissionProduct,
} from '@/lib/finance-projection';

export const FINANCE_PROJECTION_TIMEOUT_MS = 3000;

export type FinanceProjectionEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function resolveFinanceApiBaseUrl(env: FinanceProjectionEnv = process.env): string | null {
  const raw = (env.FINANCE_API_BASE_URL || env.DAIBILET_FINANCE_API_BASE_URL || '').trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function resolveFinanceApiHost(env: FinanceProjectionEnv = process.env): string | null {
  const raw = (env.FINANCE_API_HOST || env.DAIBILET_FINANCE_API_HOST || '').trim();
  return raw || null;
}

export function resolveFinanceProjectionToken(env: FinanceProjectionEnv = process.env): string | null {
  const raw = (
    env.DAIBILET_FINANCE_PROJECTION_TOKEN ||
    env.FINANCE_PROJECTION_TOKEN ||
    ''
  ).trim();
  return raw || null;
}

function buildHeaders(env: FinanceProjectionEnv): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  const host = resolveFinanceApiHost(env);
  if (host) headers.set('Host', host);
  const token = resolveFinanceProjectionToken(env);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function financeFetchJson(
  apiPath: string,
  env: FinanceProjectionEnv = process.env,
): Promise<unknown | null> {
  const base = resolveFinanceApiBaseUrl(env);
  if (!base) return null;

  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const url = `${base}${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(env),
      signal: AbortSignal.timeout(FINANCE_PROJECTION_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

const EMPTY_LIST: FinanceAdmissionListResult = {
  items: [],
  summary: { published: 0, canSell: 0 },
  total: 0,
};

export async function fetchVenueAdmissionProducts(
  venueSlug: string,
  env: FinanceProjectionEnv = process.env,
): Promise<FinanceAdmissionListResult> {
  const slug = venueSlug.trim();
  if (!slug) return EMPTY_LIST;

  const raw = await financeFetchJson(
    `/api/public/venues/${encodeURIComponent(slug)}/admission-products`,
    env,
  );
  if (!raw) return EMPTY_LIST;
  return mapAdmissionListPayload(raw);
}

export async function fetchCityAdmissionProducts(
  citySlug: string,
  env: FinanceProjectionEnv = process.env,
): Promise<FinanceAdmissionListResult> {
  const slug = citySlug.trim();
  if (!slug) return EMPTY_LIST;

  const qs = new URLSearchParams({ citySlug: slug, limit: '24' });
  const raw = await financeFetchJson(`/api/public/admission-products?${qs.toString()}`, env);
  if (!raw) return EMPTY_LIST;
  return mapAdmissionListPayload(raw);
}

export async function fetchAdmissionProductBySlug(
  productSlug: string,
  env: FinanceProjectionEnv = process.env,
): Promise<FinanceAdmissionProduct | null> {
  const slug = productSlug.trim();
  if (!slug) return null;
  const raw = await financeFetchJson(
    `/api/public/admission-products/${encodeURIComponent(slug)}`,
    env,
  );
  if (!raw) return null;
  if (raw && typeof raw === 'object' && raw !== null && 'item' in raw) {
    return mapAdmissionProduct((raw as { item: unknown }).item);
  }
  return mapAdmissionProduct(raw);
}

/** Soft helper for city hub: returns products only when published count meets threshold. */
export async function loadCityAdmissionBlock(
  citySlug: string,
  env: FinanceProjectionEnv = process.env,
): Promise<FinanceAdmissionListResult | null> {
  const list = await fetchCityAdmissionProducts(citySlug, env);
  const min = resolveCityAdmissionMinPublished(env);
  const published = Math.max(list.summary.published, list.items.length);
  if (!shouldShowCityAdmissionBlock({ published }, min)) return null;
  return list;
}
