'use client';

import * as React from 'react';

type FilterChip = { value: string; label: string };

/**
 * Unified responsive filter row — single block adapts to container width.
 * Desktop (lg+): inline horizontal chips + dividers.
 * Mobile/tablet (<lg): scrollable horizontal chips, stacked vertically.
 */
export function LandingFilterRow({
  dateChips,
  dateFilter,
  setDateFilter,
  showCityFilter,
  cityChip,
  visibleCityNames,
  overflowCityNames,
  city,
  selectCity,
  showTimeSlot,
  timeSlotSelect,
  genreChipRow,
  category,
  setCategory,
  categories,
  sort,
  setSort,
  sortTabs,
  hideSort,
}: {
  dateChips: FilterChip[];
  dateFilter: string;
  setDateFilter: (v: string) => void;
  showCityFilter: boolean;
  cityChip: (value: string, label: string, active: boolean) => React.ReactNode;
  visibleCityNames: string[];
  overflowCityNames: string[];
  city: string;
  selectCity: (v: string) => void;
  showTimeSlot: boolean;
  timeSlotSelect: React.ReactNode;
  genreChipRow: React.ReactNode;
  category: string;
  setCategory: (v: string) => void;
  categories: Record<string, number>;
  sort: string;
  setSort: (v: string) => void;
  sortTabs: Array<{ value: string; label: string }>;
  hideSort?: boolean;
}) {
  const hasCategories = Object.keys(categories).length > 1;

  return (
    <div className="space-y-2">
      {/* Sort tabs — desktop only */}
      {!hideSort ? (
        <div className="hidden items-center gap-1 border-b border-border sm:flex">
          {sortTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSort(tab.value)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${sort === tab.value ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
              {sort === tab.value ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {/* Filter chips — single block, adapts via CSS */}
      <div className="flex flex-wrap items-center gap-2 max-w-fit">
        {/* Date chips */}
        {dateChips.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dateChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setDateFilter(chip.value)}
                className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                  dateFilter === chip.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* City chips */}
        {showCityFilter ? (
          <>
            {dateChips.length > 0 ? <div className="mx-1 h-6 w-px bg-border hidden sm:block" /> : null}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cityChip('all', 'Все города', city === 'all')}
              {visibleCityNames.map((name) => cityChip(name, name, city === name))}
              {overflowCityNames.length > 0 ? (
                <select
                  value={overflowCityNames.includes(city) ? city : ''}
                  onChange={(e) => { if (e.target.value) selectCity(e.target.value); }}
                  className="h-9 shrink-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Ещё {overflowCityNames.length}</option>
                  {overflowCityNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              ) : null}
            </div>
          </>
        ) : null}

        {/* Time slot */}
        {showTimeSlot ? (
          <>
            <div className="mx-1 h-6 w-px bg-border hidden sm:block" />
            {timeSlotSelect}
          </>
        ) : null}

        {/* Genre chips */}
        {genreChipRow}

        {/* Category */}
        {hasCategories ? (
          <>
            <div className="mx-1 h-6 w-px bg-border hidden sm:block" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 w-[170px] rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Все форматы</option>
              {Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, count]) => (
                  <option key={name} value={name}>{name} · {count}</option>
                ))}
            </select>
          </>
        ) : null}
      </div>

      {/* Sort dropdown — mobile only */}
      {!hideSort ? (
        <div className="flex items-center gap-2 sm:hidden">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Сортировать:</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {sortTabs.map((tab) => (
              <option key={tab.value} value={tab.value}>{tab.label}</option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
