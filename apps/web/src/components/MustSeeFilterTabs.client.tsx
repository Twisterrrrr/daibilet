'use client';

import type { MustSeeFilterId, MustSeeFilterTab } from '@/lib/must-see-filters';

type Props = {
  tabs: MustSeeFilterTab[];
  activeId: MustSeeFilterId;
  onChange: (id: MustSeeFilterId) => void;
  /** Softer zinc palette for editorial city hubs. */
  editorial?: boolean;
  /** Hide numeric counts on chips (My Day owner: text-only labels). */
  hideCount?: boolean;
};

/**
 * Must-see category chips.
 * Mobile: one-row horizontal carousel (fit-content chips).
 * sm+: classic wrap.
 */
export function MustSeeFilterTabs({
  tabs,
  activeId,
  onChange,
  editorial = false,
  hideCount = false,
}: Props) {
  if (tabs.length < 2) return null;

  return (
    <div
      className="mt-3 -mx-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:thin] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0"
      data-must-see-filters-scroll
    >
      <div
        className="flex w-max flex-nowrap items-center gap-2 sm:w-auto sm:flex-wrap"
        role="tablist"
        aria-label="Фильтр главных мест"
        data-must-see-filters
        data-must-see-filters-layout="row-scroll"
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
              className={`inline-flex w-auto min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? editorial
                    ? 'bg-zinc-900 text-white'
                    : 'bg-slate-900 text-white'
                  : editorial
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              {!hideCount ? (
                <span
                  className={`tabular-nums ${
                    active ? 'text-white/80' : editorial ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
