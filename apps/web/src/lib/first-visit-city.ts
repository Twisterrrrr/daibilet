/**
 * First-visit city confirm (header). GPS is matched to catalog city centers.
 * Nominatim / soft-geocode.ts stays address → coords for My Day - not reverse-city.
 * Never silent-apply: UI must confirm via CityConfirmModal.
 */

import type { PublicDestinationDto } from '@daibilet/contracts/public';

import { resolveCityMapCoords } from './city-map-coords.ts';
import { haversineMeters, isValidCoordinatePair } from './day-route-score.ts';
import {
  hasCompletedCityPrompt,
  readStoredSelectedCity,
} from './selected-city.ts';

export const OPEN_HEADER_CITY_PICKER_EVENT = 'daibilet:open-header-city-picker';

/** City + inner suburbs. Beyond this we ask without a guess. */
export const MAX_CITY_SUGGEST_METERS = 80_000;

/** Pin-only header chip when the flex slot cannot fit ~2 letters of the name. */
export const HEADER_CITY_ICON_ONLY_MAX_PX = 92;

export { hasCompletedCityPrompt, markCityPromptCompleted } from './selected-city.ts';

/**
 * True when the visitor already has a city (storage) or already answered the prompt.
 * `city=all` clears the city key but keeps the prompted flag so we do not nag again.
 */
export function hasExplicitCityChoice(destinations: PublicDestinationDto[]): boolean {
  if (hasCompletedCityPrompt()) return true;
  return Boolean(readStoredSelectedCity(destinations));
}

/** Skip surfaces that already gate city (/events, /podborki) or are not browsing. */
export function shouldOfferFirstVisitCityPrompt(pathname: string | null | undefined): boolean {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  if (path.startsWith('/admin')) return false;
  if (path.startsWith('/checkout')) return false;
  if (path.startsWith('/login') || path.startsWith('/account')) return false;
  if (path === '/events' || path.startsWith('/events/')) return false;
  if (path === '/podborki' || path.startsWith('/podborki/')) return false;
  return true;
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
 * Soft GPS: only if the browser already granted geolocation.
 * Never call getCurrentPosition while permission is `prompt` - that would surprise-ask.
 */
export async function readGrantedBrowserPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  try {
    const permissions = navigator.permissions;
    if (!permissions?.query) return null;
    const status = await permissions.query({ name: 'geolocation' });
    if (status.state !== 'granted') return null;
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 3500);
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
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 3000 },
    );
  });
}

export function dispatchOpenHeaderCityPicker() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_HEADER_CITY_PICKER_EVENT));
}
