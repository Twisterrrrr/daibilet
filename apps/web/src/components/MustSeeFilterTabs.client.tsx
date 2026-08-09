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
 * Mobile: exactly 2 rows + horizontal scroll (grid-flow-col).
 * Chips stay content-width (no equal-column stretch) - short labels like «Музеи 14»
 * must not inherit the width of a longer neighbor in the same grid column.
 * sm+: classic wrap, also fit-content.
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
        className="grid w-max auto-cols-max grid-flow-col grid-rows-2 items-start justify-items-start gap-2 sm:flex sm:w-auto sm:flex-wrap"
        role="tablist"
        aria-label="Фильтр главных мест"
        data-must-see-filters
        data-must-see-filters-layout="rows-2-scroll"
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
              className={`inline-flex w-auto min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? editorial
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-slate-900 bg-slate-900 text-white'
                  : editorial
                    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              {!hideCount ? (
                <span
                  className={`tabular-nums ${
                    active ? 'text-white/80' : editorial ? 'text-zinc-400' : 'text-slate-400'
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
