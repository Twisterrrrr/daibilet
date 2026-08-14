import type { PublicVenue } from '@/types';

const INSTITUTION_CACHE_KEY = 'daibilet:venues-catalog:institution';
const LOCATION_CACHE_KEY = 'daibilet:venues-catalog:location';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedVenuesCatalog = {
  savedAt: string;
  venues: PublicVenue[];
};

function readCache(key: string): PublicVenue[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedVenuesCatalog;
    if (!Array.isArray(parsed?.venues)) return null;
    if (Date.now() - Date.parse(parsed.savedAt || '') > CACHE_TTL_MS) return null;
    return parsed.venues;
  } catch {
    return null;
  }
}

function writeCache(key: string, venues: PublicVenue[]): void {
  try {
    const entry: CachedVenuesCatalog = {
      savedAt: new Date().toISOString(),
      venues,
    };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}

export function readCachedInstitutionVenues(): PublicVenue[] | null {
  return readCache(INSTITUTION_CACHE_KEY);
}

export function writeCachedInstitutionVenues(venues: PublicVenue[]): void {
  writeCache(INSTITUTION_CACHE_KEY, venues);
}

export function readCachedLocationVenues(): PublicVenue[] | null {
  return readCache(LOCATION_CACHE_KEY);
}

export function writeCachedLocationVenues(venues: PublicVenue[]): void {
  writeCache(LOCATION_CACHE_KEY, venues);
}
