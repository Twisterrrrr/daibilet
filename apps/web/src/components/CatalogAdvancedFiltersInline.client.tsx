'use client';

import { ChevronDown } from 'lucide-react';

import { AGE_FILTER_OPTIONS } from '@/components/CatalogAdvancedFiltersPanel.client';
import { formatNumber } from '@/lib/format';
import type { CatalogFilterValues } from '@/lib/catalog-url';

type LandingFacet = { slug: string; title: string; events: number };

const DATE_PRESETS: Array<{
  key: string;
  label: string;
  date?: CatalogFilterValues['date'];
}> = [
  { key: 'all', label: 'Любая дата' },
  { key: 'today', label: 'Сегодня', date: 'today' },
  { key: 'tomorrow', label: 'Завтра', date: 'tomorrow' },
  { key: 'weekend', label: 'Выходные', date: 'weekend' },
  { key: 'evening', label: 'Сегодня вечером', date: 'evening' },
];

type CatalogAdvancedFiltersInlineProps = {
  filters: CatalogFilterValues;
  landings: LandingFacet[];
  qDraft: string;
  disabled?: boolean;
  onNavigate: (next: CatalogFilterValues) => void;
};

export function CatalogAdvancedFiltersInline({
  filters,
  landings,
  qDraft,
  disabled = false,
  onNavigate,
}: CatalogAdvancedFiltersInlineProps) {
  const withQ = (next: CatalogFilterValues): CatalogFilterValues => ({
    ...next,
    q: qDraft.trim() || filters.q,
    page: undefined,
  });

  const hasCustomRange = Boolean(filters.from || filters.to);
  const activeDateKey = hasCustomRange
    ? 'custom'
    : DATE_PRESETS.find((item) => item.date === filters.date)?.key || 'all';

  const activeAge =
    filters.ageMax != null && filters.ageMax >= 0 ? filters.ageMax : -1;

  return (
    <>
      <div className="catalog-sidebar-section">
        <p className="catalog-sidebar-section__title">Дата</p>
        <nav className="catalog-sidebar-nav" aria-label="Дата">
          {DATE_PRESETS.map((item) => {
            const active = activeDateKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() =>
                  onNavigate(
                    withQ({
                      ...filters,
                      date: item.date,
                      from: undefined,
                      to: undefined,
                      sort:
                        item.date === 'today' || item.date === 'tomorrow' || item.date === 'evening'
                          ? 'time'
                          : filters.sort,
                    }),
                  )
                }
                className={`catalog-sidebar-nav__item${active ? ' catalog-sidebar-nav__item--active' : ''}`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="catalog-sidebar-section">
        <p className="catalog-sidebar-section__title">Возраст</p>
        <nav className="catalog-sidebar-nav" aria-label="Возраст">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={activeAge < 0}
            onClick={() => onNavigate(withQ({ ...filters, ageMax: undefined }))}
            className={`catalog-sidebar-nav__item${activeAge < 0 ? ' catalog-sidebar-nav__item--active' : ''}`}
          >
            <span>Любой</span>
          </button>
          {AGE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={activeAge === option.value}
              onClick={() =>
                onNavigate(withQ({ ...filters, ageMax: option.value }))
              }
              className={`catalog-sidebar-nav__item${activeAge === option.value ? ' catalog-sidebar-nav__item--active' : ''}`}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {landings.length ? (
        <div className="catalog-sidebar-section pb-2 lg:pb-0">
          <p className="catalog-sidebar-section__title">Подборка</p>
          <label className="relative block">
            <span className="sr-only">Подборка</span>
            <select
              value={filters.landing || 'all'}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                onNavigate(
                  withQ({
                    ...filters,
                    landing: value === 'all' ? undefined : value,
                  }),
                );
              }}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="all">Все подборки</option>
              {landings.map((item) => {
                const empty = item.events <= 0 && filters.landing !== item.slug;
                return (
                  <option key={item.slug} value={item.slug} disabled={empty}>
                    {item.title} · {formatNumber(item.events)}
                    {empty ? ' (нет)' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.75}
            />
          </label>
        </div>
      ) : null}
    </>
  );
}
