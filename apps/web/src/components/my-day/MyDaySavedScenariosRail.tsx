'use client';

import { X } from 'lucide-react';
import type { DayRouteSavedScenario } from '@/lib/day-route-scenarios';

type MyDaySavedScenariosRailProps = {
  scenarios: DayRouteSavedScenario[];
  activeId?: string | null;
  onLoad: (scenario: DayRouteSavedScenario) => void;
  onRemove: (scenario: DayRouteSavedScenario) => void;
  className?: string;
  /** Compact list inside picker; chips in the itinerary feed. */
  variant?: 'feed' | 'picker';
};

/** Lovable: saved snapshots live in the left itinerary column, not only in the picker. */
export function MyDaySavedScenariosRail({
  scenarios,
  activeId = null,
  onLoad,
  onRemove,
  className = '',
  variant = 'feed',
}: MyDaySavedScenariosRailProps) {
  if (!scenarios.length) return null;

  if (variant === 'picker') {
    return (
      <div className={`border-t border-slate-100 pt-3 ${className}`.trim()} data-day-saved-scenarios>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Мои сценарии</p>
        <ul className="mt-2 space-y-1.5">
          {scenarios.slice(0, 8).map((scenario) => {
            const on = scenario.id === activeId;
            return (
              <li
                key={scenario.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onLoad(scenario)}
                  className={`min-w-0 flex-1 truncate text-left text-sm font-semibold ${
                    on ? 'text-white' : 'text-slate-800 hover:text-primary-700'
                  }`}
                >
                  {scenario.name}
                </button>
                <button
                  type="button"
                  aria-label={`Удалить сценарий ${scenario.name}`}
                  onClick={() => onRemove(scenario)}
                  className={`grid h-7 w-7 place-items-center rounded-full ${
                    on ? 'text-white/80 hover:bg-white/10' : 'text-slate-400 hover:bg-white hover:text-slate-700'
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`.trim()}
      data-day-saved-scenarios-feed="1"
      aria-label="Мои сценарии дня"
    >
      <p className="text-sm font-bold text-slate-900">Мои сценарии дня</p>
      <p className="mt-0.5 text-xs text-slate-500">Снимки маршрута в этом браузере - нажмите, чтобы открыть</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {scenarios.slice(0, 12).map((scenario) => {
          const on = scenario.id === activeId;
          return (
            <span
              key={scenario.id}
              className={`inline-flex max-w-full items-center gap-1 rounded-full border pl-3 pr-1 py-1 ${
                on
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => onLoad(scenario)}
                className="min-w-0 truncate text-left text-xs font-semibold"
                aria-pressed={on}
              >
                {scenario.name}
              </button>
              <button
                type="button"
                aria-label={`Удалить сценарий ${scenario.name}`}
                onClick={() => onRemove(scenario)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  on ? 'text-white/80 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}
