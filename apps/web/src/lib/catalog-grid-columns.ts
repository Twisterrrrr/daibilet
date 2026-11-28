'use client';

import { useLayoutEffect, useState, useSyncExternalStore, type RefObject } from 'react';

/** Match `.catalog-card-grid` collapsed auto-fit track min (~16.5rem). */
const COLLAPSED_TRACK_MIN_PX = 16.5 * 16;
const COLLAPSED_FILTERS_RAIL_PX = 3.25 * 16 + 12;
const COLLAPSED_GRID_GAP_PX = 20;

/** SSR / hydrate snapshot: 2-col flat (tablet-safe). Desktop upgrades after hydrate. */
const SERVER_CATALOG_COLUMNS = 2;

/** Mirrors `.catalog-card-grid`: 2 → lg:3 → 2xl:4 (for interstitial banner spacing). */
export function estimateCatalogGridColumns(
  viewportWidth: number,
  filtersCollapsed: boolean,
): number {
  if (viewportWidth < 1024) return 2;
  if (filtersCollapsed) {
    const contentWidth = Math.max(
      viewportWidth - 48 - COLLAPSED_FILTERS_RAIL_PX,
      COLLAPSED_TRACK_MIN_PX,
    );
    return Math.max(
      3,
      Math.floor((contentWidth + COLLAPSED_GRID_GAP_PX) / (COLLAPSED_TRACK_MIN_PX + COLLAPSED_GRID_GAP_PX)),
    );
  }
  if (viewportWidth < 1536) return 3;
  return 4;
}

export function readGridColumnCount(element: HTMLElement): number {
  const tracks = getComputedStyle(element)
    .gridTemplateColumns.split(' ')
    .filter((track) => track && track !== '0px' && !track.startsWith('0'));
  if (tracks.length > 0) return tracks.length;

  const children = element.children;
  if (children.length === 0) return 1;
  const firstTop = (children[0] as HTMLElement).offsetTop;
  let cols = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    if (child.offsetTop !== firstTop) break;
    cols += 1;
  }
  return Math.max(1, cols);
}

function subscribeViewport(onStoreChange: () => void): () => void {
  window.addEventListener('resize', onStoreChange);
  return () => window.removeEventListener('resize', onStoreChange);
}

/** Last filtersCollapsed seen by the client snapshot (stable getSnapshot identity). */
let clientFiltersCollapsed = false;

function getClientCatalogColumnsSnapshot(): number {
  return estimateCatalogGridColumns(window.innerWidth, clientFiltersCollapsed);
}

function getServerCatalogColumnsSnapshot(): number {
  return SERVER_CATALOG_COLUMNS;
}

/**
 * Column count for interstitial banner spacing.
 * Viewport estimate via useSyncExternalStore (SSR=2, no window in useState).
 * After mount, ResizeObserver refines from the real CSS grid.
 */
export function useCatalogGridColumnCount(
  gridRef: RefObject<HTMLElement | null>,
  filtersCollapsed: boolean,
  itemCount: number,
): number {
  clientFiltersCollapsed = filtersCollapsed;
  const viewportColumns = useSyncExternalStore(
    subscribeViewport,
    getClientCatalogColumnsSnapshot,
    getServerCatalogColumnsSnapshot,
  );

  const [measuredColumns, setMeasuredColumns] = useState<number | null>(null);

  useLayoutEffect(() => {
    setMeasuredColumns(null);
  }, [filtersCollapsed]);

  useLayoutEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const measure = () => {
      const next = readGridColumnCount(node);
      setMeasuredColumns((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [gridRef, filtersCollapsed, itemCount]);

  return measuredColumns ?? viewportColumns;
}
