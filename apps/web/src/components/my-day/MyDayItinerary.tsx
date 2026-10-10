'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type MyDayItineraryProps = {
  children: ReactNode;
  className?: string;
};

/** List column wrapper for route stops + between-leg inserts. */
export function MyDayItinerary({ children, className = '' }: MyDayItineraryProps) {
  return (
    <div className={`mt-3 min-w-0 ${className}`.trim()} data-my-day-itinerary="1" data-day-route-list>
      {children}
    </div>
  );
}

type MyDayScheduleBannerProps = {
  overflowCount: number;
  totalLabel?: string | null;
  lunchLabel?: string | null;
  onTrimOverflow?: () => void;
  onExtendEnd?: () => void;
};

/**
 * «По часам» conflict / lunch hints (Lovable schedule mode, not Gantt).
 */
export function MyDayScheduleBanner({
  overflowCount,
  totalLabel,
  lunchLabel,
  onTrimOverflow,
  onExtendEnd,
}: MyDayScheduleBannerProps) {
  if (!overflowCount && !lunchLabel && !totalLabel) return null;

  return (
    <div className="mt-3 space-y-2" data-my-day-schedule-banner>
      {totalLabel ? (
        <p className="text-xs font-medium text-slate-600" data-day-hour-total>
          График: {totalLabel}
        </p>
      ) : null}
      {lunchLabel ? (
        <p
          className="rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900"
          data-day-hour-lunch
        >
          Обед в графике: {lunchLabel}
        </p>
      ) : null}
      {overflowCount > 0 ? (
        <div
          className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
          data-day-hour-overflow
          role="status"
        >
          <p className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {overflowCount === 1
                ? '1 точка не вмещается в выбранное окно.'
                : `${overflowCount} точки не вмещаются в выбранное окно.`}{' '}
              Уберите лишние или продлите график.
            </span>
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            {onTrimOverflow ? (
              <button
                type="button"
                onClick={onTrimOverflow}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Убрать лишние
              </button>
            ) : null}
            {onExtendEnd ? (
              <button
                type="button"
                onClick={onExtendEnd}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Продлить график
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
