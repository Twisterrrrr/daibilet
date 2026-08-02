/**
 * Commercial checklist helpers for «Мой день» (planner + tickets, not swipe UX).
 * Status chips, readiness %, free-window gaps between stops.
 */

import {
  DAY_ROUTE_MAX,
  DAY_ROUTE_MIN,
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
 * 3. ticketUrl / event → «Нужен билет»
 * 4. else → «Вход свободный»
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
    return { kind: 'needs_ticket', label: 'Нужен билет' };
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
  /** Compact line: «5 точек · 2 билета · 1 свободное окно». */
  summaryLine: string;
  /** Headline: «День собран на 72%». */
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
 *   plus soft fill toward DAY_ROUTE_MAX (blend)
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

  // Points: reach MIN quickly, then ease toward MAX.
  const toMin = Math.min(pointsCount / DAY_ROUTE_MIN, 1);
  const toMax = Math.min(pointsCount / DAY_ROUTE_MAX, 1);
  const pointsScore = pointsCount === 0 ? 0 : 0.65 * toMin + 0.35 * toMax;

  const ticketsScore =
    ticketStops.length === 0 ? 1 : ticketsBought / ticketStops.length;

  const timeScore =
    commerceStops.length === 0 ? 1 : timedSet / commerceStops.length;

  const percent =
    pointsCount === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(100 * ((pointsScore + ticketsScore + timeScore) / 3))));

  const ticketsPart =
    ticketsToBuy > 0
      ? `${ticketsToBuy} ${pluralRu(ticketsToBuy, 'билет', 'билета', 'билетов')}`
      : ticketStops.length > 0
        ? 'билеты отмечены'
        : 'без билетов';

  const windowPart =
    freeWindows > 0
      ? `${freeWindows} ${pluralRu(freeWindows, 'свободное окно', 'свободных окна', 'свободных окон')}`
      : null;

  const summaryLine = [
    `${pointsCount} ${pluralRu(pointsCount, 'точка', 'точки', 'точек')}`,
    ticketsPart,
    windowPart,
  ]
    .filter(Boolean)
    .join(' · ');

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
