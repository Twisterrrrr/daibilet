'use client';

import { useSyncExternalStore } from 'react';

import {
  getDayRouteSnapshot,
  getServerDayRouteSnapshot,
  subscribeDayRoute,
  type DayRouteState,
} from '@/lib/day-route';

/**
 * useSyncExternalStore subscribe contract: onStoreChange takes no args.
 * Module-level so the subscribe identity stays stable across renders.
 */
function subscribe(onStoreChange: () => void): () => void {
  return subscribeDayRoute(() => {
    onStoreChange();
  });
}

/** Single source of truth for badge count and catalog «В маршруте» buttons. */
export function useDayRouteState(): DayRouteState {
  return useSyncExternalStore(subscribe, getDayRouteSnapshot, getServerDayRouteSnapshot);
}
