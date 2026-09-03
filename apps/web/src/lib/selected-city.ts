import type { PublicDestinationDto } from '@daibilet/contracts/public';

import { resolveLandingCityName } from './landing-city.ts';

export const SELECTED_CITY_STORAGE_KEY = 'daibilet:selected-city';
/** Cookie mirror of storage so home SSR can paint the last city without a client swap. */
export const SELECTED_CITY_COOKIE = 'daibilet-city';
/** Set after first-visit confirm, picker choice, or «Позже» - do not nag again. */
export const CITY_PROMPT_STORAGE_KEY = 'daibilet:city-prompted';

/** Paths whose `?city=` syncs with the header city picker. */
export const CITY_FILTER_PATHS = ['/events', '/venues', '/locations', '/places', '/podborki'] as const;

export function isCityFilterPath(pathname: string | null | undefined): boolean {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return (CITY_FILTER_PATHS as readonly string[]).some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}

/** `/my-day?city=` must drive header city (empty Lovable step card) - not a catalog filter path. */
export function isMyDayPath(pathname: string | null | undefined): boolean {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return path === '/my-day';
}

/** Surfaces that read explicit `?city=` into SelectedCityProvider. */
export function readsCityQueryParam(pathname: string | null | undefined): boolean {
  return isCityFilterPath(pathname) || isMyDayPath(pathname);
}

function destinationMatchKeys(item: PublicDestinationDto): string[] {
  return [item.name, item.slug, item.sourceSlug]
    .map((key) => String(key || '').trim())
    .filter(Boolean);
}

export function matchDestination(destinations: PublicDestinationDto[], value?: string | null): PublicDestinationDto | null {
  const needle = String(value || '').trim();
  if (!needle || needle === 'all') return null;
  const lower = needle.toLowerCase();
  const exact = destinations.find((item) =>
    destinationMatchKeys(item).some((key) => key.toLowerCase() === lower),
  );
  if (exact) return exact;

  const canonName = resolveLandingCityName(needle);
  if (canonName) {
    return destinations.find((item) => item.name === canonName) || null;
  }
  return null;
}

/** Selected destination for an explicit `/cities/[slug]` hub route. */
export function resolveCityHubDestination(
  destinations: PublicDestinationDto[],
  pathname: string | null | undefined,
): PublicDestinationDto | null {
  const match = String(pathname || '').match(/^\/cities\/([^/?#]+)\/?$/);
  return match ? matchDestination(destinations, decodeURIComponent(match[1])) : null;
}

export function readStoredSelectedCity(destinations: PublicDestinationDto[]): string | null {
  try {
    const stored = localStorage.getItem(SELECTED_CITY_STORAGE_KEY)?.trim();
    const fromStorage = matchDestination(destinations, stored);
    return fromStorage?.name || null;
  } catch {
    return null;
  }
}

/** Explicit `?city=all` («Все города»). Empty/missing is not the same - storage may still inject. */
export function isAllCitiesQuery(city?: string | null): boolean {
  return String(city || '').trim().toLowerCase() === 'all';
}

export function resolveCityLabel(destinations: PublicDestinationDto[], urlCity?: string | null): string {
  const raw = String(urlCity || '').trim();
  if (raw.toLowerCase() === 'all') return 'Все города';

  const fromUrl = matchDestination(destinations, urlCity);
  if (fromUrl) return fromUrl.name;

  // SEO slug (saint-petersburg) vs DB translit (sankt-peterburg) must not
  // fall through to the previous city in localStorage.
  const fromSlugMap = resolveLandingCityName(raw);
  if (fromSlugMap) return fromSlugMap;

  return readStoredSelectedCity(destinations) || 'Все города';
}

export function markCityPromptCompleted() {
  try {
    localStorage.setItem(CITY_PROMPT_STORAGE_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export function hasCompletedCityPrompt(): boolean {
  try {
    return localStorage.getItem(CITY_PROMPT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistSelectedCity(name: string) {
  try {
    if (name === 'all') localStorage.removeItem(SELECTED_CITY_STORAGE_KEY);
    else localStorage.setItem(SELECTED_CITY_STORAGE_KEY, name);
    writeSelectedCityCookie(name);
    markCityPromptCompleted();
  } catch {
    // ignore storage errors
  }
}

export function decodeSelectedCityCookie(raw?: string | null): string | null {
  const value = String(raw || '').trim();
  if (!value || value.toLowerCase() === 'all') return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value;
  }
}

function writeSelectedCityCookie(name: string) {
  if (typeof document === 'undefined') return;
  if (name === 'all') {
    document.cookie = `${SELECTED_CITY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${SELECTED_CITY_COOKIE}=${encodeURIComponent(name)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/**
 * Prefer ASCII destination slug in `?city=` so soft-nav / useSearchParams stay stable.
 * Cyrillic display names (Пермь) were aborting catalog refetches and leaving skeletons forever.
 */
export function catalogCityQueryValue(
  destinations: PublicDestinationDto[],
  cityNameOrSlug: string,
): string {
  const needle = String(cityNameOrSlug || '').trim();
  if (!needle || needle === 'all') return needle;
  const matched = matchDestination(destinations, needle);
  return matched?.slug?.trim() || matched?.sourceSlug?.trim() || matched?.name || needle;
}

/**
 * If a city-filter page has no explicit `city` query, inject the stored header city.
 * Preserves deep-links that already set `city`.
 * `city=all` is an explicit «Все города» choice - never overwrite it with storage.
 */
export function mergeStoredCityIntoSearchParams(
  destinations: PublicDestinationDto[],
  searchParams: URLSearchParams,
): URLSearchParams | null {
  const explicit = searchParams.get('city')?.trim();
  // Any explicit token (including `all`) blocks storage inject.
  if (explicit) return null;

  const stored = readStoredSelectedCity(destinations);
  if (!stored) return null;

  const next = new URLSearchParams(searchParams.toString());
  next.set('city', catalogCityQueryValue(destinations, stored));
  return next;
}

/** @deprecated Use mergeStoredCityIntoSearchParams */
export const mergeStoredCityIntoEventsParams = mergeStoredCityIntoSearchParams;

/** Build `path?city=` (and optional extra params) using header city when none is explicit. */
export function pathHrefWithSelectedCity(
  path: string,
  cityValue: string | null | undefined,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const city = params.get('city') || (cityValue && cityValue !== 'all' ? cityValue : undefined);
  if (city) params.set('city', city);
  else params.delete('city');
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * City token for catalog API fetch.
 * Explicit `?city=` deep-links win over header (slug-normalized for stable fetch).
 */
export function resolveCatalogFetchCity(input: {
  urlCity?: string | null;
  urlCityAll?: boolean;
  cityReady: boolean;
  headerCityValue?: string | null;
  destinations: PublicDestinationDto[];
}): string | undefined {
  const url = String(input.urlCity || '').trim();
  if (url && url.toLowerCase() !== 'all') {
    return catalogCityQueryValue(input.destinations, url);
  }
  if (input.urlCityAll) return undefined;
  if (!input.cityReady) return undefined;
  const header = String(input.headerCityValue || '').trim();
  if (!header || header === 'all') return undefined;
  return catalogCityQueryValue(input.destinations, header);
}

/** Resolve `?city=` (title or slug) against catalog option titles. */
export function resolveCatalogCityFilter(
  urlCity: string,
  cityOptions: Array<[string, number]>,
  resolvedLabel?: string | null,
): string {
  const needle = urlCity.trim();
  if (!needle || needle === 'all') return 'all';
  const fromOptions = cityOptions.find(([name]) => name.toLowerCase() === needle.toLowerCase());
  if (fromOptions) return fromOptions[0];

  // Map saint-petersburg / sankt-peterburg → «Санкт-Петербург» before the
  // stale header label (previous city) can win the native <select>.
  const fromSlug = resolveLandingCityName(needle);
  if (fromSlug) {
    const bySlugName = cityOptions.find(([name]) => name === fromSlug);
    if (bySlugName) return bySlugName[0];
    return fromSlug;
  }

  const label = String(resolvedLabel || '').trim();
  if (label && label !== 'Все города') {
    const byLabel = cityOptions.find(([name]) => name === label);
    if (byLabel) return byLabel[0];
    return label;
  }
  return needle;
}

/**
 * In-page catalog city follows the header picker once it is resolved.
 * URL `?city=` is only a bootstrap source (before cityReady) - same contract as `/events`.
 * Blog stays independent: `/blog` is not a city-filter path.
 */
export function resolveSectionCityFilter(input: {
  cityReady: boolean;
  headerCityValue?: string | null;
  headerCityLabel?: string | null;
  urlCity?: string | null;
  urlCityAll?: boolean;
  cityOptions: Array<[string, number]>;
}): string {
  const headerValue = String(input.headerCityValue || '').trim();
  if (input.cityReady && headerValue) {
    if (headerValue === 'all') return 'all';
    return resolveCatalogCityFilter(headerValue, input.cityOptions, input.headerCityLabel);
  }
  if (input.urlCityAll) return 'all';
  const urlCity = String(input.urlCity || '').trim();
  if (urlCity) return resolveCatalogCityFilter(urlCity, input.cityOptions, input.headerCityLabel);
  return 'all';
}

/** Native `<select>` cannot display a value that is missing from options. */
export function ensureCityInOptions(
  options: Array<[string, number]>,
  cityName?: string | null,
): Array<[string, number]> {
  const name = String(cityName || '').trim();
  if (!name || name === 'all' || name === 'Все города') return options;
  if (options.some(([city]) => city === name)) return options;
  return [[name, 0], ...options];
}
