import type { PublicDestinationDto } from '@daibilet/contracts/public';

export const SELECTED_CITY_STORAGE_KEY = 'daibilet:selected-city';

/** Paths whose `?city=` syncs with the header city picker. */
export const CITY_FILTER_PATHS = ['/events', '/venues', '/locations'] as const;

export function isCityFilterPath(pathname: string | null | undefined): boolean {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return (CITY_FILTER_PATHS as readonly string[]).some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}

export function matchDestination(destinations: PublicDestinationDto[], value?: string | null): PublicDestinationDto | null {
  const needle = String(value || '').trim();
  if (!needle || needle === 'all') return null;
  return destinations.find(
    (item) => item.name.toLowerCase() === needle.toLowerCase() || item.slug === needle,
  ) || null;
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

export function resolveCityLabel(destinations: PublicDestinationDto[], urlCity?: string | null): string {
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
 * If a city-filter page has no explicit `city` query, inject the stored header city.
 * Preserves deep-links that already set `city`.
 */
export function mergeStoredCityIntoSearchParams(
  destinations: PublicDestinationDto[],
  searchParams: URLSearchParams,
): URLSearchParams | null {
  const explicit = searchParams.get('city')?.trim();
  if (explicit) return null;

  const stored = readStoredSelectedCity(destinations);
  if (!stored) return null;

  const next = new URLSearchParams(searchParams.toString());
  next.set('city', stored);
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
