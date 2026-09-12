/**
 * «Мой день» - добор теплохода (multi-option water funnel).
 * Canon: Pier → Route → Slot → pin to day-route (eventId + time) → share.
 */

import { haversineMeters, isValidCoordinatePair } from './day-route-score';
import { eventHref, venueHref } from './routes';
import type { DayRouteVenueItem } from './day-route';

/** Display / dedupe clock for boat slots (SPB catalog = Europe/Moscow). */
const BOAT_SESSION_TZ = 'Europe/Moscow';

function formatBoatSlotClock(startsAt: string, fallback?: string | null): string | null {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) {
    const raw = String(fallback || '').trim();
    return raw || null;
  }
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BOAT_SESSION_TZ,
  }).format(date);
}

function boatSlotClockKey(startsAt: string): string | null {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return null;
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOAT_SESSION_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const time = formatBoatSlotClock(startsAt);
  return time ? `${day}|${time}` : null;
}

const BOAT_MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function isMinus3hSameEventPhantom(
  candidateStartsAt: string,
  candidateEventId: string,
  existing: Array<Pick<BoatSlotCandidate, 'startsAt' | 'eventId'>>,
): boolean {
  const eventId = String(candidateEventId || '').trim();
  if (!eventId) return false;
  const ms = Date.parse(candidateStartsAt);
  if (!Number.isFinite(ms)) return false;
  return existing.some((slot) => {
    if (String(slot.eventId || '').trim() !== eventId) return false;
    const other = Date.parse(slot.startsAt);
    return Number.isFinite(other) && (other === ms + BOAT_MSK_OFFSET_MS || ms === other + BOAT_MSK_OFFSET_MS);
  });
}

/** TicketsCloud widget page rejects `token=r:…` with HTTPForbidden/bad token. */
function sanitizeTicketscloudPurchaseUrl(url?: string | null): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (!/ticketscloud/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    const token = parsed.searchParams.get('token');
    if (token?.startsWith('r:')) parsed.searchParams.set('token', token.slice(2));
    if (parsed.hostname === 'ticketscloud.org') parsed.hostname = 'ticketscloud.com';
    return parsed.toString();
  } catch {
    return raw;
  }
}

/** Palace Embankment / central Neva - fallback when day-route has no coords. */
export const SPB_WATER_CENTER = { latitude: 59.9398, longitude: 30.3146 } as const;

export const BOAT_PIER_NEAR_M = 2500;
export const BOAT_WATERFRONT_HINT_M = 900;

/** Coords for published piers that still lack DB lat/lng (distance «~N м от маршрута»). */
const KNOWN_BOAT_PIER_COORDS: Array<{
  id?: string;
  slugIncludes?: string;
  textTest: (text: string) => boolean;
  latitude: number;
  longitude: number;
}> = [
  // scripts/backfill-missing-venue-coords.js - pier №4 / venue_681d44a7…
  {
    id: 'venue_681d44a7fc03029d63123730',
    slugIncludes: 'dvorcovaya-naberezhnaya-18',
    textTest: (text) => /дворцов/.test(text) && /\b18\b/.test(text),
    latitude: 59.9415,
    longitude: 30.3155,
  },
];

const BOAT_PIER_JUNK_NAME_RE =
  /будут известны позже|всем купившим|банкетн(?:ый|ого)\s+зал|arbat\s*hall|космос/i;

/** Normalize pier name/address for twin collapse (наб. vs наб, comma glue). */
export function normalizeBoatPierLabel(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[—–]/gu, '-')
    .replace(/\bнаб\.?\b/gi, 'набережная')
    .replace(/\bул\.?\b/gi, 'улица')
    .replace(/\bпр\.?\b/gi, 'проспект')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dedupe key: known pier patterns → normalized address/name → rounded coords → id.
 * Collapses «Университетская наб. 13» vs «Университетская наб., 13».
 */
export function boatPierDedupeKey(
  pier: Pick<BoatPierCandidate, 'id' | 'slug' | 'name' | 'address' | 'latitude' | 'longitude'>,
): string {
  const blob = normalizeBoatPierLabel(`${pier.name || ''} ${pier.address || ''}`);
  if (/дворцов/.test(blob) && /\b18\b/.test(blob)) return 'pier:dvortsovaya-18';
  if (/синопск/.test(blob) && /\b10\b/.test(blob)) return 'pier:sinopskaya-10';
  if (/фонтанк/.test(blob) && /\b53\b/.test(blob)) return 'pier:fontanka-53';
  if (/университетск/.test(blob) && /\b13\b/.test(blob)) return 'pier:universitetskaya-13';
  if (/университетск/.test(blob) && /\b17\b/.test(blob)) return 'pier:universitetskaya-17';

  const addressKey = normalizeBoatPierLabel(pier.address);
  const nameKey = normalizeBoatPierLabel(pier.name);
  if (addressKey.length >= 8) return `addr:${addressKey}`;
  if (nameKey.length >= 8) return `name:${nameKey}`;

  const lat = Number(pier.latitude);
  const lng = Number(pier.longitude);
  if (isValidCoordinatePair(lat, lng)) {
    return `geo:${lat.toFixed(4)},${lng.toFixed(4)}`;
  }
  const slug = String(pier.slug || '').trim().toLowerCase();
  if (slug) return `slug:${slug}`;
  return `id:${String(pier.id || '').trim()}`;
}

/** Fill missing lat/lng from known SPB pier stubs so distance always computes when we know the place. */
export function enrichBoatPierCoords<
  T extends { id?: string | null; slug?: string | null; name?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null },
>(pier: T): T {
  const lat = Number(pier.latitude);
  const lng = Number(pier.longitude);
  if (isValidCoordinatePair(lat, lng)) return pier;

  const id = String(pier.id || '').trim();
  const slug = String(pier.slug || '').trim().toLowerCase();
  const text = normalizeBoatPierLabel(`${pier.name || ''} ${pier.address || ''}`);

  for (const known of KNOWN_BOAT_PIER_COORDS) {
    if (known.id && id === known.id) {
      return { ...pier, latitude: known.latitude, longitude: known.longitude };
    }
    if (known.slugIncludes && slug.includes(known.slugIncludes)) {
      return { ...pier, latitude: known.latitude, longitude: known.longitude };
    }
    if (known.textTest(text)) {
      return { ...pier, latitude: known.latitude, longitude: known.longitude };
    }
  }
  return pier;
}

/** Keep the richer twin: more events → has coords → higher rank → stable id. */
export function dedupeBoatPiers(piers: BoatPierCandidate[]): BoatPierCandidate[] {
  const best = new Map<string, BoatPierCandidate>();
  for (const pier of piers) {
    const key = boatPierDedupeKey(pier);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, pier);
      continue;
    }
    const prevEvents = Number(prev.events) || 0;
    const nextEvents = Number(pier.events) || 0;
    if (nextEvents !== prevEvents) {
      if (nextEvents > prevEvents) best.set(key, pier);
      continue;
    }
    const prevCoords = isValidCoordinatePair(Number(prev.latitude), Number(prev.longitude));
    const nextCoords = isValidCoordinatePair(Number(pier.latitude), Number(pier.longitude));
    if (nextCoords !== prevCoords) {
      if (nextCoords) best.set(key, pier);
      continue;
    }
    if ((pier.rankScore || 0) !== (prev.rankScore || 0)) {
      if ((pier.rankScore || 0) > (prev.rankScore || 0)) best.set(key, pier);
      continue;
    }
    if (String(pier.id).localeCompare(String(prev.id)) < 0) best.set(key, pier);
  }
  return [...best.values()];
}

/** Pier card is useful only when catalog reports routes/events to open. */
export function pierHasBoatRoutes(
  pier: Pick<BoatPierCandidate, 'name' | 'address' | 'events'>,
): boolean {
  const events = Number(pier.events) || 0;
  if (events <= 0) return false;
  const blob = `${pier.name || ''} ${pier.address || ''}`;
  if (BOAT_PIER_JUNK_NAME_RE.test(blob)) return false;
  return true;
}

export type BoatPierCandidate = {
  id: string;
  slug: string | null;
  name: string;
  city: string;
  cityId?: string | null;
  citySlug?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  heroImageUrl?: string | null;
  events?: number;
  /** Meters to nearest day-route anchor (prev/next/center). Lower is better. */
  distanceM: number | null;
  rankScore: number;
};

export type BoatRouteCandidate = {
  eventId: string;
  eventSlug: string | null;
  title: string;
  imageUrl: string | null;
  priceFrom: number | null;
  category: string | null;
  sourceCode: string | null;
  /** Heuristic duration minutes from title; null if unknown. */
  durationGuessMin: number | null;
  sightseeingScore: number;
  rankScore: number;
  slots: BoatSlotCandidate[];
};

export type BoatSlotCandidate = {
  eventId: string;
  startsAt: string;
  dateLabel: string | null;
  timeLabel: string | null;
  purchaseUrl: string | null;
  vacant: number | null;
  /** Minutes from window start; null if no window. */
  fitDeltaMin: number | null;
  fitsWindow: boolean;
  rankScore: number;
};

export type BoatTimeWindow = {
  /** Earliest acceptable startsAt (ISO or Date). */
  earliestMs: number | null;
  /** Latest acceptable startsAt. */
  latestMs: number | null;
};

const SPB_CITY_RE =
  /санкт[\s\-]?петербург|saint[\s\-]?petersburg|st\.?\s*petersburg|peterburg|\bspb\b|ленинград/i;

const WATERFRONT_TEXT_RE =
  /набережн|причал|фонтанк|нева\b|мойк|канал|адмиралтейств|дворцов|англый?ская\s+наб|синопск|университетск/i;

const SHORT_SIGHT_RE = /обзорн|прогулк|канал|речн|недолг|коротк|1\s*час|час\s*с\s*гид/i;
const LONG_CRUISE_RE = /ужин|банкет|дискот|вечеринк|ночн|разведенн|свадьб|2\.5|3\s*час|4\s*час/i;

export function isSpbDayRouteCity(input: {
  slug?: string | null;
  name?: string | null;
  sourceSlug?: string | null;
  city?: string | null;
}): boolean {
  const blob = [input.slug, input.name, input.sourceSlug, input.city].filter(Boolean).join(' ');
  return SPB_CITY_RE.test(blob);
}

export function isBoatPierType(type: string | null | undefined): boolean {
  const key = String(type || '')
    .trim()
    .toLowerCase();
  return key === 'pier' || key === 'pier_water';
}

/** Guess duration from Russian cruise titles (MVP heuristic). */
export function guessBoatDurationMinutes(title: string | null | undefined): number | null {
  const text = String(title || '');
  const hourMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:час|ч\b)/i);
  if (hourMatch) {
    const hours = Number(String(hourMatch[1]).replace(',', '.'));
    if (Number.isFinite(hours) && hours > 0 && hours < 12) return Math.round(hours * 60);
  }
  const minMatch = text.match(/(\d{2,3})\s*мин/i);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    if (Number.isFinite(mins) && mins > 0 && mins < 600) return mins;
  }
  return null;
}

export function boatSightseeingScore(title: string | null | undefined): number {
  const text = String(title || '');
  let score = 0;
  if (SHORT_SIGHT_RE.test(text)) score += 3;
  if (LONG_CRUISE_RE.test(text)) score -= 2;
  const duration = guessBoatDurationMinutes(text);
  if (duration != null) {
    if (duration <= 75) score += 2;
    else if (duration <= 120) score += 1;
    else if (duration >= 180) score -= 2;
  }
  return score;
}

export function dayRouteAnchorCoords(
  venues: Array<Pick<DayRouteVenueItem, 'latitude' | 'longitude'>>,
  insertIndex?: number | null,
): { latitude: number; longitude: number } | null {
  if (!venues.length) return null;
  const idx =
    insertIndex == null || !Number.isFinite(insertIndex)
      ? venues.length - 1
      : Math.max(0, Math.min(venues.length - 1, Math.floor(insertIndex)));
  const neighbors = [venues[idx], venues[idx - 1], venues[idx + 1]].filter(Boolean);
  for (const venue of neighbors) {
    const lat = Number(venue?.latitude);
    const lng = Number(venue?.longitude);
    if (isValidCoordinatePair(lat, lng)) return { latitude: lat, longitude: lng };
  }
  for (const venue of venues) {
    const lat = Number(venue.latitude);
    const lng = Number(venue.longitude);
    if (isValidCoordinatePair(lat, lng)) return { latitude: lat, longitude: lng };
  }
  return null;
}

export function resolveBoatRankingOrigin(
  venues: Array<Pick<DayRouteVenueItem, 'latitude' | 'longitude' | 'title' | 'address'>>,
  opts?: { cityIsSpb?: boolean; insertIndex?: number | null },
): { latitude: number; longitude: number; source: 'route' | 'spb-center' | 'none' } {
  const fromRoute = dayRouteAnchorCoords(venues, opts?.insertIndex);
  if (fromRoute) return { ...fromRoute, source: 'route' };
  if (opts?.cityIsSpb) return { ...SPB_WATER_CENTER, source: 'spb-center' };
  return { latitude: NaN, longitude: NaN, source: 'none' };
}

export function rankBoatPiers(
  piers: Array<Omit<BoatPierCandidate, 'distanceM' | 'rankScore'>>,
  origin: { latitude: number; longitude: number } | null,
): BoatPierCandidate[] {
  const hasOrigin =
    origin && isValidCoordinatePair(origin.latitude, origin.longitude) ? origin : null;

  const ranked = piers.map((raw) => {
    const pier = enrichBoatPierCoords(raw);
    const lat = Number(pier.latitude);
    const lng = Number(pier.longitude);
    const hasCoords = isValidCoordinatePair(lat, lng);
    const distanceM =
      hasOrigin && hasCoords ? Math.round(haversineMeters(hasOrigin.latitude, hasOrigin.longitude, lat, lng)) : null;
    let rankScore = 0;
    if (distanceM != null) {
      // Closer piers first; soft boost for <1.5 km.
      rankScore += Math.max(0, 5000 - distanceM);
      if (distanceM <= 800) rankScore += 800;
      else if (distanceM <= 1500) rankScore += 400;
    } else if (hasCoords) {
      rankScore += 50;
    }
    const events = Number(pier.events) || 0;
    rankScore += Math.min(300, events);
    return { ...pier, distanceM, rankScore };
  });

  ranked.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.name.localeCompare(b.name, 'ru');
  });
  return dedupeBoatPiers(ranked);
}

export function inferBoatTimeWindow(
  venues: Array<Pick<DayRouteVenueItem, 'startsAt'>>,
  insertIndex?: number | null,
): BoatTimeWindow {
  if (!venues.length) return { earliestMs: null, latestMs: null };
  const idx =
    insertIndex == null || !Number.isFinite(insertIndex)
      ? venues.length
      : Math.max(0, Math.min(venues.length, Math.floor(insertIndex)));

  let prevMs: number | null = null;
  let nextMs: number | null = null;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const ms = parseStartsAtMs(venues[i]?.startsAt);
    if (ms != null) {
      prevMs = ms;
      break;
    }
  }
  for (let i = idx; i < venues.length; i += 1) {
    const ms = parseStartsAtMs(venues[i]?.startsAt);
    if (ms != null) {
      nextMs = ms;
      break;
    }
  }

  // Leave buffer after previous stop / before next.
  const earliestMs = prevMs != null ? prevMs + 45 * 60_000 : null;
  const latestMs = nextMs != null ? nextMs - 30 * 60_000 : null;
  return { earliestMs, latestMs };
}

function parseStartsAtMs(value: string | null | undefined): number | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

export type BoatSessionSource = {
  id: string;
  slug?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  priceFrom?: number | null;
  category?: string | null;
  offerSourceCode?: string | null;
  purchaseProvider?: string | null;
  purchaseUrl?: string | null;
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  upcomingSlots?: Array<{
    eventId?: string | null;
    startsAt?: string | null;
    dateLabel?: string | null;
    timeLabel?: string | null;
    purchaseUrl?: string | null;
    vacant?: number | null;
  }> | null;
};

export function buildBoatRoutesFromSessions(
  sessions: BoatSessionSource[],
  window: BoatTimeWindow,
): BoatRouteCandidate[] {
  const byEvent = new Map<string, BoatRouteCandidate>();

  for (const session of sessions) {
    const eventId = String(session.id || '').trim();
    if (!eventId) continue;
    const title = String(session.title || '').trim() || 'Прогулка на теплоходе';
    const sourceCode =
      String(session.offerSourceCode || session.purchaseProvider || '').trim() || null;
    const durationGuessMin = guessBoatDurationMinutes(title);
    const sightseeingScore = boatSightseeingScore(title);

    let route = byEvent.get(eventId);
    if (!route) {
      route = {
        eventId,
        eventSlug: String(session.slug || '').trim() || null,
        title,
        imageUrl: String(session.imageUrl || '').trim() || null,
        priceFrom: session.priceFrom ?? null,
        category: String(session.category || '').trim() || null,
        sourceCode,
        durationGuessMin,
        sightseeingScore,
        rankScore: 0,
        slots: [],
      };
      byEvent.set(eventId, route);
    }

    const slotRows =
      Array.isArray(session.upcomingSlots) && session.upcomingSlots.length
        ? session.upcomingSlots
        : [
            {
              eventId,
              startsAt: session.startsAt,
              dateLabel: session.dateLabel,
              timeLabel: session.timeLabel,
              purchaseUrl: session.purchaseUrl,
              vacant: null,
            },
          ];

    for (const row of slotRows) {
      const startsAt = String(row.startsAt || '').trim();
      if (!startsAt) continue;
      const startsMs = parseStartsAtMs(startsAt);
      if (startsMs == null) continue;
      const clockKey = boatSlotClockKey(startsAt);
      if (
        route.slots.some(
          (s) => s.startsAt === startsAt || (clockKey != null && boatSlotClockKey(s.startsAt) === clockKey),
        )
      ) {
        continue;
      }
      if (isMinus3hSameEventPhantom(startsAt, String(row.eventId || eventId), route.slots)) {
        const ms = startsMs;
        // Drop earlier −3h twin if we are the real later slot.
        route.slots = route.slots.filter((slot) => {
          if (String(slot.eventId || '').trim() !== String(row.eventId || eventId).trim()) return true;
          return Date.parse(slot.startsAt) !== ms - BOAT_MSK_OFFSET_MS;
        });
        // Skip if a later twin already exists (we are the phantom).
        if (
          route.slots.some(
            (slot) =>
              String(slot.eventId || '').trim() === String(row.eventId || eventId).trim() &&
              Date.parse(slot.startsAt) === ms + BOAT_MSK_OFFSET_MS,
          )
        ) {
          continue;
        }
      }

      const fitsEarliest = window.earliestMs == null || startsMs >= window.earliestMs;
      const fitsLatest = window.latestMs == null || startsMs <= window.latestMs;
      const fitsWindow = fitsEarliest && fitsLatest;
      let fitDeltaMin: number | null = null;
      if (window.earliestMs != null && window.latestMs != null) {
        const mid = (window.earliestMs + window.latestMs) / 2;
        fitDeltaMin = Math.round(Math.abs(startsMs - mid) / 60_000);
      } else if (window.earliestMs != null) {
        fitDeltaMin = Math.round(Math.max(0, startsMs - window.earliestMs) / 60_000);
      }

      let rankScore = 0;
      if (fitsWindow) rankScore += 1000;
      if (fitDeltaMin != null) rankScore += Math.max(0, 400 - fitDeltaMin);
      const vacant = row.vacant == null ? null : Number(row.vacant);
      if (vacant != null && vacant > 0) rankScore += Math.min(50, vacant);

      // Always derive HH:mm from startsAt in Europe/Moscow — never trust mismatched timeLabel (UTC−3 noise).
      const timeLabel =
        formatBoatSlotClock(startsAt, row.timeLabel || session.timeLabel) ||
        String(row.timeLabel || session.timeLabel || '').trim() ||
        null;

      route.slots.push({
        eventId: String(row.eventId || eventId),
        startsAt,
        dateLabel: String(row.dateLabel || session.dateLabel || '').trim() || null,
        timeLabel,
        purchaseUrl: sanitizeTicketscloudPurchaseUrl(row.purchaseUrl || session.purchaseUrl),
        vacant: Number.isFinite(vacant as number) ? (vacant as number) : null,
        fitDeltaMin,
        fitsWindow,
        rankScore,
      });
    }
  }

  const routes = [...byEvent.values()];
  for (const route of routes) {
    route.slots.sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      return a.startsAt.localeCompare(b.startsAt);
    });
    const bestSlot = route.slots[0];
    route.rankScore =
      (bestSlot?.rankScore || 0) + route.sightseeingScore * 40 + (route.slots.some((s) => s.fitsWindow) ? 200 : 0);
    if (route.durationGuessMin != null && route.durationGuessMin <= 90) route.rankScore += 80;
  }

  routes.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.title.localeCompare(b.title, 'ru');
  });
  return routes.filter((r) => r.slots.length > 0);
}

export function dayRouteSuggestsBoat(
  venues: Array<Pick<DayRouteVenueItem, 'title' | 'address' | 'latitude' | 'longitude'>>,
  piers: Array<Pick<BoatPierCandidate, 'latitude' | 'longitude'>>,
): boolean {
  if (!venues.length) return false;
  for (const venue of venues) {
    const blob = `${venue.title || ''} ${venue.address || ''}`;
    if (WATERFRONT_TEXT_RE.test(blob)) return true;
  }
  for (const venue of venues) {
    const lat = Number(venue.latitude);
    const lng = Number(venue.longitude);
    if (!isValidCoordinatePair(lat, lng)) continue;
    for (const pier of piers) {
      const plat = Number(pier.latitude);
      const plng = Number(pier.longitude);
      if (!isValidCoordinatePair(plat, plng)) continue;
      if (haversineMeters(lat, lng, plat, plng) <= BOAT_WATERFRONT_HINT_M) return true;
    }
  }
  return false;
}

export function dayRouteItemFromBoatSlot(input: {
  pier: Pick<
    BoatPierCandidate,
    'id' | 'slug' | 'name' | 'city' | 'cityId' | 'citySlug' | 'address' | 'latitude' | 'longitude' | 'heroImageUrl'
  >;
  route: Pick<BoatRouteCandidate, 'eventId' | 'eventSlug' | 'title' | 'imageUrl'>;
  slot: Pick<BoatSlotCandidate, 'startsAt' | 'dateLabel' | 'timeLabel' | 'purchaseUrl' | 'eventId'>;
}): DayRouteVenueItem {
  const pier = input.pier;
  const route = input.route;
  const slot = input.slot;
  const pierId = String(pier.id || '').trim();
  const pierSlug = String(pier.slug || '').trim() || null;
  const sessionParts = [
    slot.dateLabel,
    formatBoatSlotClock(slot.startsAt, slot.timeLabel) || slot.timeLabel,
  ].filter(Boolean);
  const sessionLabel = sessionParts.length
    ? `${sessionParts.join(', ')} · ${route.title}`
    : route.title;

  const ticketFromPurchase = sanitizeTicketscloudPurchaseUrl(slot.purchaseUrl);
  const ticketUrl =
    ticketFromPurchase ||
    eventHref({
      id: route.eventId,
      slug: route.eventSlug,
      title: route.title,
    });

  return {
    id: pierId || pierSlug || route.eventId,
    slug: pierSlug,
    title: route.title,
    city: pier.city || null,
    cityId: pier.cityId ?? null,
    citySlug: pier.citySlug ?? null,
    href:
      pierSlug || pierId
        ? venueHref({
            id: pierId || pierSlug || route.eventId,
            slug: pierSlug,
            name: pier.name,
            type: 'pier',
          })
        : null,
    imageUrl: route.imageUrl || pier.heroImageUrl || null,
    address: [pier.name, pier.address].filter(Boolean).join(' - ') || null,
    latitude: pier.latitude ?? null,
    longitude: pier.longitude ?? null,
    eventId: slot.eventId || route.eventId,
    eventSlug: route.eventSlug,
    sessionLabel,
    startsAt: slot.startsAt,
    ticketUrl,
  };
}

export function formatBoatDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} км`;
}
