'use client';

import { useCallback, useState } from 'react';

/**
 * Wave 1 controller: Lovable-style layout chrome for /my-day.
 * Route/LS/catalog orchestration stays in DayRoutePanel until Wave 1.5 extraction.
 * Map starts collapsed. Desktop auto-opens at 2+ stops with coords; collapses on empty route.
 */
export function useMyDayController() {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapFull, setMapFull] = useState(false);
  const [mobileMapSheetOpen, setMobileMapSheetOpen] = useState(false);

  const toggleMapOpen = useCallback(() => {
    setMapOpen((v) => !v);
  }, []);

  const openMobileMap = useCallback(() => {
    setMobileMapSheetOpen(true);
  }, []);

  const closeMobileMap = useCallback(() => {
    setMobileMapSheetOpen(false);
  }, []);

  const openMapFull = useCallback(() => {
    setMapFull(true);
  }, []);

  const closeMapFull = useCallback(() => {
    setMapFull(false);
  }, []);

  return {
    mapOpen,
    setMapOpen,
    toggleMapOpen,
    mapFull,
    openMapFull,
    closeMapFull,
    mobileMapSheetOpen,
    openMobileMap,
    closeMobileMap,
    setMobileMapSheetOpen,
  };
}

export type MyDayController = ReturnType<typeof useMyDayController>;
