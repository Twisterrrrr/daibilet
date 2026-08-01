/**
 * Guest «Собери свой день» bucket (localStorage). Separate from favorites wishlist.
 */

import { haversineMeters, isValidCoordinatePair } from './day-route-score';

export const DAY_ROUTE_STORAGE_KEY = 'daibilet:dayRoute';
export const DAY_ROUTE_CHANGED_EVENT = 'daibilet:day-route-changed';

export const DAY_ROUTE_MIN = 2;
export const DAY_ROUTE_MAX = 8;

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
  /** Optional free-text address / note for planner stops (not from catalog). */
  note?: string | null;
  /** Optional: added from event card/page (backward compatible - older storage omits these). */
  eventId?: string | null;
  eventSlug?: string | null;
  /** Human label for session time, e.g. «сб, 14:00». */
  sessionLabel?: string | null;
  startsAt?: string | null;
};

/** Synthetic planner stops (typed on /my-day) - no catalog venue id required. */
export const DAY_ROUTE_TEXT_ID_PREFIX = 'text_';
export const DAY_ROUTE_SHARE_TEXT_PREFIX = 't:';

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
    .replace(/;/g, ',')
    .match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (fromPair) {
    const latitude = Number(fromPair[1]);
    const longitude = Number(fromPair[2]);
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
  // Hard cap = DAY_ROUTE_MAX (8). DAY_ROUTE_MIN (2) is only a UX "day is ready" hint.
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
        const next: DayRouteVenueItem = {
          ...item,
          id,
          title: item.title,
          slug: item.slug != null ? String(item.slug).trim() || null : null,
          ...sanitizeStoredCoords(item),
        };
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
    const { imageUrl: _drop, ...rest } = venue;
    return rest;
  });
  return { cityId: state.cityId, venues };
}

function trySetDayRouteRaw(raw: string): boolean {
  try {
    localStorage.setItem(DAY_ROUTE_STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

export function writeDayRoute(state: DayRouteState): boolean {
  if (typeof window === 'undefined') return false;
  // Full payload first; on quota retry without imageUrl (owner «Не удалось добавить точку»).
  const attempts = [dayRoutePersistPayload(state, false), dayRoutePersistPayload(state, true)];
  let raw: string | null = null;
  let normalized: DayRouteState | null = null;
  for (const attempt of attempts) {
    const nextRaw = JSON.stringify({
      cityId: attempt.cityId,
      venues: attempt.venues,
    });
    if (!trySetDayRouteRaw(nextRaw)) continue;
    raw = nextRaw;
    normalized = attempt;
    break;
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
  if (coords.latitude != null && coords.longitude != null) {
    next.latitude = coords.latitude;
    next.longitude = coords.longitude;
  }
  if (incoming.eventId) next.eventId = incoming.eventId;
  if (incoming.eventSlug) next.eventSlug = incoming.eventSlug;
  if (incoming.sessionLabel) next.sessionLabel = incoming.sessionLabel;
  if (incoming.startsAt) next.startsAt = incoming.startsAt;
  if (incoming.note != null) next.note = incoming.note;
  return next;
}

export function addToDayRoute(item: DayRouteVenueItem): DayRouteState {
  // Always mutate from LS truth, not a possibly-stale snapshotCache identity.
  const current = readDayRouteFresh();
  const id = normalizeDayRouteVenueId(item);
  if (!id) return current;
  const coords = sanitizeStoredCoords(item);
  const normalized: DayRouteVenueItem = { ...item, id, ...coords };

  const existingIdx = current.venues.findIndex((v) => sameDayRouteVenue(v, normalized));
  if (existingIdx >= 0) {
    const existing = current.venues[existingIdx]!;
    const merged = mergeDayRouteVenueFields(existing, normalized);
    const unchanged =
      merged.latitude === existing.latitude &&
      merged.longitude === existing.longitude &&
      merged.eventId === existing.eventId &&
      merged.eventSlug === existing.eventSlug &&
      merged.sessionLabel === existing.sessionLabel &&
      merged.startsAt === existing.startsAt &&
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

/** Parse `?day=id1,slug2` or title share (`t:Эрмитаж|t:Петропавловка`) into locators. */
export function parseDayRouteQueryParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let decoded = String(raw);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    decoded = String(raw);
  }
  const sep = decoded.includes('|') ? '|' : ',';
  return [
    ...new Set(
      decoded
        .split(sep)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].slice(0, DAY_ROUTE_MAX);
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

/** Build absolute or relative share URL for current day route. */
export function buildDayRouteSharePath(venues: DayRouteVenueItem[]): string {
  const hasText = venues.some((venue) => isTextDayRouteStop(venue));
  const tokens = venues
    .map((venue) => {
      if (isTextDayRouteStop(venue)) {
        // Titles may contain commas - use `|` join when any text stop is present.
        return `${DAY_ROUTE_SHARE_TEXT_PREFIX}${venue.title.trim()}`;
      }
      return venue.slug || venue.id;
    })
    .filter(Boolean)
    .slice(0, DAY_ROUTE_MAX);
  if (!tokens.length) return '/my-day';
  const joined = hasText || tokens.some((t) => isDayRouteShareTextToken(t)) ? tokens.join('|') : tokens.join(',');
  return `/my-day?day=${encodeURIComponent(joined)}`;
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
      return { ...item, id, ...sanitizeStoredCoords(item) };
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

function venueCityKey(venue: Pick<DayRouteVenueItem, 'cityId' | 'city'>): string | null {
  if (venue.cityId) return `id:${venue.cityId}`;
  const title = String(venue.city || '')
    .trim()
    .toLowerCase();
  return title ? `title:${title}` : null;
}

/** True if selected points span more than one city (ids or titles). */
export function dayRouteHasMixedCities(venues: DayRouteVenueItem[]): boolean {
  const keys = new Set<string>();
  for (const venue of venues) {
    const key = venueCityKey(venue);
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

type DayRouteCoordSource = {
  id: string;
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
    if (id) map.set(id, coords);
    if (slug) map.set(slug, coords);
  };
  for (const venue of routeVenues) put(venue);
  for (const venue of payloadVenues) put(venue);
  return map;
}

/** Merge coords (and canonical id/slug) from matches payload into local day-route storage. */
export function enrichDayRouteFromMatchVenues(payloadVenues: DayRouteCoordSource[]): DayRouteState {
  const current = readDayRoute();
  if (!current.venues.length || !payloadVenues.length) return current;
  let changed = false;
  const nextVenues = current.venues.map((item) => {
    const match = payloadVenues.find(
      (v) =>
        (item.id && v.id && item.id === v.id) ||
        (item.slug && v.slug && item.slug === v.slug) ||
        (item.id && v.slug && item.id === v.slug) ||
        (item.slug && v.id && item.slug === v.id),
    );
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
    if (
      next.id !== item.id ||
      next.slug !== item.slug ||
      next.latitude !== item.latitude ||
      next.longitude !== item.longitude
    ) {
      changed = true;
    }
    return next;
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
