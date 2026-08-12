'use client';

import type { ReactNode } from 'react';
import {
  Car,
  Clock,
  FileDown,
  Filter,
  MapPin,
  PersonStanding,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';

type TravelMode = 'walk' | 'auto';

export type MyDayStopTypeCount = {
  tag: string;
  count: number;
};

type MyDayToolbarProps = {
  stopsCount: number;
  /** e.g. «3 точки» like Lovable (not «Маршрут из…»). */
  stopsCountLabel: string;
  distanceLabel: string | null;
  travelMinutesLabel: string | null;
  /** Total with dwells: «4 ч 20 мин с учётом остановок». */
  totalWithStopsLabel: string | null;
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
  onClear: () => void;
  onPrintPdf: () => void;
  printPdfLabel?: string;
  printPdfBusy?: boolean;
  onSaveScenario?: () => void;
  saveScenarioBusy?: boolean;
  onShare?: () => void;
  shareLabel?: string;
  typeCounts?: MyDayStopTypeCount[];
  hiddenTags?: string[];
  visibleStopsCount?: number;
  onToggleTag?: (tag: string) => void;
  onShowAllTags?: () => void;
  /** Hour-plan overflow / lunch banner slot under toolbar card. */
  scheduleSlot?: ReactNode;
  className?: string;
};

/**
 * Lovable sticky route toolbar: stats + mode/optimize/hours/clear + export (no GPX/KML yet)
 * + optional type filter pills.
 */
export function MyDayToolbar({
  stopsCount,
  stopsCountLabel,
  distanceLabel,
  travelMinutesLabel,
  totalWithStopsLabel,
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
  onClear,
  onPrintPdf,
  printPdfLabel = 'PDF с картой',
  printPdfBusy = false,
  onSaveScenario,
  saveScenarioBusy = false,
  onShare,
  shareLabel = 'Поделиться',
  typeCounts = [],
  hiddenTags = [],
  visibleStopsCount,
  onToggleTag,
  onShowAllTags,
  scheduleSlot,
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
        className="sticky top-[calc(var(--site-header-height)+0.35rem)] z-20 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:p-5 lg:top-[calc(var(--site-header-height)+0.5rem)]"
      >
        <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
            <MapPin className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
            <span data-day-route-count-heading>{stopsCountLabel}</span>
            <span className="sr-only">{stopsCount}</span>
          </span>
          {distanceLabel ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-600">
              {travelMode === 'auto' ? (
                <Car className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <PersonStanding className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="truncate">
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
          {totalWithStopsLabel ? (
            <span className="inline-flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              {totalWithStopsLabel} с учётом остановок
            </span>
          ) : null}
        </div>

        {/*
          Lovable parity: mode / optimize / hours / clear stay ONE row (no orphan trash wrap).
          Narrow: horizontal scroll. Export always on its own row below (never lg side-by-side).
        */}
        <div
          className="-mx-1 mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-my-day-toolbar-actions
        >
          <div
            className="inline-flex h-9 shrink-0 items-stretch rounded-full border border-slate-200 p-0.5 box-border"
            role="group"
            aria-label="Способ передвижения"
            data-day-travel-mode
          >
            <button
              type="button"
              onClick={() => onTravelModeChange('walk')}
              aria-pressed={travelMode === 'walk'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${
                travelMode === 'walk'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PersonStanding className="h-4 w-4 shrink-0" aria-hidden />
              Пешком
            </button>
            <button
              type="button"
              onClick={() => onTravelModeChange('auto')}
              aria-pressed={travelMode === 'auto'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${
                travelMode === 'auto'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Car className="h-4 w-4 shrink-0" aria-hidden />
              На авто
            </button>
          </div>

          <button
            type="button"
            onClick={onOptimize}
            disabled={!canOptimize}
            data-day-map-optimize
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 box-border"
          >
            <Wand2 className="h-4 w-4 shrink-0" aria-hidden />
            Оптимизировать
          </button>

          {canHourPlan ? (
            <button
              type="button"
              onClick={() => {
                if (hourPlanOn) onToggleHourPlan();
                else onOpenHourSheet();
              }}
              aria-pressed={hourPlanOn}
              data-day-hour-plan
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition box-border ${
                hourPlanOn
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              По часам
            </button>
          ) : null}

          {hourPlanOn && onHourStartChange && onHourEndChange ? (
            <>
              <label className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm box-border">
                <span className="text-slate-500">Старт</span>
                <input
                  type="time"
                  value={hourStart || '10:00'}
                  onChange={(e) => onHourStartChange(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                />
              </label>
              <label className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm box-border">
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

          <button
            type="button"
            onClick={onClear}
            disabled={stopsCount <= 0}
            title="Очистить маршрут"
            aria-label="Очистить маршрут"
            data-day-clear
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 box-border"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"
          role="group"
          aria-label="Экспорт маршрута"
          data-my-day-toolbar-export
        >
          <span className="sr-only">Экспорт</span>
          {/* GPX / KML deferred by owner 2026-08-11 */}
          <button
            type="button"
            onClick={onPrintPdf}
            disabled={stopsCount <= 0 || printPdfBusy}
            data-day-print
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 box-border"
          >
            <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {printPdfBusy ? 'Готовим PDF…' : printPdfLabel}
          </button>
          {onSaveScenario ? (
            <button
              type="button"
              onClick={onSaveScenario}
              disabled={stopsCount <= 0 || saveScenarioBusy}
              data-day-save-scenario
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 box-border"
            >
              Сохранить как сценарий
            </button>
          ) : null}
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              data-day-share
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-800 transition hover:bg-primary-100 box-border"
            >
              <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {shareLabel}
            </button>
          ) : null}
        </div>

        {scheduleSlot ? <div className="mt-3">{scheduleSlot}</div> : null}
      </div>

      {showTypes ? (
        <div
          className="mt-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:mt-4 sm:p-4"
          data-my-day-type-filters
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4 text-primary-600" aria-hidden /> Типы точек
            </p>
            <p className="text-xs text-slate-500">
              Показано {shown} из {stopsCount}
            </p>
          </div>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Фильтр точек по типу"
          >
            {typeCounts.map(({ tag, count }) => {
              const on = !hiddenTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    on
                      ? 'border-primary-300 bg-primary-50 text-primary-800'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
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

      <p
        id="dnd-hint"
        className="mt-4 hidden text-xs text-slate-500 lg:block"
        data-my-day-dnd-hint
      >
        Порядок можно менять мышью или с клавиатуры: фокус на ручке перетаскивания, стрелки вверх /
        вниз, пробел - взять и отпустить, Escape - отменить.
      </p>
    </div>
  );
}
