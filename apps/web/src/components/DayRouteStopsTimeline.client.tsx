'use client';

import { MapPin } from 'lucide-react';

import { CardSafeImage } from '@/components/SafeImage.client';

export type DayRouteTimelineStop = {
  id: string;
  title: string;
  imageUrl?: string | null;
};

type Props = {
  stops: DayRouteTimelineStop[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  /** Optional aria label for the rail. */
  label?: string;
};

/**
 * Horizontal route steps: numbered circles + connector + optional thumb + short title.
 * Paired with Сетка (swipe carousel) on /my-day; hidden in Wanderlog Список.
 */
export function DayRouteStopsTimeline({
  stops,
  activeId = null,
  onSelect,
  className = '',
  label = 'Шаги маршрута',
}: Props) {
  if (!stops.length) return null;

  return (
    <div
      className={`rounded-2xl bg-[#F5F5F7] px-3 py-3 sm:px-4 sm:py-3.5 ${className}`}
      data-day-stops-timeline
    >
      <div
        className="horizontal-snap-row flex snap-x snap-mandatory gap-0 overflow-x-auto overscroll-x-contain pb-0.5"
        role="list"
        aria-label={label}
      >
        {stops.map((stop, index) => {
          const active = activeId ? activeId === stop.id : index === 0;
          const isLast = index >= stops.length - 1;
          return (
            <div
              key={stop.id}
              role="listitem"
              className="relative flex w-[5.25rem] shrink-0 snap-start flex-col items-center sm:w-[5.75rem]"
              data-day-timeline-step={stop.id}
              data-active={active ? '1' : '0'}
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-[calc(50%+0.85rem)] top-[0.95rem] z-0 h-0.5 w-[calc(100%-1.7rem)] bg-slate-300/90 sm:top-[1.05rem]"
                  data-day-timeline-connector
                />
              ) : null}
              <button
                type="button"
                onClick={() => onSelect?.(stop.id)}
                className="relative z-[1] flex w-full flex-col items-center gap-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-current={active ? 'step' : undefined}
                aria-label={`Шаг ${index + 1}: ${stop.title}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm transition sm:h-9 sm:w-9 ${
                    active
                      ? 'bg-primary-600 text-white ring-2 ring-primary-200'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                  data-day-timeline-number
                >
                  {index + 1}
                </span>
                {stop.imageUrl ? (
                  <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-white ring-1 ring-black/5 sm:h-10 sm:w-10">
                    <CardSafeImage
                      src={stop.imageUrl}
                      alt=""
                      fill
                      sizes="2.5rem"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 via-slate-100 to-primary-100 text-slate-500 ring-1 ring-black/5 sm:h-10 sm:w-10">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                  </span>
                )}
                <span
                  className={`line-clamp-2 min-h-[2rem] w-full px-0.5 text-[11px] font-semibold leading-tight sm:text-xs ${
                    active ? 'text-primary-700' : 'text-slate-700'
                  }`}
                >
                  {stop.title}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
