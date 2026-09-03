/**
 * First-visit city (header). GPS is matched to catalog city centers.
 * Nominatim / soft-geocode.ts stays address → coords for My Day - not reverse-city.
 * Mobile: silent apply on first visit (ADR docs/adr-geo-city-first-visit.md).
 * Desktop: confirm modal when geolocation permission is already granted.
 */

import type { PublicDestinationDto } from '@daibilet/contracts/public';

import { resolveCityMapCoords } from './city-map-coords.ts';
import { haversineMeters, isValidCoordinatePair } from './day-route-score.ts';
import {
  hasCompletedCityPrompt,
  readStoredSelectedCity,
} from './selected-city.ts';

export const OPEN_HEADER_CITY_PICKER_EVENT = 'daibilet:open-header-city-picker';

/** One GPS attempt per browser tab session (overrides stale storage from another city). */
export const GEO_SESSION_ATTEMPT_KEY = 'daibilet:geo-session-attempt';

/** City + inner suburbs. Beyond this we ask without a guess. */
export const MAX_CITY_SUGGEST_METERS = 80_000;

export { hasCompletedCityPrompt, markCityPromptCompleted } from './selected-city.ts';

/**
 * True when the visitor already picked a city (storage) or dismissed the legacy prompt.
 * Does not block session geo - stale Moscow in storage must not win over GPS in SPB.
 */
export function hasExplicitCityChoice(destinations: PublicDestinationDto[]): boolean {
  if (hasCompletedCityPrompt()) return true;
  return Boolean(readStoredSelectedCity(destinations));
}

export function hasGeoSessionAttempt(): boolean {
  try {
    return sessionStorage.getItem(GEO_SESSION_ATTEMPT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGeoSessionAttempt() {
  try {
    sessionStorage.setItem(GEO_SESSION_ATTEMPT_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

/**
 * Catalog indexes wait for session GPS before injecting storage city (city gate).
 * Home uses storage/cookie immediately so rails do not flash «все города» → GPS city.
 */
export function shouldDeferStorageCityForGeo(pathname: string | null | undefined): boolean {
  if (!shouldAttemptSilentGeo(pathname) || hasGeoSessionAttempt()) return false;
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return (
    path === '/events' ||
    path === '/podborki' ||
    path === '/places' ||
    path === '/venues' ||
    path === '/locations'
  );
}

function isBrowsingPath(pathname: string | null | undefined): boolean {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  if (path.startsWith('/admin')) return false;
  if (path.startsWith('/checkout')) return false;
  if (path.startsWith('/login') || path.startsWith('/account')) return false;
  return true;
}

/** First session visit: silent GPS apply on all viewports (incl. /events, /podborki). */
export function shouldAttemptSilentGeo(pathname: string | null | undefined): boolean {
  return isBrowsingPath(pathname);
}

/**
 * Home already paints cookie/storage city in SSR. Applying GPS afterwards
 * swaps rails and looks like a glitch. Catalog indexes still override stale storage.
 */
export function shouldSkipSilentGeoOnHome(
  pathname: string | null | undefined,
  hasDisplayedCity: boolean,
): boolean {
  return isHomePath(pathname) && hasDisplayedCity;
}

/** @deprecated Use shouldAttemptSilentGeo */
export const shouldAttemptMobileSilentGeo = shouldAttemptSilentGeo;

/** Legacy desktop modal - unused after ADR 2026-09-02 (silent geo all viewports). */
export function shouldOfferFirstVisitCityPrompt(pathname: string | null | undefined): boolean {
  return false;
}

export function suggestNearestCity(
  destinations: PublicDestinationDto[],
  latitude: number,
  longitude: number,
  maxMeters = MAX_CITY_SUGGEST_METERS,
): PublicDestinationDto | null {
  if (!isValidCoordinatePair(latitude, longitude)) return null;

  let best: { city: PublicDestinationDto; meters: number } | null = null;
  for (const city of destinations) {
    if (city.type !== 'city') continue;
    const coords = resolveCityMapCoords(city);
    if (!coords) continue;
    const meters = haversineMeters(latitude, longitude, coords.latitude, coords.longitude);
    if (meters > maxMeters) continue;
    if (!best || meters < best.meters) best = { city, meters };
  }
  return best?.city ?? null;
}

/**
 * Request browser position. May show the OS permission prompt unless `grantedOnly`.
 */
export async function readBrowserPosition(options?: {
  grantedOnly?: boolean;
}): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  if (options?.grantedOnly) {
    try {
      const permissions = navigator.permissions;
      if (!permissions?.query) return null;
      const status = await permissions.query({ name: 'geolocation' });
      if (status.state !== 'granted') return null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), options?.grantedOnly ? 3500 : 8000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isValidCoordinatePair(latitude, longitude)) {
          resolve(null);
          return;
        }
        resolve({ latitude, longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: options?.grantedOnly ? 3000 : 7000,
      },
    );
  });
}

/**
 * Soft GPS: only if the browser already granted geolocation.
 * Never call getCurrentPosition while permission is `prompt` - that would surprise-ask.
 */
export async function readGrantedBrowserPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return readBrowserPosition({ grantedOnly: true });
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 1023px)').matches;
}

export function isHomePath(pathname: string | null | undefined): boolean {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return path === '/';
}

export function dispatchOpenHeaderCityPicker() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_HEADER_CITY_PICKER_EVENT));
}
