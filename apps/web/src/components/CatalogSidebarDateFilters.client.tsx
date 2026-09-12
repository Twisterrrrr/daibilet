'use client';

import type { CatalogFilterValues } from '@/lib/catalog-url';

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

type CatalogSidebarDateFiltersProps = {
  filters: CatalogFilterValues;
  qDraft: string;
  disabled?: boolean;
  onNavigate: (next: CatalogFilterValues) => void;
};

/** Date presets for catalog sidebar (desktop fallback when date rail scrolls away). */
export function CatalogSidebarDateFilters({
  filters,
  qDraft,
  disabled = false,
  onNavigate,
}: CatalogSidebarDateFiltersProps) {
  const withQ = (next: CatalogFilterValues): CatalogFilterValues => ({
    ...next,
    q: qDraft.trim() || filters.q,
    page: undefined,
  });

  const hasCustomRange = Boolean(filters.from || filters.to);
  const activeDateKey = hasCustomRange
    ? 'custom'
    : DATE_PRESETS.find((item) => item.date === filters.date)?.key || 'all';

  return (
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
                  }),
                )
              }
              className={`catalog-sidebar-nav__item${active ? ' catalog-sidebar-nav__item--active' : ''}`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
        {hasCustomRange ? (
          <span className="catalog-sidebar-nav__item cursor-default opacity-80" aria-current="true">
            <span>Выбранный период</span>
          </span>
        ) : null}
      </nav>
    </div>
  );
}
