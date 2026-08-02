/**
 * Commercial checklist helpers for «Мой день» (planner + tickets, not swipe UX).
 * Status chips, readiness %, free-window gaps between stops.
 */

import {
  DAY_ROUTE_MIN,
  DAY_ROUTE_SOFT,
  encodeDayRouteShareTime,
  formatDayRouteHHMM,
  resolveDayRouteTicketUrl,
  type DayRouteVenueItem,
} from './day-route';

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
 * Chip rules (priority):
 * 1. ticketBought → «Билет отмечен»
 * 2. timed session → «Сеанс HH:00»
 * 3. ticketUrl / event → «Билет оформляется…» (pending until ticketBought)
 * 4. else → «Вход свободный»
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
  return { kind: 'free', label: 'Вход свободный' };
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
