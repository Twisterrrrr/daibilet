import type { PublicEventPage } from '@/types';

const EVENT_PAGE_CACHE_PREFIX = 'daibilet:event-page:';
const EVENT_PAGE_CACHE_TTL_MS = 15 * 60 * 1000;

type CachedEventPage = {
  savedAt: number;
  payload: PublicEventPage;
};

export function readCachedEventPage(slug: string): PublicEventPage | null {
  try {
    const raw = window.sessionStorage.getItem(`${EVENT_PAGE_CACHE_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEventPage;
    if (!parsed?.payload?.event) return null;
    if (Date.now() - parsed.savedAt > EVENT_PAGE_CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeCachedEventPage(slug: string, payload: PublicEventPage) {
  try {
    const entry: CachedEventPage = { savedAt: Date.now(), payload };
    window.sessionStorage.setItem(`${EVENT_PAGE_CACHE_PREFIX}${slug}`, JSON.stringify(entry));
  } catch {
    // sessionStorage quota or private mode — ignore
  }
}
