'use client';

import type { ReactNode } from 'react';
import { Car, Clock, MapPin, PersonStanding, Sparkles } from 'lucide-react';

type TravelMode = 'walk' | 'auto';

type MyDayToolbarProps = {
  stopsCount: number;
  stopsHeading: string;
  distanceLabel: string | null;
  travelMinutesLabel: string | null;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  canOptimize: boolean;
  onOptimize: () => void;
  hourPlanOn: boolean;
  canHourPlan: boolean;
  onToggleHourPlan: () => void;
  onOpenHourSheet: () => void;
  hourStart?: string;
  hourEnd?: string;
  onHourStartChange?: (v: string) => void;
  onHourEndChange?: (v: string) => void;
  viewToggle?: ReactNode;
  shareSlot?: ReactNode;
  className?: string;
};

/**
 * Sticky route toolbar (Lovable pattern): totals + walk/auto + optimize + «По часам».
 */
export function MyDayToolbar({
  stopsCount,
  stopsHeading,
  distanceLabel,
  travelMinutesLabel,
  travelMode,
  onTravelModeChange,
  canOptimize,
  onOptimize,
  hourPlanOn,
  canHourPlan,
  onToggleHourPlan,
  onOpenHourSheet,
  hourStart,
  hourEnd,
  onHourStartChange,
  onHourEndChange,
  viewToggle,
  shareSlot,
  className = '',
}: MyDayToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Управление маршрутом"
      aria-orientation="horizontal"
      data-my-day-toolbar="1"
      className={`sticky top-[calc(var(--site-header-height)+0.5rem)] z-20 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4 lg:top-2 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
          <MapPin className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
          <span className="truncate" data-day-route-count-heading>
            {stopsHeading}
          </span>
          <span className="sr-only">{stopsCount}</span>
        </span>
        {distanceLabel ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            {travelMode === 'auto' ? (
              <Car className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <PersonStanding className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>
              <span className="font-semibold text-slate-800">{distanceLabel}</span>
              {travelMinutesLabel ? (
                <>
                  {' '}
                  · в пути ~{travelMinutesLabel}{' '}
                  {travelMode === 'auto' ? 'на авто' : 'пешком'}
                </>
              ) : null}
            </span>
          </span>
        ) : null}
        {viewToggle ? <div className="ml-auto hidden lg:block">{viewToggle}</div> : null}
      </div>

      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full border border-slate-200 p-0.5"
            role="group"
            aria-label="Способ передвижения"
            data-day-travel-mode
          >
            <button
              type="button"
              onClick={() => onTravelModeChange('walk')}
              aria-pressed={travelMode === 'walk'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                travelMode === 'walk'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PersonStanding className="h-4 w-4" aria-hidden />
              Пешком
            </button>
            <button
              type="button"
              onClick={() => onTravelModeChange('auto')}
              aria-pressed={travelMode === 'auto'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                travelMode === 'auto'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Car className="h-4 w-4" aria-hidden />
              Авто
            </button>
          </div>

          {canOptimize ? (
            <button
              type="button"
              onClick={onOptimize}
              data-day-map-optimize
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-slate-400" aria-hidden />
              Оптимизировать
            </button>
          ) : null}

          {canHourPlan ? (
            <button
              type="button"
              onClick={() => {
                if (hourPlanOn) onToggleHourPlan();
                else onOpenHourSheet();
              }}
              aria-pressed={hourPlanOn}
              data-day-hour-plan
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                hourPlanOn
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock className="h-4 w-4" aria-hidden />
              По часам
            </button>
          ) : null}

          {hourPlanOn && onHourStartChange && onHourEndChange ? (
            <>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm">
                <span className="text-slate-500">Старт</span>
                <input
                  type="time"
                  value={hourStart || '10:00'}
                  onChange={(e) => onHourStartChange(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                />
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm">
                <span className="text-slate-500">Финиш</span>
                <input
                  type="time"
                  value={hourEnd || '22:00'}
                  onChange={(e) => onHourEndChange(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                />
              </label>
            </>
          ) : null}

          {shareSlot}
        </div>
      </div>
    </div>
  );
}
