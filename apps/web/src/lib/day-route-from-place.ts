/**
 * Resolve city must-see / event → DayRouteVenueItem for localStorage bucket.
 */

import { resolveCityPlaceHref, type CityMustSeeItem, type CityPlaceLinkFields } from './cityInfo';
import { namesLooselyMatch } from './city-place-href';
import { lookupEditorialPlaceCoords, pickEditorialPlaceCoordsIfStale } from './city-place-coords.ts'
import { resolveVenueHeroImage } from './city-place-images.ts'
import {
  DAY_ROUTE_MAX,
  DAY_ROUTE_SOFT,
  formatDayRouteStartsAtLabel,
  type DayRouteVenueItem,
} from './day-route.ts'
import { isValidCoordinatePair } from './day-route-score.ts'
import { eventHref, transliterateSlug, venueHref } from './routes';
import { normalizeVisitMinutes } from './visit-duration';

/** Default preset fills toward soft density guideline. */
export const DAY_ROUTE_PRESET_SIZE = DAY_ROUTE_SOFT;
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
  hookFact?: string | null;
  shortDescription?: string | null;
  city?: string | null;
  citySlug?: string | null;
  cityId?: string | null;
};

/**
 * Sentence-start capitalize for hub blurbs (must-see / suburb POI).
 * Skips empty; leaves already-capitalized and non-letter lead intact.
 */
export function capitalizeSentenceStart(value: string | null | undefined): string {
  const text = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[—–]/g, '-');
  if (!text) return text;
  const index = text.search(/\p{L}/u);
  if (index < 0) return text;
  const ch = text.charAt(index);
  const upper = ch.toLocaleUpperCase('ru-RU');
  if (ch === upper) return text;
  return text.slice(0, index) + upper + text.slice(index + 1);
}

/**
 * Strip trailing location crumbs glued to blurbs («. Нева», «. пл. Островского»).
 * Address belongs in address field, not in the 2-line hub annotation.
 */
export function stripLocationCrumbTail(value: string): string {
  const text = String(value || '').trim();
  if (!text) return text;
  return text
    .replace(
      /\.\s+(?:Центр(?:\s*\/\s*(?:ВО|Владимирский|Петроградка))?|ВО|Нева|Мойка|Фонтанка|Лахта|Коломна|Исаакий|Петропавловка|Гавань(?:\s*\/\s*ВО)?|Дворцовая|Адмиралтейская|Адмиралтейский|Владимирская|Литейный|Сенная|Приморский|Московский(?:\s+пр\.\s*\/\s*Цветочная)?|Крестовский(?:\s+остров)?|Выборгская|Инженерная|Невский(?:\s*\/\s*Фонтанка)?|Петроградка|Петроградская(?:\s*\/\s*Заячий)?|Петроградская\s+сторона|Петроградская\s+наб\.?|Васильевский(?:\s+остров)?|Василеостровская|канал\s+Грибоедова|пл\.\s*Искусств|пл\.\s*Островского|пл\.\s*Александра\s+Невского|наб\.\s*Фонтанки|Университетская\s+наб\.?|Кронверкский|Кронверкская\s+наб\.?|Миллионная|Соляной\s+пер\.?|Смольная\s+наб\.?|Исаакиевская\s+пл\.?|пр\.\s*Шаумяна|Невский,\s*\d+|Кожевенная\s+линия|Шпалерная|Театральная|Садовая|Лиговский|Чернышевская|Каменноостровский|Александровский\s+парк|Метро\s+Крестовский\s+остров|у\s+Невского|у\s+Михайловского\s+замка|Центр\s*\/\s*Петроградка|Заячий)\s*$/u,
      '.',
    )
    .trim();
}

/** Full «зачем сюда» text.
 * Default (search/catalog): venue hookFact → shortDescription → editorial desc.
 * Hub cards (`preferEditorial`): cityInfo desc first, so supplier crumbs/truncation cannot overwrite.
 * Optional `maxLen` truncates for compact hints (search). Cards pass no maxLen = full text. */
export function dayRouteHookLine(
  sources: {
    hookFact?: string | null;
    shortDescription?: string | null;
    desc?: string | null;
    /** Prefer editorial cityInfo desc over Venue blurbs (city hub / my-day must-see). */
    preferEditorial?: boolean;
  },
  maxLen?: number | null,
): string | null {
  const picked = sources.preferEditorial
    ? sources.desc || sources.hookFact || sources.shortDescription || ''
    : sources.hookFact || sources.shortDescription || sources.desc || '';
  const raw = capitalizeSentenceStart(
    stripLocationCrumbTail(
      String(picked)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[—–]/g, '-'),
    ),
  );
  if (!raw) return null;
  const limit = maxLen == null || maxLen <= 0 ? null : maxLen;
  if (limit == null || raw.length <= limit) return raw;
  const cut = raw.slice(0, Math.max(1, limit - 1));
  const sp = cut.lastIndexOf(' ');
  const base = sp > Math.floor(limit * 0.55) ? cut.slice(0, sp) : cut;
  return `${base.replace(/[.,;:!\-\s]+$/u, '')}...`;
}

export type DayRouteCityContext = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  sourceSlug?: string | null;
};

export type DayRoutePlaceOptions = {
  /** Preserve significant-suburb context on the planner stop. */
  isSuburb?: boolean;
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
  place: CityPlaceLinkFields & { name?: string; address?: string; desc?: string },
  venues: DayRouteVenueMatchSource[],
): DayRouteVenueMatchSource | null {
  const slug = pickPlaceSlug(place);
  if (slug) {
    const bySlug = venues.find((venue) => String(venue.slug || '').trim() === slug);
    if (bySlug) return bySlug;
    // Explicit editorial slug missing from hub: never glue a different venue by loose name
    // (mosque «Санкт-Петербургская…» previously matched «МТС Live Холл Санкт-Петербург»).
    return null;
  }
  const placeName = String(place.name || '').trim();
  if (!placeName || !venues.length) return null;
  const placeBlob = `${placeName} ${place.address || ''} ${place.desc || ''}`.toLowerCase();
  const wantsKronstadt = /кронштадт|якорн/.test(placeBlob);
  const wantsPier = /причал|пристан|\bпирс\b/.test(placeBlob);
  const matches = venues.filter((venue) => {
    if (!namesLooselyMatch(placeName, venue.title || venue.name)) return false;
    if (!wantsKronstadt && isKronstadtNavalCathedralVenue(venue)) return false;
    if (!wantsPier && isPierishVenue(venue)) return false;
    return true;
  });
  if (!matches.length) return null;
  matches.sort((a, b) => rankNameMatch(placeName, a) - rankNameMatch(placeName, b));
  return matches[0] || null;
}

function isPierishVenue(
  venue: Pick<DayRouteVenueMatchSource, 'type' | 'name' | 'title' | 'slug'>,
): boolean {
  const type = String(venue.type || '').toLowerCase();
  if (type.includes('pier')) return true;
  const blob = `${venue.title || ''} ${venue.name || ''} ${venue.slug || ''}`.toLowerCase();
  return /причал|пристан|\bпирс\b|debarcadere|pier/.test(blob);
}

function rankNameMatch(
  placeName: string,
  venue: Pick<DayRouteVenueMatchSource, 'name' | 'title'>,
): number {
  const query = String(placeName || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .trim();
  const candidate = String(venue.title || venue.name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .trim();
  if (query === candidate) return 0;
  if (candidate.startsWith(query) || query.startsWith(candidate)) return 1;
  return 10 + Math.abs(candidate.length - query.length);
}

function isKronstadtNavalCathedralVenue(
  venue: Pick<DayRouteVenueMatchSource, 'slug' | 'name' | 'title' | 'address' | 'latitude' | 'longitude'>,
): boolean {
  const slug = String(venue.slug || '').trim().toLowerCase();
  if (slug === 'saint-petersburg-morskoy-nikolskiy-sobor') return true;
  const address = String(venue.address || '').toLowerCase();
  if (address.includes('якорн') || address.includes('кронштадт')) {
    const title = String(venue.title || venue.name || '').toLowerCase();
    if (title.includes('никол')) return true;
  }
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 59.97 && lng > 29.5 && lng < 30.05) {
    const title = String(venue.title || venue.name || '').toLowerCase();
    return title.includes('никол') && (title.includes('морск') || title.includes('собор'));
  }
  return false;
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

function coordsFromPlace(
  place: CityMustSeeItem,
  matched: DayRouteVenueMatchSource | null,
  slug: string | null,
): Pick<DayRouteVenueItem, 'latitude' | 'longitude'> {
  const fromPlace = coordsFromVenue({
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
  });
  const fromVenue = coordsFromVenue(matched);
  const current =
    fromPlace.latitude != null && fromPlace.longitude != null ? fromPlace : fromVenue;
  const rebase = pickEditorialPlaceCoordsIfStale(slug, current.latitude, current.longitude);
  if (rebase) return rebase;
  if (current.latitude != null && current.longitude != null) return current;
  return coordsFromVenue(lookupEditorialPlaceCoords(slug));
}

/** Must-see / sight → day-route item when slug, venue match, or suburb editorial stub exists. */
export function dayRouteItemFromMustSee(
  place: CityMustSeeItem,
  venues: DayRouteVenueMatchSource[],
  city: DayRouteCityContext,
  options: DayRoutePlaceOptions = {},
): DayRouteVenueItem | null {
  const matched = findVenueForPlace(place, venues);
  const slug = pickPlaceSlug(place) || String(matched?.slug || '').trim() || null;
  const editorialId = String(place.dayRouteId || '').trim();
  // Significant-suburb nested POIs often lack catalog slug; still allow «В маршрут»
  // via a stable editorial id so every listed point can be pinned.
  const suburbStubId =
    options.isSuburb && !matched && !slug && !editorialId
      ? (() => {
          const key = transliterateSlug(place.name);
          return key ? `suburb:${key}` : '';
        })()
      : '';
  const id = String(matched?.id || slug || editorialId || suburbStubId).trim();
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

  // Hub often stores dark /venues/generated stubs; curated /images/venues/{city}/ wins.
  const imageUrl = resolveVenueHeroImage(slug, matched?.heroImageUrl);
  const transitTip = String(place.transitTip || '').trim() || null;
  const placeAddress = String(place.address || '').trim();
  const matchedAddress = String(matched?.address || '').trim();
  // Prefer editorial address when hub twin still carries Kronstadt crumbs.
  const address =
    placeAddress ||
    (matched && isKronstadtNavalCathedralVenue(matched) && !/кронштадт|якорн/i.test(`${place.name} ${place.desc || ''}`)
      ? ''
      : matchedAddress) ||
    null;
  return {
    id,
    slug,
    title: place.name,
    city: city.name || matched?.city || null,
    cityId: city.id || matched?.cityId || null,
    citySlug: city.slug || city.sourceSlug || matched?.citySlug || null,
    isSuburb: options.isSuburb || undefined,
    href,
    imageUrl,
    address,
    transitTip,
    dwellMinutes: normalizeVisitMinutes(place.visitMinutes) ?? undefined,
    ...coordsFromPlace(place, matched, slug),
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
  return formatDayRouteStartsAtLabel(event.startsAt);
}

/** Event card/page → day-route stop at event venue (+ optional session time). */
export function dayRouteItemFromEvent(event: DayRouteEventSource): DayRouteVenueItem | null {
  const venueSlug = String(event.venueSlug || '').trim() || null;
  const venueId = String(event.venueId || '').trim() || null;
  const venueSlugNorm = String(venueSlug || '').trim().toLowerCase();
  const rawEventSlug = String(event.slug || '').trim() || null;
  const rawEventId = String(event.id || '').trim();
  const eventSlug =
    rawEventSlug && rawEventSlug.toLowerCase() !== venueSlugNorm ? rawEventSlug : null;
  const eventId =
    rawEventId && rawEventId.toLowerCase() !== venueSlugNorm ? rawEventId : null;
  // Prefer venue locator for map/Yandex; fall back to real event id (share hydrate).
  const id = venueId || venueSlug || eventId || eventSlug;
  if (!id) return null;

  // Owner: show real event title (not venue name / «Событие из маршрута» stub).
  const title =
    String(event.title || '').trim() || String(event.venue || '').trim() || 'Место события';
  const venueLabel = String(event.venue || '').trim() || title;
  const href =
    venueSlug || venueId
      ? venueHref({
          id: venueId || venueSlug || venueLabel,
          slug: venueSlug,
          name: venueLabel,
          type: event.venueKind,
        })
      : eventSlug || eventId
        ? eventHref({
            id: eventId || eventSlug || rawEventId,
            slug: eventSlug,
            title,
          })
        : null;

  const sessionLabel = formatEventSessionLabel(event);
  const startsAt = String(event.startsAt || '').trim() || null;
  const imageUrl =
    resolveVenueHeroImage(venueSlug, event.imageUrl) ||
    String(event.imageUrl || '').trim() ||
    null;

  let ticketUrl: string | null = null;
  if (eventSlug || eventId) {
    ticketUrl = eventHref({
      id: eventId || eventSlug || rawEventId,
      slug: eventSlug,
      title: event.title,
    });
    const eventPath = ticketUrl.replace(/^\/events\//i, '').split('/')[0] || '';
    let eventPathDecoded = eventPath;
    try {
      eventPathDecoded = decodeURIComponent(eventPath);
    } catch {
      eventPathDecoded = eventPath;
    }
    if (
      venueSlugNorm &&
      (eventPathDecoded.toLowerCase() === venueSlugNorm ||
        eventPath.toLowerCase() === venueSlugNorm)
    ) {
      ticketUrl = null;
    }
  }
  if (!ticketUrl) {
    ticketUrl =
      href ||
      (venueSlug
        ? venueHref({
            id: venueId || venueSlug || venueLabel,
            slug: venueSlug,
            name: venueLabel,
            type: event.venueKind,
          })
        : null);
  }

  return {
    id,
    slug: venueSlug,
    title,
    city: event.city || null,
    cityId: event.cityId || null,
    citySlug: event.citySlug || null,
    href,
    imageUrl,
    address: String(event.venueAddress || '').trim() || null,
    ...coordsFromVenue({
      latitude: event.venueLatitude,
      longitude: event.venueLongitude,
    }),
    eventId,
    eventSlug,
    sessionLabel,
    startsAt,
    ticketUrl,
  };
}

/** Build resolvable must-see stops for city preset (default soft guideline; hard MAX is safety only). */
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
  size = DAY_ROUTE_PRESET_SIZE,
): boolean {
  return buildCityDayRoutePreset(places, venues, city, size).length >= DAY_ROUTE_PRESET_MIN;
}
