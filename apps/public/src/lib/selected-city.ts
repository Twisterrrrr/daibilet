import { publicData } from '@/data';

export const SELECTED_CITY_STORAGE_KEY = 'daibilet:selected-city';

export function resolveStoredDestination(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('city')?.trim();
  if (fromUrl) {
    const match = publicData.destinations.find(
      (item) => item.name.toLowerCase() === fromUrl.toLowerCase() || item.slug === fromUrl,
    );
    if (match) return match.name;
  }

  try {
    const stored = localStorage.getItem(SELECTED_CITY_STORAGE_KEY)?.trim();
    if (stored) {
      const match = publicData.destinations.find((item) => item.name === stored || item.slug === stored);
      if (match) return match.name;
    }
  } catch {
    // ignore storage errors
  }

  return 'all';
}

export function persistDestination(destination: string) {
  const params = new URLSearchParams(window.location.search);

  try {
    if (destination === 'all') localStorage.removeItem(SELECTED_CITY_STORAGE_KEY);
    else localStorage.setItem(SELECTED_CITY_STORAGE_KEY, destination);
  } catch {
    // ignore storage errors
  }

  if (destination === 'all') params.delete('city');
  else params.set('city', destination);

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, '', nextUrl);
}
