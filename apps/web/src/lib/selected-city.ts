import type { PublicDestinationDto } from '@daibilet/contracts/public';

export const SELECTED_CITY_STORAGE_KEY = 'daibilet:selected-city';

export function matchDestination(destinations: PublicDestinationDto[], value?: string | null): PublicDestinationDto | null {
  const needle = String(value || '').trim();
  if (!needle || needle === 'all') return null;
  return destinations.find(
    (item) => item.name.toLowerCase() === needle.toLowerCase() || item.slug === needle,
  ) || null;
}

export function resolveCityLabel(destinations: PublicDestinationDto[], urlCity?: string | null): string {
  const fromUrl = matchDestination(destinations, urlCity);
  if (fromUrl) return fromUrl.name;

  if (typeof window === 'undefined') return 'Все города';

  try {
    const stored = localStorage.getItem(SELECTED_CITY_STORAGE_KEY)?.trim();
    const fromStorage = matchDestination(destinations, stored);
    if (fromStorage) return fromStorage.name;
  } catch {
    // ignore storage errors
  }

  return 'Все города';
}

export function persistSelectedCity(name: string) {
  try {
    if (name === 'all') localStorage.removeItem(SELECTED_CITY_STORAGE_KEY);
    else localStorage.setItem(SELECTED_CITY_STORAGE_KEY, name);
  } catch {
    // ignore storage errors
  }
}
