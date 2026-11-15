'use client';

import type { ReactNode } from 'react';
import { Clock, Filter, Footprints, MapPin, Plus, Trash2, Wand2 } from 'lucide-react';

export type MyDayStopTypeCount = {
  tag: string;
  count: number;
};

type MyDayToolbarProps = {
  stopsCount: number;
  stopsCountLabel: string;
  cityLabel: string;
  onAddPlaces: () => void;
  distanceLabel: string | null;
  travelMinutesLabel: string | null;
  canOptimize: boolean;
  onOptimize: () => void;
  onClear: () => void;
  typeCounts?: MyDayStopTypeCount[];
  hiddenTags?: string[];
  visibleStopsCount?: number;
  onToggleTag?: (tag: string) => void;
  onShowAllTags?: () => void;
  settingsSlot?: ReactNode;
  scheduleSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Compact route summary and actions above the itinerary. */
export function MyDayToolbar({
  stopsCount,
  stopsCountLabel,
  cityLabel,
  onAddPlaces,
  distanceLabel,
  travelMinutesLabel,
  canOptimize,
  onOptimize,
  onClear,
  typeCounts = [],
  hiddenTags = [],
  visibleStopsCount,
  onToggleTag,
  onShowAllTags,
  settingsSlot,
  scheduleSlot,
  children,
  className = '',
}: MyDayToolbarProps) {
  const showTypes = typeCounts.length > 1 && onToggleTag;
  const shown = visibleStopsCount ?? stopsCount;

  return (
    <div className={className.trim() || undefined} data-my-day-toolbar-wrap>
      <div
        role="toolbar"
        aria-label="Управление маршрутом"
        aria-orientation="horizontal"
        data-my-day-toolbar="1"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-0 lg:z-30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Мой день</p>
            <p className="mt-0.5 truncate text-base font-bold leading-5 text-slate-900">{cityLabel}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" data-day-route-summary>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900">
            <MapPin className="h-3.5 w-3.5 text-rose-500" aria-hidden />
            <span data-day-route-count-heading>{stopsCountLabel}</span>
          </span>
          {distanceLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900">
              <Footprints className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {distanceLabel}
            </span>
          ) : null}
          {travelMinutesLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900">
              <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {travelMinutesLabel} в пути
            </span>
          ) : null}
          <span className="sr-only">{stopsCount}</span>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2" data-my-day-toolbar-controls>
          <button
            type="button"
            onClick={onAddPlaces}
            data-day-add-places
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-2 text-xs font-semibold text-slate-800 transition hover:border-primary-400 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Добавить места
          </button>
          <button
            type="button"
            onClick={onOptimize}
            disabled={!canOptimize}
            data-day-map-optimize
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Оптимизировать
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={stopsCount <= 0}
            title="Очистить маршрут"
            aria-label="Очистить маршрут"
            data-day-clear
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {scheduleSlot ? <div className="mt-3">{scheduleSlot}</div> : null}
      </div>

      <p id="dnd-hint" className="sr-only" data-my-day-dnd-hint>
        Порядок можно менять мышью или с клавиатуры: фокус на ручке перетаскивания, стрелки вверх / вниз, пробел - взять и отпустить, Escape - отменить.
      </p>

      <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <summary className="cursor-pointer font-medium">Настройки маршрута</summary>
        {settingsSlot}
        {showTypes ? (
          <div className="mt-3 border-t border-slate-200 pt-3" data-my-day-type-filters>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Filter className="h-4 w-4 text-primary-600" aria-hidden /> Типы точек
              </p>
              <p className="text-xs text-slate-500">Показано {shown} из {stopsCount}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Фильтр точек по типу">
              {typeCounts.map(({ tag, count }) => {
                const on = !hiddenTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      on ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tag} · {count}
                  </button>
                );
              })}
              {hiddenTags.length && onShowAllTags ? (
                <button
                  type="button"
                  onClick={onShowAllTags}
                  className="rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Показать все
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </details>

      {children}
    </div>
  );
}
