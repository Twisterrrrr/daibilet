'use client';

import type { ReactNode } from 'react';

type MyDayShellProps = {
  mapOpen: boolean;
  list: ReactNode;
  map: ReactNode;
  /** When false, map column hidden on lg (no coords). */
  showMapColumn?: boolean;
  className?: string;
};

/**
 * Desktop split: list column (H1 / picker / route) + sticky map.
 * Grid sits high enough that opening the map narrows every left block together.
 */
export function MyDayShell({
  mapOpen,
  list,
  map,
  showMapColumn = true,
  className = '',
}: MyDayShellProps) {
  const gridClass = !showMapColumn
    ? 'lg:grid-cols-1'
    : mapOpen
      ? 'lg:grid-cols-[minmax(24rem,1.2fr)_minmax(16rem,0.85fr)]'
      : 'lg:grid-cols-[minmax(0,1fr)_56px]';

  return (
    <div
      className={`flex flex-col gap-4 lg:grid lg:items-start lg:gap-0 ${gridClass} ${className}`.trim()}
      data-my-day-shell="1"
      data-my-day-map-open={showMapColumn && mapOpen ? '1' : '0'}
    >
      <div className="min-w-0 lg:pr-4" data-my-day-list-col>
        {list}
      </div>
      {showMapColumn ? (
        <aside
          className="relative hidden lg:sticky lg:top-[var(--site-header-height)] lg:block lg:h-[calc(100vh-var(--site-header-height))] lg:self-start"
          data-my-day-map-col
        >
          {map}
        </aside>
      ) : null}
    </div>
  );
}
