/**
 * Guest «Собери свой день» bucket (localStorage). Separate from favorites wishlist.
 */

import { haversineMeters, isValidCoordinatePair } from './day-route-score';
import { eventHref, venueHref } from './routes';

export const DAY_ROUTE_STORAGE_KEY = 'daibilet:dayRoute';
export const DAY_ROUTE_CHANGED_EVENT = 'daibilet:day-route-changed';

export const DAY_ROUTE_MIN = 2;
/** Soft density guideline: warn in UI, still allow adding until hard cap. */
export const DAY_ROUTE_SOFT = 10;
export const DAY_ROUTE_SOFT_WARN =
  'День уже плотный - карта и время могут разъехаться';
/** Hard safety cap for localStorage / share URL (not a planning ideal). */
export const DAY_ROUTE_MAX = 15;

export function isDayRouteAtSoft(count: number): boolean {
  return count >= DAY_ROUTE_SOFT;
}

export function isDayRouteAtHard(count: number): boolean {
  return count >= DAY_ROUTE_MAX;
}

export function dayRouteHardLimitMessage(): string {
  return `Лимит ${DAY_ROUTE_MAX} точек`;
}

export function dayRouteAddSuccessMessage(count: number): string {
  if (isDayRouteAtSoft(count) && count < DAY_ROUTE_MAX) {
    return `Добавлено · ${count} · ${DAY_ROUTE_SOFT_WARN}`;
  }
  return `Добавлено в маршрут · ${count}`;
}

/** Count label for header / route block (soft is guideline, not /10 lock). */
export function formatDayRouteCountLabel(count: number, prefix = 'Точки'): string {
  if (count <= 0) return `${prefix} · 0`;
  if (isDayRouteAtHard(count)) return `${prefix} · ${count}/${DAY_ROUTE_MAX}`;
  if (isDayRouteAtSoft(count)) return `${prefix} · ${count} · плотный день`;
  return `${prefix} · ${count}`;
}

/** Russian plural for «точка» (1 точка / 2 точки / 5 точек). */
export function dayRoutePointsWord(count: number): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'точек';
  if (last === 1) return 'точка';
  if (last >= 2 && last <= 4) return 'точки';
  return 'точек';
}

/**
 * Flat list heading: stop count, not «route #N».
 * Aligns with header «N точек из 10» without implying multiple saved routes.
 */
export function formatDayRouteStopsHeading(count: number): string {
  const n = Math.max(0, count);
  const word = dayRoutePointsWord(n);
  if (isDayRouteAtHard(n)) return `${n} ${word} · лимит`;
  if (isDayRouteAtSoft(n)) return `${n} ${word} · плотный день`;
  return `${n} ${word}`;
}

export type DayRouteCoords = { latitude: number; longitude: number };

export type DayRouteVenueItem = {
  id: string;
  slug?: string | null;
  title: string;
  city?: string | null;
  cityId?: string | null;
  citySlug?: string | null;
  href?: string | null;
  imageUrl?: string | null;
  /** Snapshot at add-time / enrich from matches - so Yandex CTA does not depend only on API. */
  latitude?: number | null;
  longitude?: number | null;
  /** Full street address snapshot from catalog (not over-shortened display title). */
  address?: string | null;
  /** Optional free-text address / note for planner stops (not from catalog). */
  note?: string | null;
  /** Optional: added from event card/page (backward compatible - older storage omits these). */
  eventId?: string | null;
  eventSlug?: string | null;
  /** Human label for session time, e.g. «сб, 14:00». */
  sessionLabel?: string | null;
  startsAt?: string | null;
  /** Checkout / event page URL for «Купить билет» (optional; else derived from eventSlug/id). */
  ticketUrl?: string | null;
  /** Guest marked ticket as purchased - persisted in localStorage. */
  ticketBought?: boolean;
};

/** Synthetic planner stops (typed on /my-day) - no catalog venue id required. */
export const DAY_ROUTE_TEXT_ID_PREFIX = 'text_';
export const DAY_ROUTE_SHARE_TEXT_PREFIX = 't:';
/** Share token meta: `@e:{eventSlug|eventId}` after venue locator. */
export const DAY_ROUTE_SHARE_EVENT_PREFIX = 'e:';

export type DayRouteTravelMode = 'walk' | 'auto';

/** Rough urban speeds (m/min) for MVP haversine ETA - no routing API. */
const DAY_ROUTE_TRAVEL_M_PER_MIN: Record<DayRouteTravelMode, number> = {
  walk: 80, // ~4.8 km/h
  auto: 500, // ~30 km/h city
};

export type DayRouteShareTokenMeta = {
  /** Venue slug/id, or full `t:Title` text token. */
  locator: string;
  startsAt: string | null;
  eventSlug: string | null;
  eventId: string | null;
  isText: boolean;
};

export function isTextDayRouteStop(
  item: Pick<DayRouteVenueItem, 'id'> | string | null | undefined,
): boolean {
  const id = typeof item === 'string' ? item : String(item?.id || '');
  return id.startsWith(DAY_ROUTE_TEXT_ID_PREFIX);
}

/** Ids safe to send to /api/day-route/matches (catalog venues only). */
export function catalogDayRouteVenueIds(venues: DayRouteVenueItem[]): string[] {
  return venues
    .map((v) => String(v.id || '').trim())
    .filter((id) => id && !isTextDayRouteStop(id) && !id.startsWith(DAY_ROUTE_SHARE_TEXT_PREFIX));
}

export function createTextDayRouteStopId(): string {
  const rand =
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${DAY_ROUTE_TEXT_ID_PREFIX}${rand}`;
}

/**
 * Parse optional coords from "lat, lng" paste or separate numbers.
 * Returns null when incomplete / invalid (never throws).
 */
export function parseDayRouteCoordsInput(input: {
  coordsText?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}): DayRouteCoords | null {
  const fromPair = String(input.coordsText || '')
    .trim()
    // Normalize paste noise: NBSP / thin spaces, fullwidth / typographic commas, semicolons.
    .replace(/[\u00A0\u202F\u2007\u2009\u200B]/g, ' ')
    .replace(/[;；‚，]/g, ',')
    .match(/(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)/);
  if (fromPair) {
    const latitude = Number(String(fromPair[1]).replace(',', '.'));
    const longitude = Number(String(fromPair[2]).replace(',', '.'));
    if (isValidCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (isValidCoordinatePair(latitude, longitude)) return { latitude, longitude };
  return null;
}

export type TextDayRouteStopInput = {
  title: string;
  note?: string | null;
  city?: string | null;
  cityId?: string | null;
  citySlug?: string | null;
  coordsText?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

/**
 * Add a free-text stop to the day planner.
 * Never requires catalog venue id / cityId match - city fields are optional labels only.
 */
export function addTextStopToDayRoute(input: TextDayRouteStopInput): DayRouteState {
  const title = String(input.title || '').trim();
  if (!title) return readDayRouteFresh();
  const current = readDayRouteFresh();
  // Hard cap = DAY_ROUTE_MAX. Soft (DAY_ROUTE_SOFT) is warn-only. MIN is "day ready" hint.
  if (current.venues.length >= DAY_ROUTE_MAX) return current;

  const coords = parseDayRouteCoordsInput(input);
  const note = String(input.note || '').trim() || null;
  const city = String(input.city || '').trim() || null;
  const citySlug = String(input.citySlug || '').trim() || null;
  // cityId is optional metadata only - never gate the append.
  const cityId = String(input.cityId || '').trim() || null;

  const item: DayRouteVenueItem = {
    id: createTextDayRouteStopId(),
    title,
    note,
    city,
    // Optional metadata only - never compared/blocked against catalog cityId.
    cityId,
    citySlug,
    slug: null,
    href: null,
    imageUrl: null,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  };

  const next: DayRouteState = {
    // Keep prior cityId if set; text stops do not force a city switch.
    cityId: current.cityId || cityId || null,
    venues: [...current.venues, item].slice(0, DAY_ROUTE_MAX),
  };
  return writeDayRoute(next) ? readDayRouteFresh() : current;
}

export type DayRouteState = {
  cityId: string | null;
  venues: DayRouteVenueItem[];
};

type DayRouteListener = (state: DayRouteState) => void;

type DayRouteRuntime = {
  snapshotCache: { raw: string | null; state: DayRouteState } | null;
  listeners: Set<DayRouteListener>;
  browserBridgeInstalled: boolean;
};

declare global {
  interface Window {
    __daibiletDayRouteRuntime?: DayRouteRuntime;
  }
}

/** Module fallback for SSR / node:test; browser uses window singleton (avoids multi-chunk desync). */
const moduleRuntime: DayRouteRuntime = {
  snapshotCache: null,
  listeners: new Set(),
  browserBridgeInstalled: false,
};

function getDayRouteRuntime(): DayRouteRuntime {
  if (typeof window === 'undefined') return moduleRuntime;
  if (!window.__daibiletDayRouteRuntime) {
    window.__daibiletDayRouteRuntime = {
      snapshotCache: moduleRuntime.snapshotCache,
      listeners: moduleRuntime.listeners,
      browserBridgeInstalled: moduleRuntime.browserBridgeInstalled,
    };
  }
  return window.__daibiletDayRouteRuntime;
}

function installDayRouteBrowserBridge() {
  const runtime = getDayRouteRuntime();
  if (runtime.browserBridgeInstalled || typeof window === 'undefined') return;
  if (typeof window.addEventListener !== 'function') return;
  runtime.browserBridgeInstalled = true;
  // bfcache / tab restore can revive stale React trees; force re-read from localStorage.
  window.addEventListener('pageshow', () => {
    runtime.snapshotCache = null;
    const state = getDayRouteSnapshot();
    notifyDayRouteChanged();
    notifyDayRouteSubscribers(state);
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== DAY_ROUTE_STORAGE_KEY && event.key != null) return;
    runtime.snapshotCache = null;
    const state = getDayRouteSnapshot();
    notifyDayRouteChanged();
    notifyDayRouteSubscribers(state);
  });
}

function notifyDayRouteSubscribers(state: DayRouteState) {
  for (const listener of getDayRouteRuntime().listeners) {
    try {
      listener(state);
    } catch {
      // ignore subscriber errors
    }
  }
}

/** Subscribe to day-route snapshot updates (for useSyncExternalStore). */
export function subscribeDayRoute(listener: DayRouteListener): () => void {
  installDayRouteBrowserBridge();
  const listeners = getDayRouteRuntime().listeners;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Cached snapshot; identity stable until localStorage changes. */
export function getDayRouteSnapshot(): DayRouteState {
  installDayRouteBrowserBridge();
  if (typeof window === 'undefined') return emptyDayRoute();
  const runtime = getDayRouteRuntime();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DAY_ROUTE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (runtime.snapshotCache && runtime.snapshotCache.raw === raw) return runtime.snapshotCache.state;
  const state = parseDayRouteRaw(raw);
  runtime.snapshotCache = { raw, state };
  return state;
}

export function getServerDayRouteSnapshot(): DayRouteState {
  return emptyDayRoute();
}

/** Test-only: drop cached snapshot between mock localStorage installs. */
export function resetDayRouteSnapshotCache() {
  const runtime = getDayRouteRuntime();
  runtime.snapshotCache = null;
  moduleRuntime.snapshotCache = null;
}

function dedupeDayRouteVenues(venues: DayRouteVenueItem[]): DayRouteVenueItem[] {
  const out: DayRouteVenueItem[] = [];
  for (const item of venues) {
    if (out.some((existing) => sameDayRouteVenue(existing, item))) continue;
    out.push(item);
  }
  return out.slice(0, DAY_ROUTE_MAX);
}

export function emptyDayRoute(): DayRouteState {
  return { cityId: null, venues: [] };
}

function sanitizeStoredCoords(item: DayRouteVenueItem): Pick<DayRouteVenueItem, 'latitude' | 'longitude'> {
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  if (!isValidCoordinatePair(lat, lng)) return { latitude: null, longitude: null };
  return { latitude: lat, longitude: lng };
}

function parseDayRouteRaw(raw: string | null): DayRouteState {
  if (!raw) return emptyDayRoute();
  try {
    const parsed = JSON.parse(raw) as Partial<DayRouteState>;
    const venues: DayRouteVenueItem[] = [];
    if (Array.isArray(parsed.venues)) {
      for (const item of parsed.venues) {
        if (!item || typeof item !== 'object') continue;
        if (typeof item.title !== 'string' || !item.title.trim()) continue;
        const id = normalizeDayRouteVenueId(item);
        if (!id) continue;
        const next = sanitizeDayRouteTicketFields({
          ...item,
          id,
          title: item.title,
          slug: item.slug != null ? String(item.slug).trim() || null : null,
          ...sanitizeStoredCoords(item),
        });
        if (venues.some((existing) => sameDayRouteVenue(existing, next))) continue;
        venues.push(next);
      }
    }
    return {
      cityId: typeof parsed.cityId === 'string' ? parsed.cityId : null,
      venues: venues.slice(0, DAY_ROUTE_MAX),
    };
  } catch {
    return emptyDayRoute();
  }
}

export function readDayRoute(): DayRouteState {
  if (typeof window === 'undefined') return emptyDayRoute();
  return getDayRouteSnapshot();
}

/** Fresh LS read (ignore snapshot cache). Use before mutate + after failed write checks. */
export function readDayRouteFresh(): DayRouteState {
  if (typeof window === 'undefined') return emptyDayRoute();
  resetDayRouteSnapshotCache();
  return getDayRouteSnapshot();
}

function cloneDayRouteState(state: DayRouteState): DayRouteState {
  return {
    cityId: state.cityId,
    venues: state.venues.map((venue) => ({ ...venue })),
  };
}

function dayRoutePersistPayload(state: DayRouteState, slim: boolean): DayRouteState {
  const venues = dedupeDayRouteVenues(state.venues).map((venue) => {
    if (!slim) return { ...venue };
    const { imageUrl: _drop, href: _href, ...rest } = venue;
    return rest;
  });
  return { cityId: state.cityId, venues };
}

/**
 * Disposable page-cache keys from legacy public SSR / browsing.
 * Same origin shares LS with day-route; when quota is full, growing 2→3 text stops
 * fails even though slim(imageUrl) cannot shrink text-only payloads.
 * Never touch dayRoute / favorites / auth / selected-city.
 */
const DAY_ROUTE_EVICTABLE_KEY_PREFIXES = [
  'daibilet:venue-page:',
  'daibilet:event-page:',
  'daibilet:city-page:',
  'daibilet:city-venues:',
  'daibilet:landing-page:',
  'daibilet:venues-catalog:',
  'daibilet:catalog-default',
  'daibilet:public-stats',
  'daibilet:public-destinations',
  'daibilet:public-home-preview',
] as const;

function isDayRouteEvictableKey(key: string): boolean {
  return DAY_ROUTE_EVICTABLE_KEY_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(prefix),
  );
}

/** Drop disposable page-cache keys (largest first). `needBytes<=0` = evict all. */
export function evictDayRouteDisposableCaches(needBytes = 0): number {
  if (typeof window === 'undefined') return 0;
  type Entry = { key: string; size: number };
  const entries: Entry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !isDayRouteEvictableKey(key)) continue;
      const value = localStorage.getItem(key) || '';
      entries.push({ key, size: key.length + value.length });
    }
  } catch {
    return 0;
  }
  entries.sort((a, b) => b.size - a.size);
  let freed = 0;
  for (const entry of entries) {
    if (needBytes > 0 && freed >= needBytes) break;
    try {
      localStorage.removeItem(entry.key);
      freed += entry.size;
    } catch {
      // ignore
    }
  }
  return freed;
}

function trySetDayRouteRaw(raw: string): boolean {
  try {
    localStorage.setItem(DAY_ROUTE_STORAGE_KEY, raw);
    // Round-trip check: extensions / full-quota edge cases can no-op or clobber.
    return localStorage.getItem(DAY_ROUTE_STORAGE_KEY) === raw;
  } catch {
    return false;
  }
}

export function writeDayRoute(state: DayRouteState): boolean {
  if (typeof window === 'undefined') return false;
  // Full → slim(no image/href) → after quota eviction retry both.
  // Owner «Не удалось добавить точку» on 3rd text stop: LS full of page caches,
  // growing dayRoute by ~200B throws QuotaExceeded; slim alone cannot shrink text stops.
  const attempts = [dayRoutePersistPayload(state, false), dayRoutePersistPayload(state, true)];
  let raw: string | null = null;
  let normalized: DayRouteState | null = null;
  const tryAttempts = () => {
    for (const attempt of attempts) {
      const nextRaw = JSON.stringify({
        cityId: attempt.cityId,
        venues: attempt.venues,
      });
      if (!trySetDayRouteRaw(nextRaw)) continue;
      raw = nextRaw;
      normalized = attempt;
      return true;
    }
    return false;
  };
  if (!tryAttempts()) {
    // Evict all disposable page caches (same-origin legacy public SSR blobs).
    evictDayRouteDisposableCaches(0);
    tryAttempts();
  }
  if (!raw || !normalized) {
    // Quota / private mode: do not update snapshot or UI - keeps badge/buttons honest.
    return false;
  }
  const frozen = cloneDayRouteState(normalized);
  Object.freeze(frozen);
  for (const venue of frozen.venues) Object.freeze(venue);
  const runtime = getDayRouteRuntime();
  runtime.snapshotCache = { raw, state: frozen };
  notifyDayRouteChanged();
  // Subscribers get a mutable clone so React trees cannot corrupt the cache identity.
  notifyDayRouteSubscribers(cloneDayRouteState(frozen));
  return true;
}

export function notifyDayRouteChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DAY_ROUTE_CHANGED_EVENT));
}

/**
 * True when this venue is already in the day route.
 * Empty locators never match (avoids blank-id lighting every card).
 *
 * When both id and slug are provided, match via `sameDayRouteVenue` only
 * (id↔id or slug↔slug). The older "any needle vs any stored id/slug" rule
 * false-positived catalog adds when a stored slug collided with another
 * venue's id (compact path then toasted «Уже в маршруте» and skipped add).
 *
 * Single locator (id or slug alone) still matches either stored field -
 * share links / panel filters pass one token.
 */
export function isInDayRoute(
  venueId: string,
  state = readDayRoute(),
  slug?: string | null,
): boolean {
  const id = String(venueId || '').trim();
  const s = String(slug ?? '').trim();
  if (!id && !s) return false;

  if (id && s) {
    return state.venues.some((v) => sameDayRouteVenue(v, { id, slug: s }));
  }

  const needle = id || s;
  return state.venues.some((v) => {
    const vid = String(v.id || '').trim();
    const vslug = String(v.slug || '').trim();
    return needle === vid || needle === vslug;
  });
}

/** Stable id for storage; never allow blank (blank id collapses all adds into one slot). */
export function normalizeDayRouteVenueId(item: Pick<DayRouteVenueItem, 'id' | 'slug'>): string {
  const id = String(item.id || '').trim();
  if (id) return id;
  return String(item.slug || '').trim();
}

export function sameDayRouteVenue(
  left: Pick<DayRouteVenueItem, 'id' | 'slug'>,
  right: Pick<DayRouteVenueItem, 'id' | 'slug'>,
): boolean {
  const leftId = String(left.id || '').trim();
  const rightId = String(right.id || '').trim();
  if (leftId && rightId && leftId === rightId) return true;
  const leftSlug = String(left.slug || '').trim();
  const rightSlug = String(right.slug || '').trim();
  return Boolean(leftSlug && rightSlug && leftSlug === rightSlug);
}

/**
 * Soft-nav `/locations|venues/[slug]` must not reuse a previous venue payload.
 * Match by slug, id, or id-suffix CHPU (`name-{idWithoutVenuePrefix}`).
 */
export function venueMatchesRouteSlug(
  venue: { id?: string | null; slug?: string | null } | null | undefined,
  routeSlug: string,
): boolean {
  if (!venue) return false;
  const route = String(routeSlug || '').trim();
  if (!route) return false;
  let decoded = route;
  try {
    decoded = decodeURIComponent(route);
  } catch {
    decoded = route;
  }
  const slug = String(venue.slug || '').trim();
  const id = String(venue.id || '').trim();
  if (slug && (slug === route || slug === decoded)) return true;
  if (id && (id === route || id === decoded)) return true;
  const bare = id.replace(/^venue_/, '');
  // Only accept id-suffix CHPU when bare id is long enough (avoid `park-a` matching `venue_a`).
  if (
    bare.length >= 8 &&
    (route === bare || decoded === bare || route.endsWith(`-${bare}`) || decoded.endsWith(`-${bare}`))
  ) {
    return true;
  }
  return false;
}

function mergeDayRouteVenueFields(
  existing: DayRouteVenueItem,
  incoming: DayRouteVenueItem,
): DayRouteVenueItem {
  const coords = sanitizeStoredCoords(incoming);
  const next: DayRouteVenueItem = {
    ...existing,
    title: incoming.title || existing.title,
    slug: incoming.slug ?? existing.slug,
    city: incoming.city ?? existing.city,
    cityId: incoming.cityId ?? existing.cityId,
    citySlug: incoming.citySlug ?? existing.citySlug,
    href: incoming.href ?? existing.href,
    imageUrl: incoming.imageUrl ?? existing.imageUrl,
  };
  const incomingAddress = String(incoming.address || '').trim();
  const existingAddress = String(existing.address || '').trim();
  // Prefer fuller catalog address (street+house over street-only leftover).
  if (incomingAddress && (!existingAddress || incomingAddress.length > existingAddress.length)) {
    next.address = incomingAddress;
  }
  if (coords.latitude != null && coords.longitude != null) {
    next.latitude = coords.latitude;
    next.longitude = coords.longitude;
  }
  if (incoming.eventId) next.eventId = incoming.eventId;
  if (incoming.eventSlug) next.eventSlug = incoming.eventSlug;
  if (incoming.sessionLabel) next.sessionLabel = incoming.sessionLabel;
  if (incoming.startsAt) next.startsAt = incoming.startsAt;
  if (incoming.ticketUrl) next.ticketUrl = incoming.ticketUrl;
  if (typeof incoming.ticketBought === 'boolean') next.ticketBought = incoming.ticketBought;
  if (incoming.note != null) next.note = incoming.note;
  return next;
}

/** Patch a single stop in localStorage (ticket status, times, etc.). */
export function updateDayRouteVenue(
  venueId: string,
  patch: Partial<DayRouteVenueItem>,
): DayRouteState {
  const current = readDayRouteFresh();
  const needle = String(venueId || '').trim();
  if (!needle) return current;
  let changed = false;
  const venues = current.venues.map((venue) => {
    if (venue.id !== needle && String(venue.slug || '').trim() !== needle) return venue;
    changed = true;
    const merged: DayRouteVenueItem = sanitizeDayRouteTicketFields({
      ...venue,
      ...patch,
      id: venue.id,
      ...sanitizeStoredCoords({ ...venue, ...patch }),
    });
    return merged;
  });
  if (!changed) return current;
  const next: DayRouteState = { cityId: current.cityId, venues };
  return writeDayRoute(next) ? readDayRouteFresh() : current;
}

export function addToDayRoute(item: DayRouteVenueItem): DayRouteState {
  // Always mutate from LS truth, not a possibly-stale snapshotCache identity.
  const current = readDayRouteFresh();
  const id = normalizeDayRouteVenueId(item);
  if (!id) return current;
  const coords = sanitizeStoredCoords(item);
  const normalized = sanitizeDayRouteTicketFields({ ...item, id, ...coords });

  const existingIdx = current.venues.findIndex((v) => sameDayRouteVenue(v, normalized));
  if (existingIdx >= 0) {
    const existing = current.venues[existingIdx]!;
    const merged = sanitizeDayRouteTicketFields(mergeDayRouteVenueFields(existing, normalized));
    const unchanged =
      merged.latitude === existing.latitude &&
      merged.longitude === existing.longitude &&
      merged.address === existing.address &&
      merged.eventId === existing.eventId &&
      merged.eventSlug === existing.eventSlug &&
      merged.sessionLabel === existing.sessionLabel &&
      merged.startsAt === existing.startsAt &&
      merged.ticketUrl === existing.ticketUrl &&
      merged.ticketBought === existing.ticketBought &&
      merged.href === existing.href &&
      merged.imageUrl === existing.imageUrl;
    if (unchanged) return current;
    const venues = [...current.venues];
    venues[existingIdx] = merged;
    const next: DayRouteState = { cityId: current.cityId, venues };
    return writeDayRoute(next) ? readDayRouteFresh() : current;
  }

  const nextCityId = normalized.cityId || current.cityId;
  const mixedCity =
    Boolean(current.cityId && normalized.cityId && current.cityId !== normalized.cityId) ||
    Boolean(current.venues.length && nextCityId && current.cityId && current.cityId !== nextCityId);

  if (current.venues.length >= DAY_ROUTE_MAX) return current;

  const next: DayRouteState = {
    cityId: nextCityId || current.cityId,
    venues: [...current.venues, normalized].slice(0, DAY_ROUTE_MAX),
  };
  // Keep first city as dominant; still allow add but UI warns on mixed.
  // Same city TITLE with null vs city_* ids must NEVER block append.
  if (mixedCity && current.cityId) {
    next.cityId = current.cityId;
  }
  return writeDayRoute(next) ? readDayRouteFresh() : current;
}

export function removeFromDayRoute(venueId: string): DayRouteState {
  const current = readDayRoute();
  const needle = String(venueId || '').trim();
  const venues = current.venues.filter(
    (v) => v.id !== needle && String(v.slug || '').trim() !== needle,
  );
  const next: DayRouteState = {
    cityId: venues[0]?.cityId || (venues.length ? current.cityId : null),
    venues,
  };
  writeDayRoute(next);
  return next;
}

/** Reorder points in localStorage (persist desired visit order). */
export function reorderDayRoute(orderedIds: string[]): DayRouteState {
  const current = readDayRoute();
  const byId = new Map(current.venues.map((v) => [v.id, v]));
  const nextVenues: DayRouteVenueItem[] = [];
  const seen = new Set<string>();
  for (const id of orderedIds) {
    const venue = byId.get(id);
    if (!venue || seen.has(id)) continue;
    seen.add(id);
    nextVenues.push(venue);
  }
  for (const venue of current.venues) {
    if (seen.has(venue.id)) continue;
    nextVenues.push(venue);
  }
  const next: DayRouteState = {
    cityId: current.cityId,
    venues: nextVenues.slice(0, DAY_ROUTE_MAX),
  };
  writeDayRoute(next);
  return next;
}

/** Move a point up (-1) or down (+1) in the day route. */
export function moveDayRouteVenue(venueId: string, delta: -1 | 1): DayRouteState {
  const current = readDayRoute();
  const index = current.venues.findIndex((v) => v.id === venueId);
  if (index < 0) return current;
  const target = index + delta;
  if (target < 0 || target >= current.venues.length) return current;
  const venues = [...current.venues];
  const [item] = venues.splice(index, 1);
  venues.splice(target, 0, item);
  return reorderDayRoute(venues.map((v) => v.id));
}

export function clearDayRoute() {
  writeDayRoute(emptyDayRoute());
}

export function toggleDayRoute(item: DayRouteVenueItem): DayRouteState {
  const id = normalizeDayRouteVenueId(item);
  if (!id) return readDayRoute();
  const current = readDayRoute();
  if (isInDayRoute(id, current, item.slug)) {
    // Prefer removing by stored id when present.
    const existing = current.venues.find((v) => sameDayRouteVenue(v, { id, slug: item.slug }));
    return removeFromDayRoute(existing?.id || id);
  }
  return addToDayRoute({ ...item, id });
}

/** Parse legacy `?day=id1,slug2` or title share (`t:Эрмитаж|t:Петропавловка`) into tokens. */
export function parseDayRouteQueryParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let decoded = String(raw);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    decoded = String(raw);
  }
  const sep = decoded.includes('|') ? '|' : ',';
  const parts = decoded
    .split(sep)
    .map((part) => part.trim())
    .filter(Boolean);
  // Legacy day= deduped locators; new items= keeps order with times via parseDayRouteItemsParam.
  return [...new Set(parts)].slice(0, DAY_ROUTE_MAX);
}

export function isDayRouteShareTextToken(token: string): boolean {
  return String(token || '')
    .trim()
    .toLowerCase()
    .startsWith(DAY_ROUTE_SHARE_TEXT_PREFIX);
}

export function dayRouteShareTextTitle(token: string): string {
  const raw = String(token || '').trim();
  if (!isDayRouteShareTextToken(raw)) return '';
  return raw.slice(DAY_ROUTE_SHARE_TEXT_PREFIX.length).trim();
}

/**
 * Encode one stop for viral `?items=` share.
 * Format: `{id}:{HHMM|free}` - event id preferred, else venue slug/id.
 */
export function encodeDayRouteItemToken(venue: DayRouteVenueItem): string {
  if (isTextDayRouteStop(venue)) {
    // Text stops: keep stable local id (no catalog resolve); friend hydrates as text title.
    const title = venue.title.trim().replace(/[,|:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title) return '';
    return `${DAY_ROUTE_SHARE_TEXT_PREFIX}${title}:free`;
  }
  const eventKeyRaw = String(venue.eventId || venue.eventSlug || '').trim();
  const eventKey =
    eventKeyRaw && !isDayRouteVenueAsEventKey(eventKeyRaw, venue) ? eventKeyRaw : '';
  const locator = eventKey || String(venue.slug || venue.id || '').trim();
  if (!locator) return '';
  const time = encodeDayRouteShareTime(venue);
  return `${locator}:${time}`;
}

/** HHMM from startsAt / sessionLabel, or `free`. */
export function encodeDayRouteShareTime(
  venue: Pick<DayRouteVenueItem, 'startsAt' | 'sessionLabel'>,
): string {
  const fromIso = startsAtToHHMM(venue.startsAt);
  if (fromIso) return fromIso;
  const fromLabel = sessionLabelToHHMM(venue.sessionLabel);
  if (fromLabel) return fromLabel;
  return 'free';
}

function startsAtToHHMM(startsAt: string | null | undefined): string | null {
  const raw = String(startsAt || '').trim();
  if (!raw) return null;
  // Already HHMM
  if (/^\d{3,4}$/.test(raw)) return raw.padStart(4, '0');
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}${mm}`;
  }
  return sessionLabelToHHMM(raw);
}

function sessionLabelToHHMM(label: string | null | undefined): string | null {
  const raw = String(label || '').trim();
  if (!raw) return null;
  const match = raw.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (!match) return null;
  return `${match[1]!.padStart(2, '0')}${match[2]}`;
}

/** Human `14:00` from HHMM token. */
export function formatDayRouteHHMM(hhmm: string | null | undefined): string | null {
  const raw = String(hhmm || '').trim();
  if (!raw || raw.toLowerCase() === 'free') return null;
  const padded = raw.padStart(4, '0');
  if (!/^\d{4}$/.test(padded)) return null;
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

export type DayRouteItemToken = {
  id: string;
  time: string; // HHMM or free
  isText: boolean;
  isFree: boolean;
};

/** Parse `items=341:1400,892:free,115:1830`. */
export function parseDayRouteItemsParam(raw: string | null | undefined): DayRouteItemToken[] {
  if (!raw) return [];
  let decoded = String(raw);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    decoded = String(raw);
  }
  const out: DayRouteItemToken[] = [];
  for (const part of decoded.split(',')) {
    const token = String(part || '').trim();
    if (!token) continue;
    const colon = token.lastIndexOf(':');
    let id = token;
    let time = 'free';
    if (colon > 0) {
      id = token.slice(0, colon).trim();
      time = token.slice(colon + 1).trim() || 'free';
    }
    if (!id) continue;
    const isText = isDayRouteShareTextToken(id) || id.toLowerCase().startsWith(DAY_ROUTE_SHARE_TEXT_PREFIX);
    const timeNorm = time.toLowerCase() === 'free' ? 'free' : time.replace(/\D/g, '').padStart(4, '0').slice(-4);
    out.push({
      id,
      time: timeNorm === 'free' || !/^\d{4}$/.test(timeNorm) ? 'free' : timeNorm,
      isText,
      isFree: timeNorm === 'free' || !/^\d{4}$/.test(timeNorm),
    });
    if (out.length >= DAY_ROUTE_MAX) break;
  }
  return out;
}

/** Catalog locators from items tokens (skip text). */
export function catalogLocatorsFromItemTokens(tokens: DayRouteItemToken[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.isText) continue;
    const id = token.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(0, DAY_ROUTE_MAX);
}

/**
 * Encode one stop for legacy `?day=` share (compat).
 * Catalog: `{slug|id}[@e:{eventSlug|eventId}][@ISO8601]`
 * Text: `t:Title`
 */
export function encodeDayRouteShareToken(venue: DayRouteVenueItem): string {
  if (isTextDayRouteStop(venue)) {
    return `${DAY_ROUTE_SHARE_TEXT_PREFIX}${venue.title.trim()}`;
  }
  const locator = String(venue.slug || venue.id || '').trim();
  if (!locator) return '';
  const parts = [locator];
  const eventKeyRaw = String(venue.eventSlug || venue.eventId || '').trim();
  const eventKey =
    eventKeyRaw && !isDayRouteVenueAsEventKey(eventKeyRaw, venue) ? eventKeyRaw : '';
  if (eventKey) parts.push(`${DAY_ROUTE_SHARE_EVENT_PREFIX}${eventKey}`);
  const startsAt = String(venue.startsAt || '').trim();
  if (startsAt) parts.push(startsAt);
  return parts.join('@');
}

/** Parse legacy share token into venue locator + optional event/time meta. */
export function parseDayRouteShareToken(token: string): DayRouteShareTokenMeta {
  const raw = String(token || '').trim();
  if (!raw) {
    return { locator: '', startsAt: null, eventSlug: null, eventId: null, isText: false };
  }
  if (isDayRouteShareTextToken(raw)) {
    return {
      locator: raw,
      startsAt: null,
      eventSlug: null,
      eventId: null,
      isText: true,
    };
  }
  const parts = raw.split('@').map((p) => p.trim()).filter(Boolean);
  const locator = parts[0] || '';
  let startsAt: string | null = null;
  let eventSlug: string | null = null;
  let eventId: string | null = null;
  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower.startsWith(DAY_ROUTE_SHARE_EVENT_PREFIX)) {
      const key = part.slice(DAY_ROUTE_SHARE_EVENT_PREFIX.length).trim();
      if (!key) continue;
      if (/^(event_|evt_)/i.test(key)) eventId = key;
      else eventSlug = key;
      continue;
    }
    startsAt = part;
  }
  return { locator, startsAt, eventSlug, eventId, isText: false };
}

/** Venue ids/slugs safe for `/api/day-route/matches` (strip @meta). */
export function catalogLocatorsFromShareTokens(tokens: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const meta = parseDayRouteShareToken(token);
    if (meta.isText || !meta.locator) continue;
    if (seen.has(meta.locator)) continue;
    seen.add(meta.locator);
    out.push(meta.locator);
  }
  return out.slice(0, DAY_ROUTE_MAX);
}

/** Human label from ISO startsAt (or pass-through if already a label). */
export function formatDayRouteStartsAtLabel(startsAt: string | null | undefined): string | null {
  const raw = String(startsAt || '').trim();
  if (!raw) return null;
  const hhmm = startsAtToHHMM(raw);
  if (hhmm && /^\d{4}$/.test(hhmm) && Number.isNaN(new Date(raw).getTime())) {
    return formatDayRouteHHMM(hhmm);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return formatDayRouteHHMM(hhmm) || raw;
  }
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return formatDayRouteHHMM(hhmm) || raw;
  }
}

/**
 * Apply share @e: / @time meta onto resolved venues (legacy day=).
 */
export function applyShareMetaToVenues(
  venues: DayRouteVenueItem[],
  tokens: string[],
): DayRouteVenueItem[] {
  const metas = tokens.map(parseDayRouteShareToken).filter((m) => !m.isText && m.locator);
  if (!metas.length) return venues;

  const remaining = [...venues];
  const ordered: DayRouteVenueItem[] = [];
  for (const meta of metas) {
    const idx = remaining.findIndex(
      (v) =>
        String(v.slug || '').trim() === meta.locator || String(v.id || '').trim() === meta.locator,
    );
    const base = idx >= 0 ? remaining.splice(idx, 1)[0]! : null;
    if (!base) continue;
    const next: DayRouteVenueItem = { ...base };
    if (meta.eventSlug) next.eventSlug = meta.eventSlug;
    if (meta.eventId) next.eventId = meta.eventId;
    if (meta.startsAt) {
      next.startsAt = meta.startsAt;
      next.sessionLabel = formatDayRouteStartsAtLabel(meta.startsAt) || next.sessionLabel || null;
    }
    ordered.push(next);
  }
  return [...ordered, ...remaining].slice(0, DAY_ROUTE_MAX);
}

/** Apply `items=` times/event ids onto resolved venues (order by token). */
export function applyItemTokensToVenues(
  venues: DayRouteVenueItem[],
  tokens: DayRouteItemToken[],
): DayRouteVenueItem[] {
  if (!tokens.length) return venues;
  const remaining = [...venues];
  const ordered: DayRouteVenueItem[] = [];

  for (const token of tokens) {
    if (token.isText) {
      const title = dayRouteShareTextTitle(token.id) || token.id.replace(/^t:/i, '').trim();
      if (!title) continue;
      ordered.push({
        id: createTextDayRouteStopId(),
        title,
        slug: null,
        href: null,
        imageUrl: null,
      });
      continue;
    }

    const idx = remaining.findIndex((v) => {
      const ids = [
        String(v.id || '').trim(),
        String(v.slug || '').trim(),
        String(v.eventId || '').trim(),
        String(v.eventSlug || '').trim(),
      ].filter(Boolean);
      return ids.includes(token.id);
    });
    const base =
      idx >= 0
        ? remaining.splice(idx, 1)[0]!
        : ({
            id: token.id,
            title: token.id,
            slug: token.id,
          } as DayRouteVenueItem);

    const next: DayRouteVenueItem = { ...base };
    // Token id may be event id/slug - keep on item for ticket CTA.
    if (token.id && (next.eventId || next.eventSlug || !next.slug || next.id === token.id)) {
      if (/^(event_|evt_)/i.test(token.id) || (!next.eventId && token.time !== 'free')) {
        if (/^(event_|evt_)/i.test(token.id)) next.eventId = token.id;
        else if (!next.eventSlug && !next.eventId) {
          // Ambiguous compact id - treat as event when timed.
          if (!token.isFree) next.eventId = next.eventId || token.id;
        }
      }
    }
    if (!token.isFree) {
      const label = formatDayRouteHHMM(token.time);
      next.sessionLabel = label || next.sessionLabel || null;
      // Synthetic ISO today+time for persistence (date not in share URL).
      if (label) {
        const now = new Date();
        const hh = Number(token.time.slice(0, 2));
        const mm = Number(token.time.slice(2));
        now.setHours(hh, mm, 0, 0);
        next.startsAt = now.toISOString();
      }
    }
    ordered.push(next);
  }
  return ordered.slice(0, DAY_ROUTE_MAX);
}

/**
 * Canonical viral share path (long, no DB): `/my-day?city=spb&items=341:1400,892:free`.
 * Legacy `?day=` still parsed on open; builders emit city+items.
 * Share UX prefers short `/d/{code}` via POST `/api/day-route/share` (fallback = this path).
 */
export function buildDayRouteSharePath(
  venues: DayRouteVenueItem[],
  options?: { citySlug?: string | null; fromName?: string | null },
): string {
  const items = venues
    .map((venue) => encodeDayRouteItemToken(venue))
    .filter(Boolean)
    .slice(0, DAY_ROUTE_MAX);
  if (!items.length) return '/my-day';
  const params = new URLSearchParams();
  const city = String(options?.citySlug || dayRouteDominantCitySlug(venues) || '').trim();
  if (city) params.set('city', city);
  params.set('items', items.join(','));
  const from = String(options?.fromName || '').trim();
  if (from) params.set('from', from.slice(0, 40));
  return `/my-day?${params.toString()}`;
}

/** Public short-link path format: `/d/x7k2m9a`. */
export function buildDayRouteShortPath(code: string): string {
  const normalized = String(code || '')
    .trim()
    .toLowerCase();
  return normalized ? `/d/${encodeURIComponent(normalized)}` : '/my-day';
}

/**
 * Create short share code for current long path payload.
 * Returns null on network/API failure (caller falls back to long URL).
 */
export async function createDayRouteShortShare(input: {
  citySlug?: string | null;
  items: string;
  fromName?: string | null;
}): Promise<{ code: string; path: string; longPath?: string } | null> {
  const items = String(input.items || '').trim();
  if (!items) return null;
  try {
    const res = await fetch('/api/day-route/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: input.citySlug || undefined,
        items,
        from: input.fromName || undefined,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      code?: string;
      path?: string;
      longPath?: string;
    };
    if (!data?.ok || !data.code || !data.path) return null;
    return { code: data.code, path: data.path, longPath: data.longPath };
  } catch {
    return null;
  }
}

/** First timed stop as `14:00` for share copy. */
export function dayRouteFirstTimedLabel(venues: DayRouteVenueItem[]): string | null {
  for (const venue of venues) {
    const hhmm = encodeDayRouteShareTime(venue);
    if (hhmm !== 'free') return formatDayRouteHHMM(hhmm);
  }
  return null;
}

/**
 * Messenger/copy share text. Context lives here (no on-page «shared with you» banner).
 * Hyphen only, no em-dash.
 */
export function buildDayRouteShareMessage(input: {
  cityTitle?: string | null;
  shareUrl: string;
  venues: DayRouteVenueItem[];
}): string {
  const city = String(input.cityTitle || '').trim() || 'городе';
  const time = dayRouteFirstTimedLabel(input.venues);
  const timePart = time ? ` Там есть точка в ${time}.` : '';
  return `Привет! Тебе поделились планом на день в ${city} на Дайбилет: ${input.shareUrl}. Открой ссылку - маршрут уже в «Мой день», можно править под себя.${timePart}`;
}

export function buildTelegramShareUrl(text: string, url?: string): string {
  const params = new URLSearchParams();
  params.set('url', url || text);
  if (url) params.set('text', text);
  else params.set('text', text);
  // Prefer text-only when URL already inside message.
  if (url && text.includes(url)) {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.replace(url, '').trim())}`;
  }
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Official MAX messenger share deep-link: https://max.ru/:share?text= */
export function buildMaxShareUrl(text: string): string {
  return `https://max.ru/:share?text=${encodeURIComponent(text)}`;
}

/** Hydrate free-text share tokens (`t:Title`) into local planner stops. */
export function hydrateTextStopsFromShareTokens(tokens: string[]): DayRouteState {
  const titles = tokens
    .map((token) => dayRouteShareTextTitle(token))
    .filter(Boolean)
    .slice(0, DAY_ROUTE_MAX);
  if (!titles.length) return readDayRoute();
  const current = readDayRoute();
  if (current.venues.length >= titles.length) {
    const currentTitles = new Set(current.venues.map((v) => v.title.trim().toLowerCase()));
    if (titles.every((title) => currentTitles.has(title.toLowerCase()))) {
      return current;
    }
  }
  let next = current;
  for (const title of titles) {
    if (next.venues.length >= DAY_ROUTE_MAX) break;
    const already = next.venues.some((v) => v.title.trim().toLowerCase() === title.toLowerCase());
    if (already) continue;
    next = addTextStopToDayRoute({ title });
  }
  return next;
}

/** Replace localStorage day route from resolved venue list (share hydrate). */
export function replaceDayRouteFromVenues(
  venues: DayRouteVenueItem[],
  cityId: string | null = null,
): DayRouteState {
  const normalized = venues
    .map((item) => {
      const id = normalizeDayRouteVenueId(item);
      if (!id) return null;
      return sanitizeDayRouteTicketFields({ ...item, id, ...sanitizeStoredCoords(item) });
    })
    .filter((item): item is DayRouteVenueItem => Boolean(item))
    .slice(0, DAY_ROUTE_MAX);
  const next: DayRouteState = {
    cityId: cityId || normalized[0]?.cityId || null,
    venues: normalized,
  };
  writeDayRoute(next);
  return next;
}

/**
 * Share hydrate without wiping points the guest already added beyond the share set.
 * If local already contains every shared venue and has more (or equal) points, keep local.
 */
export function hydrateDayRouteFromShare(
  shareVenues: DayRouteVenueItem[],
  cityId: string | null = null,
): DayRouteState {
  const shared = shareVenues.slice(0, DAY_ROUTE_MAX);
  if (!shared.length) return readDayRoute();

  const current = readDayRoute();
  const shareIds = new Set(shared.map((v) => v.id));
  const localHasAllShare =
    shareIds.size > 0 && [...shareIds].every((id) => current.venues.some((v) => v.id === id));

  if (localHasAllShare && current.venues.length >= shared.length) {
    return current;
  }

  return replaceDayRouteFromVenues(shared, cityId);
}

/** Pure score: 3*STOP + 2*start + 1*nearby. */
export function dayRouteMatchScore(covered: {
  stop?: string[];
  start?: string[];
  nearby?: string[];
}): number {
  const stop = covered.stop?.length ?? 0;
  const start = covered.start?.length ?? 0;
  const nearby = covered.nearby?.length ?? 0;
  return 3 * stop + 2 * start + 1 * nearby;
}

/** Full coverage count for UI «N из M» = STOP + start (nearby не полное покрытие). */
export function dayRouteFullCoveredCount(covered: {
  stop?: string[];
  start?: string[];
}): number {
  return (covered.stop?.length ?? 0) + (covered.start?.length ?? 0);
}

/** Normalize city label for equality (catalog cityId + text-stop title must agree). */
export function normalizeDayRouteCityTitle(city: string | null | undefined): string | null {
  const title = String(city || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    // «Санкт-Петербург» vs «Санкт Петербург» / extra spaces
    .replace(/[\s\-]+/g, ' ')
    .trim();
  return title || null;
}

/**
 * Stable city key for mixed-city detection.
 * Prefer normalized title when present so catalog venues (`cityId` set) and text stops
 * (`cityId` null, same displayed city) are not flagged as mixed.
 */
function venueCityKey(
  venue: Pick<DayRouteVenueItem, 'cityId' | 'city'>,
  idToTitle: Map<string, string>,
): string | null {
  const title = normalizeDayRouteCityTitle(venue.city);
  if (title) return `title:${title}`;
  const cityId = String(venue.cityId || '').trim();
  if (!cityId) return null;
  const knownTitle = idToTitle.get(cityId);
  if (knownTitle) return `title:${knownTitle}`;
  return `id:${cityId}`;
}

/** True if selected points span more than one city (ids or titles). */
export function dayRouteHasMixedCities(venues: DayRouteVenueItem[]): boolean {
  // Learn cityId → title from venues that carry both, so id-only rows can unify.
  const idToTitle = new Map<string, string>();
  for (const venue of venues) {
    const cityId = String(venue.cityId || '').trim();
    const title = normalizeDayRouteCityTitle(venue.city);
    if (cityId && title) idToTitle.set(cityId, title);
  }

  const keys = new Set<string>();
  for (const venue of venues) {
    const key = venueCityKey(venue, idToTitle);
    if (key) keys.add(key);
  }
  return keys.size > 1;
}

/** Dominant city slug for afisha CTA (most frequent citySlug among points). */
export function dayRouteDominantCitySlug(venues: DayRouteVenueItem[]): string | null {
  const counts = new Map<string, number>();
  for (const venue of venues) {
    const slug = String(venue.citySlug || '').trim();
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [slug, count] of counts) {
    if (count > bestCount) {
      best = slug;
      bestCount = count;
    }
  }
  return best;
}

export type YandexRouteMode = 'pd' | 'auto' | 'mt';

/**
 * Multi-stop Yandex Maps deep-link (route, not pins-only).
 * Format: https://yandex.ru/maps/?rtext=lat,lng~lat,lng~…&rtt=pd
 * Coords are lat,lng (unlike pt= which is lng,lat). Supports 2-8 waypoints.
 */
export function buildYandexMultiStopRouteUrl(
  points: Array<DayRouteCoords | null | undefined>,
  mode: YandexRouteMode = 'pd',
): string | null {
  const coords: DayRouteCoords[] = [];
  for (const point of points) {
    if (!point) continue;
    if (!isValidCoordinatePair(point.latitude, point.longitude)) continue;
    coords.push({ latitude: point.latitude, longitude: point.longitude });
  }
  if (coords.length < 2) return null;
  // rtext uses lat,lng pairs joined by ~ (do not encode commas/tildes).
  const rtext = coords
    .slice(0, DAY_ROUTE_MAX)
    .map((c) => `${c.latitude},${c.longitude}`)
    .join('~');
  return `https://yandex.ru/maps/?rtext=${rtext}&rtt=${mode}`;
}

/**
 * Nearest-neighbor TSP from the first point that has coords.
 * Venues without coords keep relative order and append after optimized ones.
 */
export function optimizeDayRouteNearestNeighbor(
  venues: DayRouteVenueItem[],
  coordsById: Map<string, DayRouteCoords>,
): DayRouteVenueItem[] {
  if (venues.length < 2) return [...venues];

  const withCoords: DayRouteVenueItem[] = [];
  const withoutCoords: DayRouteVenueItem[] = [];
  for (const venue of venues) {
    if (lookupDayRouteCoords(venue, coordsById)) withCoords.push(venue);
    else withoutCoords.push(venue);
  }
  if (withCoords.length < 2) return [...venues];

  const remaining = [...withCoords];
  const ordered: DayRouteVenueItem[] = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1]!;
    const lastCoord = lookupDayRouteCoords(last, coordsById);
    if (!lastCoord) break;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i]!;
      const c = lookupDayRouteCoords(candidate, coordsById);
      if (!c) continue;
      const d = haversineMeters(lastCoord.latitude, lastCoord.longitude, c.latitude, c.longitude);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]!);
  }
  return [...ordered, ...withoutCoords];
}

/** Consecutive segment distances (meters) for UI hints; null when either endpoint lacks coords. */
export function dayRouteSegmentMeters(
  venues: DayRouteVenueItem[],
  coordsById: Map<string, DayRouteCoords>,
): Array<number | null> {
  const segments: Array<number | null> = [];
  for (let i = 0; i < venues.length - 1; i += 1) {
    const a = lookupDayRouteCoords(venues[i]!, coordsById);
    const b = lookupDayRouteCoords(venues[i + 1]!, coordsById);
    if (
      a &&
      b &&
      isValidCoordinatePair(a.latitude, a.longitude) &&
      isValidCoordinatePair(b.latitude, b.longitude)
    ) {
      segments.push(haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude));
    } else {
      segments.push(null);
    }
  }
  return segments;
}

export function lookupDayRouteCoords(
  venue: Pick<DayRouteVenueItem, 'id' | 'slug' | 'latitude' | 'longitude'>,
  coordsById: Map<string, DayRouteCoords>,
): DayRouteCoords | null {
  const id = String(venue.id || '').trim();
  const slug = String(venue.slug || '').trim();
  // Prefer slug: matches payload often keys the canonical slug after enrich,
  // while localStorage may still hold a temporary id (e.g. slug-as-id).
  const fromMap =
    (slug ? coordsById.get(slug) : undefined) || (id ? coordsById.get(id) : undefined);
  if (fromMap && isValidCoordinatePair(fromMap.latitude, fromMap.longitude)) return fromMap;
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  if (isValidCoordinatePair(lat, lng)) return { latitude: lat, longitude: lng };
  return null;
}

/** Placeholder titles written by share hydrate before catalog resolve. */
export const DAY_ROUTE_EVENT_STUB_TITLE = 'Событие из маршрута';
export const DAY_ROUTE_PLACE_STUB_TITLE = 'Место из маршрута';

export function isDayRoutePlaceholderTitle(title: string | null | undefined): boolean {
  const raw = String(title || '').trim();
  if (!raw) return true;
  return raw === DAY_ROUTE_EVENT_STUB_TITLE || raw === DAY_ROUTE_PLACE_STUB_TITLE;
}

type DayRouteCoordSource = {
  id: string;
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  title?: string | null;
  cityTitle?: string | null;
  city?: string | null;
  cityId?: string | null;
  citySlug?: string | null;
  eventId?: string | null;
  eventSlug?: string | null;
  heroImageUrl?: string | null;
  imageUrl?: string | null;
};

/** Build id+slug → coords from route items and/or matches payload venues. */
export function buildDayRouteCoordsMap(
  routeVenues: DayRouteVenueItem[],
  payloadVenues: DayRouteCoordSource[] = [],
): Map<string, DayRouteCoords> {
  const map = new Map<string, DayRouteCoords>();
  const put = (source: DayRouteCoordSource) => {
    const lat = Number(source.latitude);
    const lng = Number(source.longitude);
    if (!isValidCoordinatePair(lat, lng)) return;
    const coords = { latitude: lat, longitude: lng };
    const id = String(source.id || '').trim();
    const slug = String(source.slug || '').trim();
    const eventId = String(source.eventId || '').trim();
    const eventSlug = String(source.eventSlug || '').trim();
    if (id) map.set(id, coords);
    if (slug) map.set(slug, coords);
    if (eventId) map.set(eventId, coords);
    if (eventSlug) map.set(eventSlug, coords);
  };
  for (const venue of routeVenues) put(venue);
  for (const venue of payloadVenues) put(venue);
  return map;
}

/** Merge coords/address (and canonical id/slug) from matches payload into local day-route storage. */
export function enrichDayRouteFromMatchVenues(payloadVenues: DayRouteCoordSource[]): DayRouteState {
  const current = readDayRoute();
  if (!current.venues.length || !payloadVenues.length) return current;
  let changed = false;
  const nextVenues = current.venues.map((item) => {
    const match = payloadVenues.find((v) => {
      const ids = [v.id, v.slug, v.eventId, v.eventSlug].map((x) => String(x || '').trim()).filter(Boolean);
      const itemIds = [item.id, item.slug, item.eventId, item.eventSlug]
        .map((x) => String(x || '').trim())
        .filter(Boolean);
      return itemIds.some((id) => ids.includes(id));
    });
    if (!match) return item;
    const lat = Number(match.latitude);
    const lng = Number(match.longitude);
    const next: DayRouteVenueItem = {
      ...item,
      id: match.id || item.id,
      slug: match.slug ?? item.slug,
    };
    if (isValidCoordinatePair(lat, lng)) {
      next.latitude = lat;
      next.longitude = lng;
    }
    const matchAddress = String(match.address || '').trim();
    const existingAddress = String(item.address || '').trim();
    // Prefer fuller catalog address (e.g. street+house over street-only leftover).
    if (matchAddress && (!existingAddress || matchAddress.length > existingAddress.length)) {
      next.address = matchAddress;
    }
    const stubTitle =
      isDayRoutePlaceholderTitle(item.title) || item.title === item.id || item.title === item.eventId;
    if (match.title && stubTitle) next.title = match.title;
    if (match.eventId && !item.eventId) next.eventId = match.eventId;
    if (match.eventSlug && !item.eventSlug) next.eventSlug = match.eventSlug;
    const matchImage = String(match.heroImageUrl || match.imageUrl || '').trim();
    if (matchImage && !String(item.imageUrl || '').trim()) next.imageUrl = matchImage;
    // Rebuild ticket CTA when event meta arrived (drop stub /events/{id} leftovers).
    if (match.eventId || match.eventSlug || stubTitle) {
      next.ticketUrl = null;
    }
    const matchCity = String(match.cityTitle || match.city || '').trim();
    if (matchCity && !String(item.city || '').trim()) next.city = matchCity;
    if (match.cityId && !item.cityId) next.cityId = match.cityId;
    if (match.citySlug && !item.citySlug) next.citySlug = match.citySlug;
    const cleaned = sanitizeDayRouteTicketFields(next);
    cleaned.ticketUrl = resolveDayRouteTicketUrl(cleaned);
    if (
      cleaned.id !== item.id ||
      cleaned.slug !== item.slug ||
      cleaned.latitude !== item.latitude ||
      cleaned.longitude !== item.longitude ||
      cleaned.address !== item.address ||
      cleaned.title !== item.title ||
      cleaned.eventId !== item.eventId ||
      cleaned.eventSlug !== item.eventSlug ||
      cleaned.imageUrl !== item.imageUrl ||
      cleaned.ticketUrl !== item.ticketUrl ||
      cleaned.city !== item.city ||
      cleaned.cityId !== item.cityId ||
      cleaned.citySlug !== item.citySlug
    ) {
      changed = true;
    }
    return cleaned;
  });
  if (!changed) return current;
  const next = { ...current, venues: nextVenues };
  writeDayRoute(next);
  return next;
}

export function formatDayRouteDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `${Math.round(meters)} м`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} км` : `${Math.round(km)} км`;
}

/** Segment line for UI / print: distance + ETA by travel mode. */
export function formatDayRouteSegmentHint(
  meters: number,
  mode: DayRouteTravelMode = 'walk',
): string {
  if (!Number.isFinite(meters) || meters <= 0) return '';
  const dist = formatDayRouteDistance(meters);
  const mins = estimateDayRouteTravelMinutes(meters, mode);
  const time = formatDayRouteTravelMinutes(mins);
  const modeLabel = mode === 'auto' ? 'на авто' : 'пешком';
  if (dist && time) return `${dist} · ~${time} ${modeLabel}`;
  return dist;
}

/** Sum consecutive segment meters (null segments skipped). */
export function dayRouteTotalDistanceMeters(segments: Array<number | null | undefined>): number {
  let total = 0;
  for (const segment of segments) {
    if (typeof segment === 'number' && Number.isFinite(segment) && segment > 0) total += segment;
  }
  return total;
}

/** MVP ETA from haversine total × mode speed (no routing API). */
export function estimateDayRouteTravelMinutes(
  meters: number,
  mode: DayRouteTravelMode = 'walk',
): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  const speed = DAY_ROUTE_TRAVEL_M_PER_MIN[mode] || DAY_ROUTE_TRAVEL_M_PER_MIN.walk;
  return Math.max(1, Math.round(meters / speed));
}

export function formatDayRouteTravelMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** Venue/location keys that must never be treated as event slug/id. */
export function dayRouteVenueIdentityKeys(
  venue: Pick<DayRouteVenueItem, 'id' | 'slug'>,
): Set<string> {
  const keys = new Set<string>();
  const push = (value: string | null | undefined) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return;
    keys.add(raw);
    keys.add(decodeURIComponentSafe(raw));
  };
  push(venue.slug);
  push(venue.id);
  const bareId = String(venue.id || '')
    .trim()
    .replace(/^venue_/i, '');
  push(bareId);
  return keys;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** True when key is the stop's venue/location identity (not a real event). */
export function isDayRouteVenueAsEventKey(
  key: string | null | undefined,
  venue: Pick<DayRouteVenueItem, 'id' | 'slug'>,
): boolean {
  const raw = String(key || '').trim();
  if (!raw) return false;
  if (/^(event_|evt_)/i.test(raw)) return false;
  const lower = raw.toLowerCase();
  const keys = dayRouteVenueIdentityKeys(venue);
  return keys.has(lower) || keys.has(decodeURIComponentSafe(lower));
}

/** Extract `/events/{slug}` path segment from absolute or relative ticket URL. */
export function dayRouteEventPathSlug(url: string | null | undefined): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    const path = /^https?:\/\//i.test(raw) ? new URL(raw).pathname : raw.split(/[?#]/)[0] || '';
    const match = path.match(/^\/events\/([^/]+)\/?$/i);
    if (!match?.[1]) return null;
    return decodeURIComponentSafe(match[1]).trim() || null;
  } catch {
    return null;
  }
}

/** True when ticketUrl is `/events/{venueSlug}` (404 on live - venue is not an event). */
export function isDayRouteVenueAsEventTicketUrl(
  url: string | null | undefined,
  venue: Pick<DayRouteVenueItem, 'id' | 'slug'>,
): boolean {
  const pathSlug = dayRouteEventPathSlug(url);
  if (!pathSlug) return false;
  return isDayRouteVenueAsEventKey(pathSlug, venue);
}

/** Venue program page for ticket discovery when real event page is missing. */
export function dayRouteVenueProgramUrl(
  venue: Pick<DayRouteVenueItem, 'id' | 'slug' | 'title' | 'href'>,
): string | null {
  const href = String(venue.href || '').trim();
  if (href && (/^\/venues\//i.test(href) || /^\/locations\//i.test(href))) return href;
  const slug = String(venue.slug || '').trim();
  if (!slug) return null;
  return venueHref({
    id: String(venue.id || slug),
    slug,
    name: String(venue.title || slug),
  });
}

/**
 * Strip / rewrite commerce fields that used venue slug as event slug/id/URL.
 * Bad `/events/{venueSlug}` → venue program `/venues|{locations}/{slug}` when possible.
 */
export function sanitizeDayRouteTicketFields(venue: DayRouteVenueItem): DayRouteVenueItem {
  let eventId = String(venue.eventId || '').trim() || null;
  let eventSlug = String(venue.eventSlug || '').trim() || null;
  let ticketUrl = String(venue.ticketUrl || '').trim() || null;

  const hadVenueAsEvent =
    Boolean(eventId && isDayRouteVenueAsEventKey(eventId, venue)) ||
    Boolean(eventSlug && isDayRouteVenueAsEventKey(eventSlug, venue)) ||
    Boolean(ticketUrl && isDayRouteVenueAsEventTicketUrl(ticketUrl, venue));

  if (eventId && isDayRouteVenueAsEventKey(eventId, venue)) eventId = null;
  if (eventSlug && isDayRouteVenueAsEventKey(eventSlug, venue)) eventSlug = null;
  if (ticketUrl && isDayRouteVenueAsEventTicketUrl(ticketUrl, venue)) ticketUrl = null;

  if (hadVenueAsEvent && !ticketUrl && !eventId && !eventSlug) {
    ticketUrl = dayRouteVenueProgramUrl(venue);
  }

  if (
    eventId === (venue.eventId ?? null) &&
    eventSlug === (venue.eventSlug ?? null) &&
    ticketUrl === (venue.ticketUrl ?? null)
  ) {
    return venue;
  }

  return {
    ...venue,
    eventId,
    eventSlug,
    ticketUrl,
  };
}

/**
 * Prefer stored ticketUrl; else real event page from eventSlug/eventId.
 * Never invent `/events/{venueSlug}` - fall back to venue program or hide CTA.
 */
export function resolveDayRouteTicketUrl(
  venue: Pick<DayRouteVenueItem, 'ticketUrl' | 'eventId' | 'eventSlug' | 'title' | 'slug' | 'id' | 'href'>,
): string | null {
  const stored = String(venue.ticketUrl || '').trim();
  if (stored) {
    if (/^https?:\/\//i.test(stored)) return stored;
    if (/^\/venues\//i.test(stored) || /^\/locations\//i.test(stored)) return stored;
    if (isDayRouteVenueAsEventTicketUrl(stored, venue)) {
      return dayRouteVenueProgramUrl(venue);
    }
    return stored;
  }

  const rawSlug = String(venue.eventSlug || '').trim();
  const rawId = String(venue.eventId || '').trim();
  const slug = rawSlug && !isDayRouteVenueAsEventKey(rawSlug, venue) ? rawSlug : '';
  const id = rawId && !isDayRouteVenueAsEventKey(rawId, venue) ? rawId : '';
  if (!slug && !id) return null;

  const href = eventHref({
    id: id || slug,
    slug: slug || null,
    title: venue.title || 'event',
  });
  if (isDayRouteVenueAsEventTicketUrl(href, venue)) {
    return dayRouteVenueProgramUrl(venue);
  }
  return href;
}
