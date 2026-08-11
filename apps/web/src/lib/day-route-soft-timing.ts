/**
 * Soft «по часам» for /my-day - text hints only (no timeline / Gantt UI).
 * Bottom-sheet inputs: start, end, optional lunch; purchased tickets = hard anchors.
 */

import {
  dayRouteSessionTimeLabel,
  dayRouteStopHasTicket,
} from './day-route-commercial';
import type { DayRouteVenueItem } from './day-route';

export const DAY_ROUTE_SOFT_DWELL_MIN = 60;
export const DAY_ROUTE_SOFT_DWELL_TICKET_MIN = 90;
export const DAY_ROUTE_SOFT_WALK_MIN = 18;
export const DAY_ROUTE_SOFT_LUNCH_MIN = 60;
/** Preferred lunch window start (minutes from midnight). */
export const DAY_ROUTE_SOFT_LUNCH_AT = 14 * 60;

export type DayRouteSoftTimingHint = {
  venueId: string;
  /** e.g. «10:00 - 11:30» or «В 15:00» */
  label: string;
  startMin: number;
  endMin: number;
  kind: 'range' | 'point' | 'lunch';
};

export type DayRouteHourPlanInput = {
  startHHMM: string;
  endHHMM: string;
  lunch: boolean;
};

export type DayRouteHourPlanResult = {
  hints: DayRouteSoftTimingHint[];
  byId: Record<string, DayRouteSoftTimingHint>;
  /** Stops that did not fit into [start, end]. */
  overflowIds: string[];
  /** Fitted span minutes. */
  totalMinutes: number;
  totalLabel: string;
  lunchHint: DayRouteSoftTimingHint | null;
};

function parseHHMM(raw: string): number | null {
  const m = String(raw || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

export function formatDayRouteHHMMFromMinutes(totalMin: number): string {
  const normalized = ((Math.round(totalMin) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hoursPhrase(totalMinutes: number): string {
  if (totalMinutes <= 0) return '';
  const hours = Math.max(1, Math.round(totalMinutes / 60));
  const mod10 = hours % 10;
  const mod100 = hours % 100;
  if (mod10 === 1 && mod100 !== 11) return `~${hours} час`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `~${hours} часа`;
  return `~${hours} часов`;
}

function dwellFor(venue: DayRouteVenueItem): number {
  if (venue.ticketBought || dayRouteStopHasTicket(venue)) return DAY_ROUTE_SOFT_DWELL_TICKET_MIN;
  return DAY_ROUTE_SOFT_DWELL_MIN;
}

export function dayRouteStopIsPurchased(venue: Pick<DayRouteVenueItem, 'ticketBought'>): boolean {
  return Boolean(venue.ticketBought);
}

export function anchorMinutes(venue: DayRouteVenueItem): number | null {
  const session = dayRouteSessionTimeLabel(venue);
  if (session) {
    const parsed = parseHHMM(session);
    if (parsed != null) return parsed;
  }
  const raw = String(venue.startsAt || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Europe/Moscow wall-clock (catalog sessions), never browser/server local getHours().
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = Number(parts.find((part) => part.type === 'hour')?.value || NaN);
  const mm = Number(parts.find((part) => part.type === 'minute')?.value || NaN);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function rangeLabel(startMin: number, endMin: number): string {
  // Lovable screenshot style: 12:25-14:25 (hyphen, no en-dash).
  return `${formatDayRouteHHMMFromMinutes(startMin)}-${formatDayRouteHHMMFromMinutes(endMin)}`;
}

function pointLabel(startMin: number): string {
  return `В ${formatDayRouteHHMMFromMinutes(startMin)}`;
}

/**
 * Hybrid hour plan:
 * 1) Freeze purchased tickets as hard anchors
 * 2) Fill free/custom (and unpaid) in list order with dwell + walk
 * 3) Optional lunch ~14:00-15:00 when it fits
 * 4) Overflow → overflowIds (no hard error)
 */
export function computeDayRouteHourPlan(
  venues: DayRouteVenueItem[],
  input: DayRouteHourPlanInput,
): DayRouteHourPlanResult {
  const dayStart = parseHHMM(input.startHHMM) ?? 10 * 60;
  let dayEnd = parseHHMM(input.endHHMM) ?? 22 * 60;
  if (dayEnd <= dayStart) dayEnd = dayStart + 8 * 60;

  const purchased = venues.filter((v) => dayRouteStopIsPurchased(v));
  const plans = venues.filter((v) => !dayRouteStopIsPurchased(v));

  const hints: DayRouteSoftTimingHint[] = [];
  const overflowIds: string[] = [];
  let lunchHint: DayRouteSoftTimingHint | null = null;

  // Place purchased anchors (sorted by time when known).
  const purchasedOrdered = [...purchased].sort((a, b) => {
    const am = anchorMinutes(a);
    const bm = anchorMinutes(b);
    if (am == null && bm == null) return 0;
    if (am == null) return 1;
    if (bm == null) return -1;
    return am - bm;
  });

  for (const venue of purchasedOrdered) {
    const hard = anchorMinutes(venue);
    const startMin = hard != null ? hard : dayStart;
    const endMin = startMin + Math.min(dwellFor(venue), 60);
    if (startMin >= dayEnd) {
      overflowIds.push(venue.id);
      continue;
    }
    hints.push({
      venueId: venue.id,
      label: pointLabel(startMin),
      startMin,
      endMin: Math.min(endMin, dayEnd),
      kind: 'point',
    });
  }

  // Busy intervals from anchors + optional lunch.
  type Interval = { start: number; end: number };
  const busy: Interval[] = hints.map((h) => ({ start: h.startMin, end: h.endMin }));

  if (input.lunch) {
    const lunchStart = DAY_ROUTE_SOFT_LUNCH_AT;
    const lunchEnd = lunchStart + DAY_ROUTE_SOFT_LUNCH_MIN;
    if (lunchStart >= dayStart && lunchEnd <= dayEnd) {
      const overlapsAnchor = busy.some((b) => b.start < lunchEnd && b.end > lunchStart);
      if (!overlapsAnchor) {
        lunchHint = {
          venueId: '__lunch__',
          label: `${formatDayRouteHHMMFromMinutes(lunchStart)} - ${formatDayRouteHHMMFromMinutes(lunchEnd)} · обед`,
          startMin: lunchStart,
          endMin: lunchEnd,
          kind: 'lunch',
        };
        busy.push({ start: lunchStart, end: lunchEnd });
      }
    }
  }

  busy.sort((a, b) => a.start - b.start);

  function nextFreeSlot(from: number, need: number): number | null {
    let t = Math.max(from, dayStart);
    for (let guard = 0; guard < 40; guard += 1) {
      const hit = busy.find((b) => t < b.end && t + need > b.start);
      if (!hit) {
        if (t + need <= dayEnd) return t;
        return null;
      }
      t = hit.end + DAY_ROUTE_SOFT_WALK_MIN;
      if (t >= dayEnd) return null;
    }
    return null;
  }

  let cursor = dayStart;
  for (let i = 0; i < plans.length; i += 1) {
    const venue = plans[i]!;
    if (i > 0) cursor += DAY_ROUTE_SOFT_WALK_MIN;
    const need = dwellFor(venue);
    const softAnchor = anchorMinutes(venue);
    const prefer = softAnchor != null ? Math.max(cursor, softAnchor) : cursor;
    const startMin = nextFreeSlot(prefer, need);
    if (startMin == null) {
      overflowIds.push(venue.id);
      continue;
    }
    const endMin = startMin + need;
    hints.push({
      venueId: venue.id,
      label: rangeLabel(startMin, endMin),
      startMin,
      endMin,
      kind: 'range',
    });
    busy.push({ start: startMin, end: endMin });
    busy.sort((a, b) => a.start - b.start);
    cursor = endMin;
  }

  const fitted = hints.filter((h) => h.kind !== 'lunch');
  const firstStart = fitted.length ? Math.min(...fitted.map((h) => h.startMin)) : dayStart;
  const lastEnd = fitted.length ? Math.max(...fitted.map((h) => h.endMin)) : dayStart;
  const totalMinutes = Math.max(0, lastEnd - firstStart);
  const byId: Record<string, DayRouteSoftTimingHint> = {};
  for (const hint of fitted) byId[hint.venueId] = hint;

  return {
    hints: fitted,
    byId,
    overflowIds,
    totalMinutes,
    totalLabel: fitted.length ? hoursPhrase(totalMinutes || DAY_ROUTE_SOFT_DWELL_MIN) : '',
    lunchHint,
  };
}

/** Reactive recalc after ↑↓ while hour-mode is on (same inputs). */
export function computeDayRouteSoftTiming(
  venues: DayRouteVenueItem[],
  startHHMM: string,
  endHHMM = '22:00',
  lunch = false,
): DayRouteHourPlanResult {
  return computeDayRouteHourPlan(venues, { startHHMM, endHHMM, lunch });
}

export const DAY_ROUTE_SOFT_START_OPTIONS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
] as const;

export const DAY_ROUTE_SOFT_END_OPTIONS = [
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
] as const;
