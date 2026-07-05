import type { PublicLandingPage } from '@/types';

const CACHE_PREFIX = 'daibilet:landing-page:';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedLandingPage = {
  savedAt: string;
  payload: PublicLandingPage;
};

function cacheKey(slug: string, citySlug?: string | null): string {
  const landing = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  const city = String(citySlug || 'all')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  return `${CACHE_PREFIX}${landing}:${city}`;
}

export function readCachedLandingPage(slug: string, citySlug?: string | null): PublicLandingPage | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(slug, citySlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLandingPage;
    if (!parsed?.payload?.landing) return null;
    if (Date.now() - Date.parse(parsed.savedAt || '') > CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeCachedLandingPage(slug: string, payload: PublicLandingPage, citySlug?: string | null): void {
  try {
    const entry: CachedLandingPage = {
      savedAt: new Date().toISOString(),
      payload,
    };
    window.localStorage.setItem(cacheKey(slug, citySlug), JSON.stringify(entry));
  } catch {
    // Private browsing or quota exceeded — ignore.
  }
}
