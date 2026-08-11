import type { PublicDestinationDto } from '@daibilet/contracts/public';

export const SELECTED_CITY_STORAGE_KEY = 'daibilet:selected-city';

/** Paths whose `?city=` syncs with the header city picker. */
export const CITY_FILTER_PATHS = ['/events', '/venues', '/locations', '/podborki'] as const;

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

export function matchDestination(destinations: PublicDestinationDto[], value?: string | null): PublicDestinationDto | null {
  const needle = String(value || '').trim();
  if (!needle || needle === 'all') return null;
  return destinations.find(
    (item) =>
      item.name.toLowerCase() === needle.toLowerCase() ||
      item.slug === needle ||
      item.sourceSlug === needle,
  ) || null;
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

  return readStoredSelectedCity(destinations) || 'Все города';
}

export function persistSelectedCity(name: string) {
  try {
    if (name === 'all') localStorage.removeItem(SELECTED_CITY_STORAGE_KEY);
    else localStorage.setItem(SELECTED_CITY_STORAGE_KEY, name);
  } catch {
    // ignore storage errors
  }
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
  const label = String(resolvedLabel || '').trim();
  if (label && label !== 'Все города') {
    const byLabel = cityOptions.find(([name]) => name === label);
    if (byLabel) return byLabel[0];
    return label;
  }
  return needle;
}
