import type { PublicSession } from '@/types';

const FAVORITES_STORAGE_KEY = 'daibilet:favorites';
export const FAVORITES_CHANGED_EVENT = 'daibilet:favorites-changed';

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
  if (next.has(id)) next.delete(id);
  else next.add(id);
  writeFavoriteIds(next);
  return next;
}

export function resolveFavoriteSessions(ids: Set<string>, sessions: PublicSession[]): PublicSession[] {
  const byKey = new Map<string, PublicSession>();
  for (const session of sessions) {
    byKey.set(session.id, session);
    if (session.groupKey) byKey.set(session.groupKey, session);
  }

  const result: PublicSession[] = [];
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
