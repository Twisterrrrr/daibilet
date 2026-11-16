'use client';

import { Plus } from 'lucide-react';

import type { MyDayPickerSection, MyDayPickerTab } from './MyDayPickerSheet';

type MyDayFloatingPickerDockProps = {
  tabs: MyDayPickerTab[];
  onOpen: (section: MyDayPickerSection) => void;
};

/**
 * Desktop shortcut to open the picker drawer after the route has stops.
 */
export function MyDayFloatingPickerDock({ tabs, onOpen }: MyDayFloatingPickerDockProps) {
  if (!tabs.length) return null;

  return (
    <div
      className="my-day-floating-picker-dock pointer-events-none sticky top-2 z-40 hidden lg:block print:hidden"
      data-my-day-floating-picker
    >
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => onOpen(tabs[0]?.value ?? 'scenarios')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-md transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Подбор
        </button>
      </div>
    </div>
  );
}
