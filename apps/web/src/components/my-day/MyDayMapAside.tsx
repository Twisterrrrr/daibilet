'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

type MyDayMapAsideProps = {
  mapOpen: boolean;
  onToggleOpen: () => void;
  onOpenFull?: () => void;
  children: ReactNode;
  toolbar?: ReactNode;
};

/**
 * Desktop sticky map column with Lovable collapse rail (56px when closed).
 */
export function MyDayMapAside({
  mapOpen,
  onToggleOpen,
  onOpenFull,
  children,
  toolbar,
}: MyDayMapAsideProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:rounded-none lg:border-0 lg:border-l lg:border-slate-200"
      data-my-day-map-aside="1"
      data-day-route-map-wrap
      data-day-route-map-desktop
    >
      {/*
        Chrome corners must not stack on Leaflet zoom (was: Свернуть + fullscreen + +/-
        all fighting in the top-right). Collapse sits on the panel edge (left);
        fullscreen alone top-right; zoom is bottom-right inside DayRouteOsmMap.
      */}
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={mapOpen}
        aria-label={mapOpen ? 'Свернуть карту' : 'Развернуть карту'}
        title={mapOpen ? 'Свернуть карту' : 'Развернуть карту'}
        data-my-day-map-collapse
        className={`absolute top-3 z-[500] inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 ${
          mapOpen ? 'left-3 px-3 py-1.5' : 'left-1/2 -translate-x-1/2 p-2'
        }`}
      >
        {mapOpen ? (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden /> Свернуть
          </>
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>

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
        <div className="flex h-full flex-col p-3 pt-12 sm:p-4 sm:pt-12">
          {toolbar ? <div className="mb-2 shrink-0">{toolbar}</div> : null}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-slate-100">
            {children}
          </div>
        </div>
      ) : (
        <div className="h-full w-full bg-slate-100" aria-hidden />
      )}
    </div>
  );
}
