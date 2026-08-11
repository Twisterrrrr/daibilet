'use client';

import { formatDayRouteHHMMFromMinutes } from '@/lib/day-route-soft-timing';
import type { DayRouteHourPlanResult } from '@/lib/day-route-soft-timing';
import type { DayRouteVenueItem } from '@/lib/day-route';

type MyDayHourGanttProps = {
  venues: DayRouteVenueItem[];
  plan: DayRouteHourPlanResult;
  dayStartHHMM: string;
  dayEndHHMM: string;
  onFocusStop?: (id: string) => void;
  className?: string;
};

function parseHHMM(raw: string): number {
  const m = String(raw || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 10 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Visual day schedule (Lovable hour-plan parity as a Gantt strip).
 * Bars from soft hour-plan hints - not a full drag-resize editor.
 */
export function MyDayHourGantt({
  venues,
  plan,
  dayStartHHMM,
  dayEndHHMM,
  onFocusStop,
  className = '',
}: MyDayHourGanttProps) {
  const dayStart = parseHHMM(dayStartHHMM);
  let dayEnd = parseHHMM(dayEndHHMM);
  if (dayEnd <= dayStart) dayEnd = dayStart + 8 * 60;
  const span = Math.max(60, dayEnd - dayStart);

  const ticks: number[] = [];
  for (let t = Math.ceil(dayStart / 60) * 60; t <= dayEnd; t += 60) ticks.push(t);

  const byId = new Map(venues.map((v) => [v.id, v]));
  const rows = plan.hints.filter((h) => h.kind !== 'lunch' || true);
  const overflow = new Set(plan.overflowIds);

  if (!rows.length && !plan.lunchHint) return null;

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 ${className}`.trim()}
      data-my-day-hour-gantt="1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">График дня</p>
        <p className="text-xs text-slate-500">
          {dayStartHHMM} - {dayEndHHMM}
          {plan.totalLabel ? ` · ${plan.totalLabel}` : ''}
        </p>
      </div>

      <div className="relative mt-3 overflow-x-auto">
        <div className="min-w-[28rem]">
          <div className="relative mb-2 h-5 border-b border-slate-100">
            {ticks.map((t) => {
              const left = ((t - dayStart) / span) * 100;
              return (
                <span
                  key={t}
                  className="absolute top-0 -translate-x-1/2 text-[10px] font-medium text-slate-400"
                  style={{ left: `${left}%` }}
                >
                  {formatDayRouteHHMMFromMinutes(t)}
                </span>
              );
            })}
          </div>

          <ul className="space-y-1.5">
            {plan.lunchHint ? (
              <li className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2">
                <span className="truncate text-xs font-medium text-amber-800">Обед</span>
                <div className="relative h-7 rounded-md bg-slate-50">
                  <div
                    className="absolute inset-y-0.5 rounded bg-amber-200/90"
                    style={{
                      left: `${((plan.lunchHint.startMin - dayStart) / span) * 100}%`,
                      width: `${Math.max(
                        2,
                        ((plan.lunchHint.endMin - plan.lunchHint.startMin) / span) * 100,
                      )}%`,
                    }}
                    title={plan.lunchHint.label}
                  />
                </div>
              </li>
            ) : null}

            {rows
              .filter((h) => h.kind !== 'lunch')
              .map((hint) => {
                const venue = byId.get(hint.venueId);
                const title = venue?.title || 'Точка';
                const bad = overflow.has(hint.venueId);
                const left = ((hint.startMin - dayStart) / span) * 100;
                const width = Math.max(2, ((hint.endMin - hint.startMin) / span) * 100);
                return (
                  <li
                    key={hint.venueId}
                    className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2"
                  >
                    <button
                      type="button"
                      className="truncate text-left text-xs font-medium text-slate-700 hover:text-primary-700"
                      onClick={() => onFocusStop?.(hint.venueId)}
                      title={title}
                    >
                      {title}
                    </button>
                    <div className="relative h-7 rounded-md bg-slate-50">
                      <button
                        type="button"
                        onClick={() => onFocusStop?.(hint.venueId)}
                        className={`absolute inset-y-0.5 overflow-hidden rounded px-1.5 text-left text-[10px] font-semibold text-white ${
                          bad ? 'bg-rose-500' : hint.kind === 'point' ? 'bg-sky-600' : 'bg-primary-600'
                        }`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${hint.label} · ${title}`}
                      >
                        <span className="block truncate">{hint.label}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      {overflow.size ? (
        <p className="mt-2 text-xs text-rose-700" role="status">
          {overflow.size === 1
            ? '1 точка не помещается в выбранное окно.'
            : `${overflow.size} точки не помещаются в выбранное окно.`}
        </p>
      ) : null}
    </div>
  );
}
