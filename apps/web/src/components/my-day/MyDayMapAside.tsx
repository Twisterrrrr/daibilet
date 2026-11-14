'use client';

import type { ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';

type MyDayMapAsideProps = {
  mapOpen: boolean;
  onOpenFull?: () => void;
  children: ReactNode;
  toolbar?: ReactNode;
};

/**
 * Desktop sticky map column with Lovable collapse rail (56px when closed).
 * Map is edge-to-edge in the column - no padding gutters for Leaflet to mis-size.
 */
export function MyDayMapAside({
  mapOpen,
  onOpenFull,
  children,
  toolbar,
}: MyDayMapAsideProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-none border-0 bg-slate-100"
      data-my-day-map-aside="1"
      data-day-route-map-wrap
      data-day-route-map-desktop
    >
      {/* The zoom controls sit alongside the stop rail; keep fullscreen in the top corner. */}
      {mapOpen && onOpenFull ? (
        <button
          type="button"
          onClick={onOpenFull}
          aria-label="Открыть карту на весь экран"
          title="Карта на весь экран"
          data-my-day-map-full
          className="absolute right-3 top-3 z-[500] grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {mapOpen ? (
        <>
          {toolbar ? (
            <div className="pointer-events-none absolute inset-x-3 top-14 z-[450] sm:inset-x-4">
              <div className="pointer-events-auto">{toolbar}</div>
            </div>
          ) : null}
          <div className="absolute inset-0 overflow-hidden bg-slate-100">{children}</div>
        </>
      ) : (
        <div className="h-full w-full bg-slate-100" aria-hidden />
      )}
    </div>
  );
}
