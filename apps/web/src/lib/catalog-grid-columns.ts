'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

/** Match `.catalog-card-grid` + collapsed auto-fill track max (~18.5rem). */
const COLLAPSED_TRACK_MAX_PX = 18.5 * 16;
const COLLAPSED_GRID_GAP_PX = 20;

export function estimateCatalogGridColumns(
  viewportWidth: number,
  filtersCollapsed: boolean,
): number {
  if (viewportWidth < 768) return 2;
  if (viewportWidth < 1024) return 3;
  if (filtersCollapsed) {
    const contentWidth = Math.max(viewportWidth - 48, COLLAPSED_TRACK_MAX_PX);
    return Math.max(
      3,
      Math.floor((contentWidth + COLLAPSED_GRID_GAP_PX) / (COLLAPSED_TRACK_MAX_PX + COLLAPSED_GRID_GAP_PX)),
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

export function useCatalogGridColumnCount(
  gridRef: RefObject<HTMLElement | null>,
  filtersCollapsed: boolean,
  itemCount: number,
): number {
  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return 4;
    return estimateCatalogGridColumns(window.innerWidth, filtersCollapsed);
  });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    setColumns(estimateCatalogGridColumns(window.innerWidth, filtersCollapsed));
  }, [filtersCollapsed]);

  useLayoutEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const measure = () => {
      const next = readGridColumnCount(node);
      setColumns((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [gridRef, filtersCollapsed, itemCount]);

  return columns;
}
