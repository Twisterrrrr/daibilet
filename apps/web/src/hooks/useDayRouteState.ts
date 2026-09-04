'use client';

import { useSyncExternalStore } from 'react';

import {
  getDayRouteSnapshot,
  getServerDayRouteSnapshot,
  subscribeDayRoute,
  type DayRouteState,
} from '@/lib/day-route';

/** Single source of truth for badge count and catalog «В маршруте» buttons. */
export function useDayRouteState(): DayRouteState {
  return useSyncExternalStore(subscribeDayRoute, getDayRouteSnapshot, getServerDayRouteSnapshot);
}
