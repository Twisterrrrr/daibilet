export const PLACE_FAVORITES_STORAGE_KEY = 'daibilet:place-favorites';
export const PLACE_FAVORITES_CHANGED_EVENT = 'daibilet:place-favorites-changed';

export type PlaceFavoriteItem = {
  id: string;
  slug?: string | null;
  name: string;
  href: string;
  imageUrl?: string | null;
  city?: string | null;
};

function isPlaceFavoriteItem(value: unknown): value is PlaceFavoriteItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as PlaceFavoriteItem;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    typeof item.href === 'string' &&
    item.href.length > 0
  );
}

export function readPlaceFavorites(): PlaceFavoriteItem[] {
  try {
    const raw = localStorage.getItem(PLACE_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const items: PlaceFavoriteItem[] = [];
    for (const entry of parsed) {
      if (!isPlaceFavoriteItem(entry) || seen.has(entry.id)) continue;
      seen.add(entry.id);
      items.push({
        id: entry.id,
        slug: entry.slug || null,
        name: entry.name,
        href: entry.href,
        imageUrl: entry.imageUrl || null,
        city: entry.city || null,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export function writePlaceFavorites(items: PlaceFavoriteItem[]) {
  try {
    localStorage.setItem(PLACE_FAVORITES_STORAGE_KEY, JSON.stringify(items));
    notifyPlaceFavoritesChanged();
  } catch {
    // ignore storage errors
  }
}

export function notifyPlaceFavoritesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PLACE_FAVORITES_CHANGED_EVENT));
}

export function isPlaceFavorite(id: string): boolean {
  const key = String(id || '').trim();
  if (!key) return false;
  return readPlaceFavorites().some((item) => item.id === key);
}

export function togglePlaceFavorite(item: PlaceFavoriteItem): PlaceFavoriteItem[] {
  const key = String(item.id || '').trim();
  if (!key) return readPlaceFavorites();
  const current = readPlaceFavorites();
  const next = current.filter((entry) => entry.id !== key);
  if (next.length === current.length) {
    next.unshift({
      id: key,
      slug: item.slug || null,
      name: item.name,
      href: item.href,
      imageUrl: item.imageUrl || null,
      city: item.city || null,
    });
  }
  writePlaceFavorites(next);
  return next;
}
