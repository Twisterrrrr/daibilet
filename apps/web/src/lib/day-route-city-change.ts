/**
 * City switch / foreign-city add guards for «Мой день» (Variant B).
 * Isolated module - layout agents often rewrite day-route.ts.
 */

import {
  clearDayRoute,
  dayRouteDominantCitySlug,
  normalizeDayRouteCityTitle,
  readDayRoute,
  type DayRouteVenueItem,
} from './day-route';

/** Most frequent non-empty city title among stops (display label). */
export function resolveDayRouteCityLabel(venues: DayRouteVenueItem[]): string | null {
  const counts = new Map<string, { count: number; display: string }>();
  for (const venue of venues) {
    const key = normalizeDayRouteCityTitle(venue.city);
    if (!key) continue;
    const display = String(venue.city || '').trim();
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { count: 1, display });
  }
  let best: { count: number; display: string } | null = null;
  for (const item of counts.values()) {
    if (!best || item.count > best.count) best = item;
  }
  return best?.display ?? null;
}

function citiesMatch(
  left: { city?: string | null; citySlug?: string | null },
  right: { city?: string | null; citySlug?: string | null },
): boolean {
  const leftTitle = normalizeDayRouteCityTitle(left.city);
  const rightTitle = normalizeDayRouteCityTitle(right.city);
  if (leftTitle && rightTitle && leftTitle === rightTitle) return true;
  const leftSlug = String(left.citySlug || '')
    .trim()
    .toLowerCase();
  const rightSlug = String(right.citySlug || '')
    .trim()
    .toLowerCase();
  if (leftSlug && rightSlug && leftSlug === rightSlug) return true;
  return false;
}

/**
 * True when a non-empty route must be cleared before switching the header city.
 * Same city / empty route / next city already matches route dominant → no clear.
 */
export function dayRouteNeedsClearForCityChange(
  nextCityName: string,
  currentCityValue: string,
  venues: DayRouteVenueItem[] = typeof window === 'undefined' ? [] : readDayRoute().venues,
): boolean {
  if (nextCityName === currentCityValue) return false;
  if (venues.length === 0) return false;

  if (nextCityName === 'all') return true;

  const routeLabel = resolveDayRouteCityLabel(venues);
  const routeSlug = dayRouteDominantCitySlug(venues);
  if (
    citiesMatch(
      { city: nextCityName },
      { city: routeLabel, citySlug: routeSlug },
    )
  ) {
    return false;
  }

  return true;
}

export function buildCityChangeConfirmMessage(routeCityLabel: string | null | undefined): string {
  const city = String(routeCityLabel || '').trim() || 'текущем городе';
  return `Переключить город? Ваши сохраненные точки в г. ${city} будут удалены из «Моего дня».`;
}

export function buildAddForeignCityConfirmMessage(
  routeCityLabel: string,
  incomingCityLabel: string,
): string {
  const from = String(routeCityLabel || '').trim() || 'другого города';
  const to = String(incomingCityLabel || '').trim() || 'новый город';
  return `В вашем плане дня сейчас находятся места из г. ${from}. Чтобы начать планировать поездку в г. ${to}, нужно очистить текущий план.`;
}

/** Route non-empty and incoming point city differs from route dominant. */
export function dayRouteConflictsWithIncomingCity(
  venues: DayRouteVenueItem[],
  incoming: { city?: string | null; citySlug?: string | null },
): boolean {
  if (!venues.length) return false;
  const inTitle = normalizeDayRouteCityTitle(incoming.city);
  const inSlug = String(incoming.citySlug || '')
    .trim()
    .toLowerCase();
  if (!inTitle && !inSlug) return false;

  const routeLabel = resolveDayRouteCityLabel(venues);
  const routeSlug = dayRouteDominantCitySlug(venues);
  if (!routeLabel && !routeSlug) return false;

  if (citiesMatch(incoming, { city: routeLabel, citySlug: routeSlug })) return false;
  return true;
}

export function applyClearDayRouteForCityChange(): void {
  clearDayRoute();
}

type ConfirmFn = (message: string) => boolean | Promise<boolean>;

/**
 * Guard used by SelectedCityProvider. Inject `confirmFn` (custom modal);
 * without it, empty/same-city paths still resolve; filled-route without confirm → deny.
 */
export async function confirmClearDayRouteForCityChange(
  nextCityName: string,
  currentCityValue: string,
  confirmFn?: ConfirmFn,
): Promise<boolean> {
  const venues = typeof window === 'undefined' ? [] : readDayRoute().venues;
  if (!dayRouteNeedsClearForCityChange(nextCityName, currentCityValue, venues)) return true;

  const routeLabel = resolveDayRouteCityLabel(venues) || (currentCityValue === 'all' ? null : currentCityValue);
  const message = buildCityChangeConfirmMessage(routeLabel);
  if (!confirmFn) return false;
  const ok = await confirmFn(message);
  if (!ok) return false;
  clearDayRoute();
  return true;
}
