/**
 * Soft type labels for My Day «Типы точек» filter (Lovable-style pills).
 * Derived from stop metadata - no separate tag field in localStorage yet.
 */

import {
  isNoteDayRouteStop,
  isTextDayRouteStop,
  type DayRouteVenueItem,
} from './day-route';

export function dayRouteStopTypeTag(
  venue: DayRouteVenueItem,
  /** Optional short label from must-see classification (resolved in UI). */
  mustSeeTag?: string | null,
): string {
  if (isNoteDayRouteStop(venue)) return 'Заметка';
  if (isTextDayRouteStop(venue)) return 'Своё место';
  if (venue.isSuburb) return 'Пригород';
  if (venue.eventId || venue.eventSlug) return 'Событие';
  if (mustSeeTag) return String(mustSeeTag).trim() || 'Место';
  return 'Место';
}

export function buildDayRouteTypeCounts(
  venues: DayRouteVenueItem[],
  resolveTag?: (venue: DayRouteVenueItem) => string | null | undefined,
): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>();
  for (const venue of venues) {
    if (isNoteDayRouteStop(venue)) continue;
    const tag = dayRouteStopTypeTag(venue, resolveTag?.(venue) || null);
    map.set(tag, (map.get(tag) || 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ru'));
}

export function estimateDayRouteDwellMinutes(venues: DayRouteVenueItem[]): number {
  let total = 0;
  for (const venue of venues) {
    if (isNoteDayRouteStop(venue)) continue;
    // Soft dwell: ticket/event ~90 мин, иначе ~60 (align soft-timing defaults).
    if (venue.ticketBought || venue.ticketUrl || venue.eventId || venue.eventSlug) total += 90;
    else total += 60;
  }
  return total;
}
