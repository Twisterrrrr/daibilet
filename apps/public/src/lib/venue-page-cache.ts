import type { PublicVenuePage } from '@/types';

const CACHE_PREFIX = 'daibilet:venue-page:v2:';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedVenuePage = {
  savedAt: string;
  payload: PublicVenuePage;
};

function normalizeSlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

export function readCachedVenuePage(slug: string): PublicVenuePage | null {
  for (const key of venueSlugCacheKeys(slug)) {
    try {
      const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as CachedVenuePage;
      if (!parsed?.payload?.venue) continue;
      if (Date.now() - Date.parse(parsed.savedAt || '') > CACHE_TTL_MS) continue;
      return parsed.payload;
    } catch {
      // try next key
    }
  }
  return null;
}

export function buildVenuePageShell(slug: string): PublicVenuePage | null {
  const title = humanizeVenueSlug(slug);
  if (!title) return null;

  return {
    generatedAt: new Date().toISOString(),
    venue: {
      id: extractVenueIdFromSlug(slug) || '',
      slug,
      name: title,
      title,
      city: '',
      address: null,
      type: 'OTHER',
      template: 'location',
      pageStatus: 'candidate',
      events: 0,
      categories: {},
    },
    sessions: [],
    relatedVenues: [],
    stats: {
      events: 0,
      categories: 0,
      priceFrom: null,
    },
  };
}

export function consumeVenuePagePrefetch(slug: string): Promise<PublicVenuePage | null> | null {
  const globalWindow = window as Window & {
    __DAIBILET_VENUE_PREFETCH__?: { slug: string; promise: Promise<PublicVenuePage | null> };
  };
  const entry = globalWindow.__DAIBILET_VENUE_PREFETCH__;
  if (!entry) return null;
  if (normalizeSlug(entry.slug) !== normalizeSlug(slug)) return null;
  delete globalWindow.__DAIBILET_VENUE_PREFETCH__;
  return entry.promise;
}

function venueSlugCacheKeys(slug: string): string[] {
  const keys = new Set<string>();
  keys.add(normalizeSlug(slug));
  const venueId = extractVenueIdFromSlug(slug);
  if (venueId) {
    keys.add(normalizeSlug(venueId));
  }
  return [...keys];
}

function extractVenueIdFromSlug(slug: string): string | null {
  const match = String(slug || '').match(/(?:^|-)([a-f0-9]{20,})$/i);
  if (!match) return null;
  const suffix = match[1];
  return suffix.startsWith('venue_') ? suffix : `venue_${suffix}`;
}

function humanizeVenueSlug(slug: string): string | null {
  const trimmed = String(slug || '').trim();
  if (!trimmed) return null;
  const withoutCoords = trimmed.replace(/-[a-f0-9]{20,}$/i, '').replace(/-\d+(?:\.\d+)?-\d+(?:\.\d+)?$/i, '');
  const text = withoutCoords.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return trimmed;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function writeCachedVenuePage(slug: string, payload: PublicVenuePage): void {
  try {
    const entry: CachedVenuePage = {
      savedAt: new Date().toISOString(),
      payload,
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${normalizeSlug(slug)}`, JSON.stringify(entry));
  } catch {
    // Private browsing or quota exceeded — ignore.
  }
}
