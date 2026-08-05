/**
 * Commercial checklist helpers for «Мой день» (planner + tickets, not swipe UX).
 * Status chips, readiness %, free-window gaps, under-stop upsell, trip tickets shell.
 */

import {
  DAY_ROUTE_MIN,
  DAY_ROUTE_SOFT,
  encodeDayRouteShareTime,
  formatDayRouteHHMM,
  resolveDayRouteTicketUrl,
  type DayRouteVenueItem,
} from './day-route';
import { formatPriceFrom } from './format';
import { eventHref } from './routes';

export type DayRouteCommercialChipKind = 'bought' | 'session' | 'needs_ticket' | 'free';

export type DayRouteCommercialChip = {
  kind: DayRouteCommercialChipKind;
  /** Short status for card micro-badge. */
  label: string;
};

/** Walk gap (meters) above which we suggest filling the window. ~15 мин пешком. */
export const DAY_ROUTE_FREE_WINDOW_METERS = 1200;

export function dayRouteSessionTimeLabel(
  venue: Pick<DayRouteVenueItem, 'startsAt' | 'sessionLabel'>,
): string | null {
  const hhmm = encodeDayRouteShareTime(venue);
  if (!hhmm || hhmm === 'free') return null;
  return formatDayRouteHHMM(hhmm);
}

/** True when stop has a buyable checkout / event page (not invented prices). */
export function dayRouteStopHasTicket(
  venue: Pick<DayRouteVenueItem, 'ticketUrl' | 'eventId' | 'eventSlug' | 'title'>,
): boolean {
  return Boolean(resolveDayRouteTicketUrl(venue));
}

/**
 * Ticket / timed-session stops: lock ↑↓ reorder (boat slot / bought ticket stay fixed).
 */
export function dayRouteStopReorderLocked(
  venue: Pick<DayRouteVenueItem, 'ticketBought' | 'startsAt' | 'sessionLabel' | 'ticketUrl' | 'eventId' | 'eventSlug' | 'title'>,
): boolean {
  if (venue.ticketBought) return true;
  if (dayRouteSessionTimeLabel(venue)) return true;
  return false;
}

/** Visual commerce anchor (ticket/event) vs free landmark. */
export function dayRouteStopIsCommerce(
  venue: Pick<
    DayRouteVenueItem,
    'ticketBought' | 'startsAt' | 'sessionLabel' | 'ticketUrl' | 'eventId' | 'eventSlug' | 'title'
  >,
): boolean {
  if (venue.ticketBought) return true;
  if (dayRouteStopHasTicket(venue)) return true;
  if (dayRouteSessionTimeLabel(venue)) return true;
  return false;
}

/** Real QR/code payload only - empty means stub modal, never a fake QR. */
export function dayRouteStopTicketQrData(
  venue: Pick<DayRouteVenueItem, 'ticketQrData'>,
): string | null {
  const raw = String(venue.ticketQrData || '').trim();
  return raw || null;
}

/**
 * Chip rules (priority):
 * 1. ticketBought → «Билет отмечен»
 * 2. timed session → «Сеанс HH:00»
 * 3. ticketUrl / event → «Билет оформляется…» (pending until ticketBought)
 * 4. else → kind `free` (UI hides badge; no «Вход свободный»)
 *
 * Soft session labels without HH:MM (e.g. «Вечерний сеанс») stay needs_ticket -
 * never invent «сегодня 18:30» on the chip.
 */
export function classifyDayRouteCommercialChip(
  venue: DayRouteVenueItem,
): DayRouteCommercialChip {
  if (venue.ticketBought) {
    return { kind: 'bought', label: 'Билет отмечен' };
  }
  const session = dayRouteSessionTimeLabel(venue);
  if (session) {
    return { kind: 'session', label: `Сеанс ${session}` };
  }
  if (dayRouteStopHasTicket(venue)) {
    const soft = String(venue.sessionLabel || '').trim();
    if (/вечерн/i.test(soft)) {
      return { kind: 'needs_ticket', label: soft };
    }
    return { kind: 'needs_ticket', label: 'Билет оформляется…' };
  }
  return { kind: 'free', label: '' };
}

export type DayRouteReadiness = {
  /** 0..100 checklist readiness. */
  percent: number;
  pointsCount: number;
  /** Stops that still need a ticket purchase mark. */
  ticketsToBuy: number;
  /** Event-like stops without a timed slot. */
  slotsWithoutTime: number;
  /** Large travel gaps between consecutive stops. */
  freeWindows: number;
  /** Compact header line: «5 точек из 10 · 2 билета» (SOFT=10; tickets only if unpaid). */
  summaryLine: string;
  /** Internal/checklist: «День собран на 72%» - not shown in /my-day header. */
  percentLabel: string;
};

function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/**
 * Readiness formula (equal thirds, documented for product):
 * - points: min(N / DAY_ROUTE_MIN, 1) capped contribution toward a full day start
 *   plus soft fill toward DAY_ROUTE_SOFT (blend; not hard safety MAX)
 * - tickets: among stops with ticketUrl, share marked bought (or 1 if none need ticket)
 * - time: among ticket/event stops, share with session time (or 1 if none are timed-commerce)
 *
 * percent = round(100 * (pointsScore + ticketsScore + timeScore) / 3)
 */
export function computeDayRouteReadiness(
  venues: DayRouteVenueItem[],
  options?: { segmentMeters?: Array<number | null>; freeWindowMeters?: number },
): DayRouteReadiness {
  const pointsCount = venues.length;
  const ticketStops = venues.filter((v) => dayRouteStopHasTicket(v));
  const ticketsToBuy = ticketStops.filter((v) => !v.ticketBought).length;
  const ticketsBought = ticketStops.length - ticketsToBuy;
  const commerceStops = ticketStops;
  const slotsWithoutTime = commerceStops.filter((v) => !dayRouteSessionTimeLabel(v)).length;
  const timedSet = commerceStops.length - slotsWithoutTime;

  const freeWindowMeters = options?.freeWindowMeters ?? DAY_ROUTE_FREE_WINDOW_METERS;
  const segments = options?.segmentMeters || [];
  const freeWindows = segments.filter(
    (m) => m != null && Number.isFinite(m) && (m as number) >= freeWindowMeters,
  ).length;

  // Points: reach MIN quickly, then ease toward soft guideline (not hard safety cap).
  const toMin = Math.min(pointsCount / DAY_ROUTE_MIN, 1);
  const toSoft = Math.min(pointsCount / DAY_ROUTE_SOFT, 1);
  const pointsScore = pointsCount === 0 ? 0 : 0.65 * toMin + 0.35 * toSoft;

  const ticketsScore =
    ticketStops.length === 0 ? 1 : ticketsBought / ticketStops.length;

  const timeScore =
    commerceStops.length === 0 ? 1 : timedSet / commerceStops.length;

  const percent =
    pointsCount === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(100 * ((pointsScore + ticketsScore + timeScore) / 3))));

  const pointsPart = `${pointsCount} ${pluralRu(pointsCount, 'точка', 'точки', 'точек')} из ${DAY_ROUTE_SOFT}`;
  const ticketsPart =
    ticketsToBuy > 0
      ? `${ticketsToBuy} ${pluralRu(ticketsToBuy, 'билет', 'билета', 'билетов')}`
      : null;

  const summaryLine = [pointsPart, ticketsPart].filter(Boolean).join(' · ');

  return {
    percent,
    pointsCount,
    ticketsToBuy,
    slotsWithoutTime,
    freeWindows,
    summaryLine,
    percentLabel: `День собран на ${percent}%`,
  };
}

export type DayRouteFreeWindowGap = {
  /** Index of the stop after which the gap starts (segment i → between i and i+1). */
  afterIndex: number;
  meters: number;
};

/** Largest qualifying free window, or null. */
export function findDayRouteFreeWindowGaps(
  segmentMeters: Array<number | null>,
  thresholdMeters = DAY_ROUTE_FREE_WINDOW_METERS,
): DayRouteFreeWindowGap[] {
  const gaps: DayRouteFreeWindowGap[] = [];
  for (let i = 0; i < segmentMeters.length; i += 1) {
    const meters = segmentMeters[i];
    if (meters == null || !Number.isFinite(meters) || meters < thresholdMeters) continue;
    gaps.push({ afterIndex: i, meters });
  }
  return gaps;
}

export function commercialChipClassName(kind: DayRouteCommercialChipKind): string {
  switch (kind) {
    case 'bought':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200';
    case 'session':
      return 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200';
    case 'needs_ticket':
      return 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200';
    case 'free':
    default:
      return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200';
  }
}

/** Match stub from `/api/day-route/matches` used for commerce attach / under-stop upsell. */
export type DayRouteMatchOfferStub = {
  eventId: string;
  slug: string;
  title: string;
  priceFromRub: number | null;
  /** False → never attach buy CTA (soft-404 public page). Default treat missing as true for legacy stubs. */
  purchaseReady?: boolean;
  covered: { stop: string[]; start: string[]; nearby: string[] };
  routeVenues?: Array<{ id: string }>;
};

export type DayRouteNearbyUpsell = {
  eventId: string;
  title: string;
  ticketUrl: string;
  priceFromRub: number | null;
  /** e.g. «Рядом: Экскурсия по крышам (от 900 ₽)» */
  line: string;
};

export type DayRouteTripTicket = {
  venueId: string;
  title: string;
  sessionLabel: string | null;
  ticketUrl: string | null;
  /** True only when ticketQrData already exists in client state. */
  qrAvailable: boolean;
  qrData: string | null;
  qrKind: 'qr' | 'barcode' | 'image' | null;
};

function venueLocatorKeys(venue: Pick<DayRouteVenueItem, 'id' | 'slug'>): Set<string> {
  return new Set(
    [venue.id, venue.slug]
      .map((x) => String(x || '').trim())
      .filter(Boolean),
  );
}

function coveredIncludes(
  covered: DayRouteMatchOfferStub['covered'],
  keys: Set<string>,
): { stop: boolean; start: boolean; nearby: boolean } {
  return {
    stop: covered.stop.some((id) => keys.has(id)),
    start: covered.start.some((id) => keys.has(id)),
    nearby: covered.nearby.some((id) => keys.has(id)),
  };
}

function realPriceRub(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

function priceSuffixLabel(priceFromRub: number | null | undefined): string {
  const n = realPriceRub(priceFromRub);
  if (n == null) return '';
  const label = formatPriceFrom(n);
  return label === 'Цена уточняется' ? '' : label;
}

/**
 * Single-venue admission / ticket product (cable car, museum entry).
 * Multi-stop excursions stay under-stop «Рядом» on free landmarks.
 */
export function matchIsSingleVenueAdmission(match: DayRouteMatchOfferStub): boolean {
  const routeCount = match.routeVenues?.length ?? 0;
  if (routeCount > 1) return false;
  if (match.covered.stop.length > 0) return false;
  return true;
}

export type DayRouteBuyCtaParts = {
  /** Main action line, e.g. «Купить билет» - never includes price. */
  action: string;
  /** «от N ₽» or null; keep on one line in UI (whitespace-nowrap). */
  price: string | null;
};

/**
 * Structured buy CTA for stop right-rail layout:
 * [icon] + action / price as separate lines - icon must not sit between Russian words.
 */
export function formatDayRouteBuyCtaParts(
  venue: Pick<DayRouteVenueItem, 'priceFromRub' | 'sessionLabel'>,
): DayRouteBuyCtaParts {
  const price = priceSuffixLabel(venue.priceFromRub) || null;
  if (price) return { action: 'Купить билет', price };
  const soft = String(venue.sessionLabel || '').trim();
  if (soft && !/вечерн/i.test(soft) && !/^билет/i.test(soft) && !isSoftDaypart(soft)) {
    return { action: 'Купить билет на это же время', price: null };
  }
  return { action: 'Купить билет', price: null };
}

/** Primary buy CTA label (aria / flat string): «Купить билет от X» when real price known. */
export function formatDayRouteBuyCtaLabel(
  venue: Pick<DayRouteVenueItem, 'priceFromRub' | 'sessionLabel'>,
): string {
  const { action, price } = formatDayRouteBuyCtaParts(venue);
  return price ? `${action} ${price}` : action;
}

function isSoftDaypart(label: string): boolean {
  return /^(утро|день|вечер|ночь|утренний\s+сеанс|дневной\s+сеанс|вечерний\s+сеанс|открытая\s+дата)$/i.test(
    label.trim(),
  );
}

export function formatNearbyUpsellLine(match: {
  title: string;
  priceFromRub: number | null;
}): string {
  const title = String(match.title || '').trim() || 'Билет рядом';
  const price = priceSuffixLabel(match.priceFromRub);
  if (price) return `Рядом: ${title} (${price})`;
  return `Рядом: ${title}`;
}

function matchIsPurchaseReady(match: DayRouteMatchOfferStub): boolean {
  return match.purchaseReady !== false;
}

function matchTicketUrl(match: Pick<DayRouteMatchOfferStub, 'eventId' | 'slug' | 'title'>): string {
  return eventHref({
    id: match.eventId,
    slug: match.slug,
    title: match.title,
  });
}

/** Attach single-venue ticket product onto a free catalog stop (e.g. канатная дорога). */
export function pickAdmissionMatchForStop(
  venue: DayRouteVenueItem,
  matches: DayRouteMatchOfferStub[],
): DayRouteMatchOfferStub | null {
  if (dayRouteStopHasTicket(venue)) return null;
  const keys = venueLocatorKeys(venue);
  if (!keys.size) return null;
  const candidates = matches.filter((m) => {
    if (!matchIsPurchaseReady(m)) return false;
    if (!matchIsSingleVenueAdmission(m)) return false;
    return coveredIncludes(m.covered, keys).start;
  });
  if (!candidates.length) return null;
  candidates.sort(
    (a, b) =>
      (a.priceFromRub ?? Number.POSITIVE_INFINITY) - (b.priceFromRub ?? Number.POSITIVE_INFINITY),
  );
  return candidates[0] || null;
}

/** Real price for a ticketed stop from matches (event id/slug or start cover). */
export function findPriceForTicketedStop(
  venue: DayRouteVenueItem,
  matches: DayRouteMatchOfferStub[],
): number | null {
  const existing = realPriceRub(venue.priceFromRub);
  if (existing != null) return existing;
  const eventId = String(venue.eventId || '').trim();
  const eventSlug = String(venue.eventSlug || '').trim();
  if (eventId || eventSlug) {
    const byEvent = matches.find(
      (m) =>
        (eventId && m.eventId === eventId) ||
        (eventSlug && m.slug === eventSlug),
    );
    const fromEvent = realPriceRub(byEvent?.priceFromRub);
    if (fromEvent != null) return fromEvent;
  }
  const keys = venueLocatorKeys(venue);
  const byStart = matches
    .filter((m) => coveredIncludes(m.covered, keys).start)
    .sort(
      (a, b) =>
        (a.priceFromRub ?? Number.POSITIVE_INFINITY) -
        (b.priceFromRub ?? Number.POSITIVE_INFINITY),
    )[0];
  return realPriceRub(byStart?.priceFromRub);
}

/**
 * Under-stop upsell for free locations (STOP / nearby / multi-stop start).
 * Skips single-venue admission (those attach as on-card buy CTA).
 */
export function pickNearbyUpsellsForStop(
  venue: DayRouteVenueItem,
  matches: DayRouteMatchOfferStub[],
  options?: { limit?: number; excludeEventIds?: Iterable<string> },
): DayRouteNearbyUpsell[] {
  if (dayRouteStopHasTicket(venue)) return [];
  const keys = venueLocatorKeys(venue);
  if (!keys.size) return [];
  const exclude = new Set(
    [...(options?.excludeEventIds || [])].map((x) => String(x || '').trim()).filter(Boolean),
  );
  const limit = Math.max(1, options?.limit ?? 1);
  const ranked: Array<{ match: DayRouteMatchOfferStub; score: number }> = [];
  for (const match of matches) {
    if (exclude.has(match.eventId)) continue;
    if (!matchIsPurchaseReady(match)) continue;
    const hit = coveredIncludes(match.covered, keys);
    if (!hit.stop && !hit.start && !hit.nearby) continue;
    if (matchIsSingleVenueAdmission(match) && hit.start) continue;
    let roleScore = 0;
    if (hit.stop) roleScore = 3;
    else if (hit.start) roleScore = 2;
    else roleScore = 1;
    ranked.push({
      match,
      score: roleScore * 10 + (realPriceRub(match.priceFromRub) != null ? 1 : 0),
    });
  }
  ranked.sort((a, b) => b.score - a.score);
  const out: DayRouteNearbyUpsell[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    if (out.length >= limit) break;
    if (seen.has(row.match.eventId)) continue;
    seen.add(row.match.eventId);
    out.push({
      eventId: row.match.eventId,
      title: row.match.title,
      ticketUrl: matchTicketUrl(row.match),
      priceFromRub: realPriceRub(row.match.priceFromRub),
      line: formatNearbyUpsellLine(row.match),
    });
  }
  return out;
}

/** Apply matches commerce onto route stops (admission attach + price enrich + cull soft-404). Pure. */
export function applyMatchCommerceToVenues(
  venues: DayRouteVenueItem[],
  matches: DayRouteMatchOfferStub[],
): { venues: DayRouteVenueItem[]; changed: boolean } {
  if (!venues.length) return { venues, changed: false };
  let changed = false;
  const saleableIds = new Set(
    matches.filter((m) => matchIsPurchaseReady(m)).map((m) => String(m.eventId || '').trim()).filter(Boolean),
  );
  const saleableSlugs = new Set(
    matches.filter((m) => matchIsPurchaseReady(m)).map((m) => String(m.slug || '').trim()).filter(Boolean),
  );

  const next = venues.map((venue) => {
    let current = venue;

    // Cull buy CTAs attached onto a venue stop from unsaleable/thin TC matches
    // (localStorage poison → soft-404 «Купить»). Keep true event stops (id === eventId).
    if (matches.length) {
      const eventId = String(current.eventId || '').trim();
      const eventSlug = String(current.eventSlug || '').trim();
      const stopId = String(current.id || '').trim();
      const stopSlug = String(current.slug || '').trim();
      const isVenueHostedEvent =
        Boolean(eventId || eventSlug) &&
        eventId !== stopId &&
        eventSlug !== stopId &&
        (!stopSlug || (eventSlug !== stopSlug && eventId !== stopSlug));
      const knownSaleable =
        (eventId && saleableIds.has(eventId)) || (eventSlug && saleableSlugs.has(eventSlug));
      if (isVenueHostedEvent && !knownSaleable) {
        changed = true;
        current = {
          ...current,
          eventId: null,
          eventSlug: null,
          ticketUrl: null,
          priceFromRub: null,
        };
      }
    }

    const admission = pickAdmissionMatchForStop(current, matches);
    if (admission) {
      const ticketUrl = matchTicketUrl(admission);
      const priceFromRub = realPriceRub(admission.priceFromRub);
      const same =
        current.eventId === admission.eventId &&
        current.eventSlug === admission.slug &&
        current.ticketUrl === ticketUrl &&
        (priceFromRub == null || current.priceFromRub === priceFromRub);
      if (same) return current;
      changed = true;
      return {
        ...current,
        eventId: admission.eventId,
        eventSlug: admission.slug,
        ticketUrl,
        ...(priceFromRub != null ? { priceFromRub } : {}),
      };
    }
    if (!dayRouteStopHasTicket(current)) return current;
    const priceFromRub = findPriceForTicketedStop(current, matches);
    if (priceFromRub != null && current.priceFromRub !== priceFromRub) {
      changed = true;
      return { ...current, priceFromRub };
    }
    return current;
  });
  return { venues: next, changed };
}

/**
 * Trip tickets aggregation shell: stops marked bought in this plan.
 * Full QR from Daibilet orders requires buyer auth / orders API (see qa.md).
 */
export function collectDayRouteTripTickets(venues: DayRouteVenueItem[]): DayRouteTripTicket[] {
  return venues
    .filter((v) => Boolean(v.ticketBought))
    .map((v) => {
      const timed = dayRouteSessionTimeLabel(v);
      const soft = String(v.sessionLabel || '').trim() || null;
      const qrData = dayRouteStopTicketQrData(v);
      const kindRaw = String(v.ticketQrKind || '').trim();
      const qrKind =
        kindRaw === 'qr' || kindRaw === 'barcode' || kindRaw === 'image' ? kindRaw : qrData ? 'qr' : null;
      return {
        venueId: v.id,
        title: v.title,
        sessionLabel: timed || soft,
        ticketUrl: resolveDayRouteTicketUrl(v),
        qrAvailable: Boolean(qrData),
        qrData,
        qrKind,
      };
    });
}
