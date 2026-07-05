import { publicData } from '@/data';
import type { PublicCity, PublicCityPage, PublicDestination } from '@/types';

const CACHE_PREFIX = 'daibilet:city-page:';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedCityPage = {
  savedAt: string;
  payload: PublicCityPage;
};

function normalizeSlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function destinationMatchesSlug(destination: PublicDestination, slug: string): boolean {
  const key = normalizeSlug(slug);
  return [destination.slug, destination.sourceSlug, destination.name]
    .filter(Boolean)
    .some((candidate) => normalizeSlug(String(candidate)) === key);
}

export function findDestinationBySlug(slug: string): PublicDestination | null {
  const key = normalizeSlug(slug);
  return (
    publicData.destinations.find(
      (destination) =>
        destinationMatchesSlug(destination, key) ||
        normalizeSlug(destination.name) === key,
    ) || null
  );
}

export function buildCityPageShell(slug: string): PublicCityPage | null {
  const destination = findDestinationBySlug(slug);
  if (!destination) return null;

  const categories = Object.fromEntries(
    (destination.categories || []).map((item) => [item.name, item.events]),
  );

  const city: PublicCity = {
    id: destination.id || `city_${normalizeSlug(destination.name)}`,
    slug: destination.slug || normalizeSlug(destination.name),
    sourceSlug: destination.sourceSlug || destination.slug || null,
    name: destination.name,
    title: destination.name,
    type: destination.type === 'region' ? 'region' : 'city',
    isDestination: true,
    events: destination.events,
    venues: destination.venues,
    categories,
  };

  return {
    generatedAt: new Date().toISOString(),
    city,
    sessions: [],
    venues: [],
    landings: [],
    stats: {
      events: destination.events,
      venues: destination.venues,
      categories: Object.keys(categories).length,
      priceFrom: null,
    },
  };
}

export function readCachedCityPage(slug: string): PublicCityPage | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${normalizeSlug(slug)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCityPage;
    if (!parsed?.payload?.city) return null;
    if (Date.now() - Date.parse(parsed.savedAt || '') > CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeCachedCityPage(slug: string, payload: PublicCityPage): void {
  try {
    const entry: CachedCityPage = {
      savedAt: new Date().toISOString(),
      payload,
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${normalizeSlug(slug)}`, JSON.stringify(entry));
  } catch {
    // Private browsing or quota exceeded — ignore.
  }
}

const CITY_VENUES_CACHE_PREFIX = 'daibilet:city-venues:';
const CITY_VENUES_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedCityVenues = {
  savedAt: string;
  venues: PublicCityPage['venues'];
};

export function readCachedCityVenues(slug: string): PublicCityPage['venues'] | null {
  try {
    const raw = window.localStorage.getItem(`${CITY_VENUES_CACHE_PREFIX}${normalizeSlug(slug)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCityVenues;
    if (!Array.isArray(parsed?.venues)) return null;
    if (Date.now() - Date.parse(parsed.savedAt || '') > CITY_VENUES_CACHE_TTL_MS) return null;
    return parsed.venues;
  } catch {
    return null;
  }
}

export function writeCachedCityVenues(slug: string, venues: PublicCityPage['venues']): void {
  try {
    const entry: CachedCityVenues = {
      savedAt: new Date().toISOString(),
      venues,
    };
    window.localStorage.setItem(`${CITY_VENUES_CACHE_PREFIX}${normalizeSlug(slug)}`, JSON.stringify(entry));
  } catch {
    // ignore
  }
}
