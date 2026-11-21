import type { PublicSessionDto } from '@daibilet/contracts/public';

const FAVORITES_STORAGE_KEY = 'daibilet:favorites';
const FAVORITE_EVENTS_STORAGE_KEY = 'daibilet:favorite-events:v1';
export const FAVORITES_CHANGED_EVENT = 'daibilet:favorites-changed';

export type FavoriteEventItem = {
  id: string;
  groupKey?: string;
  title: string;
  city?: string;
  imageUrl?: string;
  priceFrom?: number;
  href: string;
};

function normalizeFavoriteEventItem(value: unknown): FavoriteEventItem | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<FavoriteEventItem>;
  const id = String(input.id || '').trim();
  const title = String(input.title || '').trim();
  const href = String(input.href || '').trim();
  if (!id || !title || !href.startsWith('/events/')) return null;
  return {
    id,
    groupKey: String(input.groupKey || '').trim() || undefined,
    title,
    city: String(input.city || '').trim() || undefined,
    imageUrl: String(input.imageUrl || '').trim() || undefined,
    priceFrom:
      typeof input.priceFrom === 'number' && Number.isFinite(input.priceFrom)
        ? input.priceFrom
        : undefined,
    href,
  };
}

export function readFavoriteEvents(): FavoriteEventItem[] {
  try {
    const raw = localStorage.getItem(FAVORITE_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeFavoriteEventItem)
      .filter((item): item is FavoriteEventItem => Boolean(item))
      .slice(0, 50);
  } catch {
    return [];
  }
}

function writeFavoriteEvents(items: FavoriteEventItem[]) {
  try {
    localStorage.setItem(FAVORITE_EVENTS_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
}

export function rememberFavoriteEvent(item: FavoriteEventItem) {
  const normalized = normalizeFavoriteEventItem(item);
  if (!normalized) return;
  const current = readFavoriteEvents();
  const next = [normalized, ...current.filter((entry) => entry.id !== normalized.id)];
  writeFavoriteEvents(next);
}

function forgetFavoriteEvent(id: string) {
  const next = readFavoriteEvents().filter((item) => item.id !== id);
  writeFavoriteEvents(next);
}

export function readFavoriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0));
  } catch {
    return new Set();
  }
}

export function writeFavoriteIds(ids: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...ids]));
    notifyFavoritesChanged();
  } catch {
    // ignore storage errors
  }
}

export function notifyFavoritesChanged() {
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function toggleFavoriteId(id: string): Set<string> {
  const next = readFavoriteIds();
  if (next.has(id)) {
    next.delete(id);
    forgetFavoriteEvent(id);
  } else {
    next.add(id);
  }
  writeFavoriteIds(next);
  return next;
}

export function toggleFavoriteEvent(item: FavoriteEventItem): Set<string> {
  const next = readFavoriteIds();
  if (next.has(item.id)) {
    next.delete(item.id);
    forgetFavoriteEvent(item.id);
  } else {
    next.add(item.id);
    rememberFavoriteEvent(item);
  }
  writeFavoriteIds(next);
  return next;
}

export function resolveFavoriteSessions(ids: Set<string>, sessions: PublicSessionDto[]): PublicSessionDto[] {
  const byKey = new Map<string, PublicSessionDto>();
  for (const session of sessions) {
    byKey.set(session.id, session);
    if (session.groupKey) byKey.set(session.groupKey, session);
  }

  const result: PublicSessionDto[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const session = byKey.get(id);
    if (!session) continue;
    const dedupeKey = session.groupKey || session.id;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(session);
  }
  return result;
}
