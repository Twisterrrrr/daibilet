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
 * Lovable-style adaptive shell: list scroll + sticky map (collapse to 56px rail).
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
      ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'
      : 'lg:grid-cols-[minmax(0,1fr)_56px]';

  return (
    <div
      className={`flex flex-col gap-4 lg:grid lg:items-start lg:gap-0 ${gridClass} ${className}`.trim()}
      data-my-day-shell="1"
      data-my-day-map-open={showMapColumn && mapOpen ? '1' : '0'}
    >
      <div
        className="min-w-0 lg:overflow-y-auto lg:max-h-[calc(100vh-var(--site-header-height)-6rem)] lg:pr-3"
        data-my-day-list-col
      >
        {list}
      </div>
      {showMapColumn ? (
        <aside
          className="relative hidden lg:sticky lg:top-[var(--site-header-height)] lg:block lg:h-[calc(100vh-var(--site-header-height)-1rem)] lg:self-start"
          data-my-day-map-col
        >
          {map}
        </aside>
      ) : null}
    </div>
  );
}
