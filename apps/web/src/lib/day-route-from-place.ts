/**
 * Resolve city must-see / event → DayRouteVenueItem for localStorage bucket.
 */

import { resolveCityPlaceHref, type CityMustSeeItem, type CityPlaceLinkFields } from './cityInfo';
import { namesLooselyMatch } from './city-place-href';
import { DAY_ROUTE_MAX, type DayRouteVenueItem } from './day-route';
import { isValidCoordinatePair } from './day-route-score';
import { venueHref } from './routes';

export const DAY_ROUTE_PRESET_SIZE = 4;
export const DAY_ROUTE_PRESET_MIN = 3;

export type DayRouteVenueMatchSource = {
  id?: string | null;
  slug?: string | null;
  name: string;
  title?: string | null;
  type?: string | null;
  pageStatus?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  heroImageUrl?: string | null;
  city?: string | null;
  citySlug?: string | null;
  cityId?: string | null;
};

export type DayRouteCityContext = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  sourceSlug?: string | null;
};

function pickPlaceSlug(place: CityPlaceLinkFields): string | null {
  const venueSlug = String(place.venueSlug || '').trim();
  if (venueSlug) return venueSlug;
  const locationSlug = String(place.locationSlug || '').trim();
  if (locationSlug) return locationSlug;
  const href = String(place.href || '').trim();
  const hrefMatch = href.match(/\/(?:venues|locations)\/([^/?#]+)/i);
  if (hrefMatch?.[1]) {
    try {
      return decodeURIComponent(hrefMatch[1]);
    } catch {
      return hrefMatch[1];
    }
  }
  return null;
}

function findVenueForPlace(
  place: CityPlaceLinkFields & { name?: string },
  venues: DayRouteVenueMatchSource[],
): DayRouteVenueMatchSource | null {
  const slug = pickPlaceSlug(place);
  if (slug) {
    const bySlug = venues.find((venue) => String(venue.slug || '').trim() === slug);
    if (bySlug) return bySlug;
  }
  const placeName = String(place.name || '').trim();
  if (!placeName || !venues.length) return null;
  return venues.find((venue) => namesLooselyMatch(placeName, venue.title || venue.name)) || null;
}

function coordsFromVenue(
  venue: Pick<DayRouteVenueMatchSource, 'latitude' | 'longitude'> | null | undefined,
): Pick<DayRouteVenueItem, 'latitude' | 'longitude'> {
  if (!venue) return {};
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  if (!isValidCoordinatePair(lat, lng)) return { latitude: null, longitude: null };
  return { latitude: lat, longitude: lng };
}

/** Must-see / sight → day-route item when slug or venue match exists. */
export function dayRouteItemFromMustSee(
  place: CityMustSeeItem,
  venues: DayRouteVenueMatchSource[],
  city: DayRouteCityContext,
): DayRouteVenueItem | null {
  const matched = findVenueForPlace(place, venues);
  const slug = pickPlaceSlug(place) || String(matched?.slug || '').trim() || null;
  const id = String(matched?.id || slug || '').trim();
  if (!id) return null;

  const href =
    resolveCityPlaceHref(place) ||
    (matched
      ? venueHref({
          id: matched.id || slug || matched.name,
          slug: matched.slug || slug,
          name: matched.title || matched.name,
          type: matched.type,
        })
      : slug
        ? `/locations/${slug}`
        : null);

  return {
    id,
    slug,
    title: place.name,
    city: city.name || matched?.city || null,
    cityId: city.id || matched?.cityId || null,
    citySlug: city.slug || city.sourceSlug || matched?.citySlug || null,
    href,
    imageUrl: matched?.heroImageUrl || null,
    address: String(matched?.address || '').trim() || null,
    ...coordsFromVenue(matched),
  };
}

export type DayRouteEventSource = {
  id: string;
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  cityId?: string | null;
  citySlug?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  venue?: string | null;
  venueKind?: string | null;
  venueAddress?: string | null;
  venueLatitude?: number | null;
  venueLongitude?: number | null;
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  imageUrl?: string | null;
};

function formatEventSessionLabel(event: DayRouteEventSource): string | null {
  const parts = [String(event.dateLabel || '').trim(), String(event.timeLabel || '').trim()].filter(
    Boolean,
  );
  if (parts.length) return parts.join(', ');
  return null;
}

/** Event card/page → day-route stop at event venue (+ optional session time). */
export function dayRouteItemFromEvent(event: DayRouteEventSource): DayRouteVenueItem | null {
  const venueSlug = String(event.venueSlug || '').trim() || null;
  const venueId = String(event.venueId || '').trim() || null;
  const id = venueId || venueSlug;
  if (!id) return null;

  const title =
    String(event.venue || '').trim() || String(event.title || '').trim() || 'Место события';
  const href =
    venueSlug || venueId
      ? venueHref({
          id: venueId || venueSlug || title,
          slug: venueSlug,
          name: title,
          type: event.venueKind,
        })
      : null;

  const sessionLabel = formatEventSessionLabel(event);
  const startsAt = String(event.startsAt || '').trim() || null;

  return {
    id,
    slug: venueSlug,
    title,
    city: event.city || null,
    cityId: event.cityId || null,
    citySlug: event.citySlug || null,
    href,
    imageUrl: event.imageUrl || null,
    address: String(event.venueAddress || '').trim() || null,
    ...coordsFromVenue({
      latitude: event.venueLatitude,
      longitude: event.venueLongitude,
    }),
    eventId: event.id,
    eventSlug: event.slug || null,
    sessionLabel,
    startsAt,
  };
}

/** Build 3-4 resolvable must-see stops for city preset (same city, capped). */
export function buildCityDayRoutePreset(
  places: CityMustSeeItem[],
  venues: DayRouteVenueMatchSource[],
  city: DayRouteCityContext,
  size = DAY_ROUTE_PRESET_SIZE,
): DayRouteVenueItem[] {
  const cap = Math.min(Math.max(1, size), DAY_ROUTE_MAX);
  const items: DayRouteVenueItem[] = [];
  const seen = new Set<string>();
  for (const place of places) {
    if (items.length >= cap) break;
    const item = dayRouteItemFromMustSee(place, venues, city);
    if (!item) continue;
    const key = String(item.slug || item.id).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

export function cityDayRoutePresetAvailable(
  places: CityMustSeeItem[],
  venues: DayRouteVenueMatchSource[],
  city: DayRouteCityContext,
): boolean {
  return buildCityDayRoutePreset(places, venues, city).length >= DAY_ROUTE_PRESET_MIN;
}
