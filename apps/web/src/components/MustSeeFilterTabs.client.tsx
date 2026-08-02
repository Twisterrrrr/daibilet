'use client';

import type { MustSeeFilterId, MustSeeFilterTab } from '@/lib/must-see-filters';

type Props = {
  tabs: MustSeeFilterTab[];
  activeId: MustSeeFilterId;
  onChange: (id: MustSeeFilterId) => void;
  /** Softer zinc palette for editorial city hubs. */
  editorial?: boolean;
};

/** Chip tabs for must-see filters. Hidden by parent when tabs.length < 2. */
export function MustSeeFilterTabs({ tabs, activeId, onChange, editorial = false }: Props) {
  if (tabs.length < 2) return null;

  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Фильтр главных мест"
      data-must-see-filters
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-must-see-filter={tab.id}
            data-active={active ? '1' : '0'}
            onClick={() => onChange(tab.id)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? editorial
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-slate-900 bg-slate-900 text-white'
                : editorial
                  ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`tabular-nums ${
                active ? 'text-white/80' : editorial ? 'text-zinc-400' : 'text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
