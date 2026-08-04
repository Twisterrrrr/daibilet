/**
 * /my-day city switch guard (isolated module - layout agents often rewrite day-route.ts).
 */

import { clearDayRoute, readDayRoute } from './day-route';

/**
 * Empty route -> allow; >=1 stop -> native confirm, clear on OK.
 * Returns false when the user cancels (caller must not change the city control).
 */
export function confirmClearDayRouteForCityChange(
  nextCityName: string,
  currentCityValue: string,
): boolean {
  if (nextCityName === currentCityValue) return true;
  if (typeof window === 'undefined') return true;
  if (readDayRoute().venues.length === 0) return true;
  const cityLabel = nextCityName === 'all' ? 'Все города' : nextCityName;
  const ok = window.confirm(
    `В маршруте есть точки другого города. Сбросить маршрут и переключиться на ${cityLabel}?`,
  );
  if (!ok) return false;
  clearDayRoute();
  return true;
}
