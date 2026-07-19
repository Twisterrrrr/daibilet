import type { PublicDestinationDto } from '@daibilet/contracts/public';

export const SELECTED_CITY_STORAGE_KEY = 'daibilet:selected-city';

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
 * If `/events` has no explicit `city` query, inject the stored header city.
 * Preserves deep-links that already set `city`.
 */
export function mergeStoredCityIntoEventsParams(
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
