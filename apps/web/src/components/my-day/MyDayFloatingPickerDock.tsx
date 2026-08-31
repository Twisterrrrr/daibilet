'use client';

import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';

import type { MyDayPickerSection, MyDayPickerTab } from './MyDayPickerSheet';

type MyDayFloatingPickerDockProps = {
  tabs: MyDayPickerTab[];
  onOpen: (section: MyDayPickerSection) => void;
};

/**
 * Desktop: hanging expandable section menu (after route has stops).
 * Replaces the inline picker card so the list + map stay in the container.
 */
export function MyDayFloatingPickerDock({ tabs, onOpen }: MyDayFloatingPickerDockProps) {
  const [expanded, setExpanded] = useState(false);
  if (!tabs.length) return null;

  return (
    <div
      className="pointer-events-none fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block xl:left-4 print:hidden"
      data-my-day-floating-picker
    >
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="my-day-floating-picker-panel"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-md transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800"
        >
          {expanded ? (
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          {expanded ? 'Свернуть' : 'Подбор'}
        </button>
        {expanded ? (
          <nav
            id="my-day-floating-picker-panel"
            aria-label="Разделы подбора точек"
            className="flex w-[min(14rem,calc(100vw-2rem))] flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    onOpen(tab.value);
                    setExpanded(false);
                  }}
                  className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary-800"
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="min-w-0 truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
