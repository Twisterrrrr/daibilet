'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { CatalogAdvancedFiltersPanel } from '@/components/CatalogAdvancedFiltersPanel.client';
import { CategoryTabIcon } from '@/components/CategoryTabIcon';
import { displayCatalogLabel } from '@/lib/catalog-labels';

import type { PublicCatalogDto } from '@daibilet/contracts/public';
import {
  buildCatalogHref,
  CATALOG_DATE_OPTIONS,
  catalogFiltersFromQuery,
  countAdvancedFilters,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

type CatalogToolbarProps = {
  facets: PublicCatalogDto['facets'];
  values: CatalogFilterValues;
  disabled?: boolean;
  cityReady?: boolean;
  compact?: boolean;
};

const SEARCH_DEBOUNCE_MS = 350;

export function CatalogToolbar({
  facets,
  values,
  disabled = false,
  cityReady: _cityReady = true,
  compact = false,
}: CatalogToolbarProps) {
  const router = useRouter();
  const filters = useMemo(() => catalogFiltersFromQuery(values), [values]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qDraft, setQDraft] = useState(filters.q || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const advancedCount = countAdvancedFilters(filters);
  const activeDate = filters.from || filters.to ? '' : filters.date || 'all';
  const hasCustomRange = Boolean(filters.from || filters.to);
  const singleDay = filters.from && (!filters.to || filters.to === filters.from) ? filters.from : '';
  const previewContext = useMemo(
    () => ({
      q: qDraft.trim() || filters.q,
      city: filters.city,
      category: filters.category,
      sort: filters.sort,
    }),
    [qDraft, filters.q, filters.city, filters.category, filters.sort],
  );

  useEffect(() => {
    setQDraft(filters.q || '');
  }, [filters.q]);

  const navigate = (next: CatalogFilterValues) => {
    router.push(buildCatalogHref(next));
  };

  // Live search on desktop-sized viewports; mobile relies on «Найти».
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      return;
    }
    const next = qDraft.trim();
    const current = (filtersRef.current.q || '').trim();
    if (next === current) return;
    const timer = window.setTimeout(() => {
      const latest = filtersRef.current;
      navigate({
        ...latest,
        q: next || undefined,
        page: undefined,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [qDraft]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({
      ...filters,
      q: qDraft.trim() || undefined,
      page: undefined,
    });
  };

  const setDate = (nextDate: string) => {
    navigate({
      ...filters,
      q: qDraft.trim() || undefined,
      date: nextDate === 'all' ? undefined : nextDate,
      from: undefined,
      to: undefined,
      page: undefined,
      sort: nextDate === 'today' || nextDate === 'tomorrow' || nextDate === 'evening' ? 'time' : filters.sort,
    });
  };

  const setExactDay = (isoDay: string) => {
    if (!isoDay) {
      navigate({
        ...filters,
        q: qDraft.trim() || undefined,
        date: undefined,
        from: undefined,
        to: undefined,
        page: undefined,
      });
      return;
    }
    navigate({
      ...filters,
      q: qDraft.trim() || undefined,
      date: undefined,
      from: isoDay,
      to: isoDay,
      page: undefined,
      sort: 'time',
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="horizontal-snap-row flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryTabs filters={filters} categories={facets.categories} />
        </div>
        <FiltersButton
          open={filtersOpen}
          count={advancedCount}
          disabled={disabled}
          onClick={() => setFiltersOpen(true)}
        />
        <CatalogAdvancedFiltersPanel
          open={filtersOpen}
          filters={{
            dateFrom: filters.from || '',
            dateTo: filters.to || '',
            date: filters.date || '',
            minPrice: filters.minPrice != null ? String(filters.minPrice) : 'all',
            maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : 'all',
            ageMax: filters.ageMax != null && filters.ageMax >= 0 ? filters.ageMax : -1,
            landing: filters.landing || 'all',
          }}
          landings={facets.landings}
          previewContext={previewContext}
          onApply={(next) => {
            applyAdvanced(navigate, filters, qDraft, next);
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
          onReset={() => {
            navigate({
              q: filters.q,
              city: filters.city,
              category: filters.category,
              sort: filters.sort,
              limit: filters.limit,
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Единая search bar: Поиск → Дата → Фильтры → Найти */}
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:gap-1.5 sm:p-1.5"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Поиск по событиям</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-muted" strokeWidth={1.75} />
          <input
            ref={searchInputRef}
            type="search"
            name="q"
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder="Название, место или артист"
            aria-label="Поиск по событиям"
            disabled={disabled}
            className="inline-btn h-11 w-full rounded-xl bg-transparent pl-10 pr-9 text-sm text-graphite outline-none transition placeholder:text-graphite-muted focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 sm:h-10"
          />
          {qDraft ? (
            <button
              type="button"
              aria-label="Очистить поиск"
              disabled={disabled}
              onClick={() => {
                setQDraft('');
                navigate({ ...filters, q: undefined, page: undefined });
              }}
              className="inline-btn absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-graphite-muted hover:bg-surface-muted hover:text-graphite disabled:opacity-60"
            >
              <X aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          ) : null}
        </label>

        <div className="flex items-center gap-1.5 sm:contents">
          <div className="relative min-w-[7.25rem] flex-1 sm:w-44 sm:flex-none sm:min-w-[10rem]">
            <label htmlFor="catalog-date" className="sr-only">
              Когда
            </label>
            <select
              id="catalog-date"
              name="date"
              value={hasCustomRange ? 'custom' : activeDate || 'all'}
              disabled={disabled}
              onChange={(event) => {
                if (event.target.value === 'custom') return;
                setDate(event.target.value);
              }}
              className="h-11 w-full min-w-0 appearance-none rounded-xl bg-surface-muted pl-3 pr-9 text-sm font-medium text-graphite outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-70 sm:h-10 sm:bg-transparent sm:hover:bg-surface-muted"
            >
              {CATALOG_DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {hasCustomRange ? (
                <option value="custom">
                  {filters.from && filters.to && filters.from !== filters.to
                    ? `${filters.from} - ${filters.to}`
                    : filters.from || filters.to}
                </option>
              ) : null}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-muted"
              strokeWidth={1.75}
            />
          </div>

          {/* Exact calendar: desktop only; mobile uses date select + advanced filters. */}
          <label className="relative hidden min-w-[9.5rem] flex-none sm:block sm:w-36">
            <span className="sr-only">Точная дата</span>
            <input
              type="date"
              value={singleDay}
              disabled={disabled}
              onChange={(event) => setExactDay(event.target.value)}
              aria-label="Выбрать дату в календаре"
              className="h-11 w-full rounded-xl bg-surface-muted px-2.5 text-sm font-medium text-graphite outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-70 sm:h-10"
            />
          </label>

          <FiltersButton
            open={filtersOpen}
            count={advancedCount}
            disabled={disabled}
            onClick={() => setFiltersOpen(true)}
            className="sm:ml-0"
          />

          <button
            type="submit"
            disabled={disabled}
            className="inline-btn btn-primary h-11 shrink-0 px-4 text-sm disabled:opacity-60 sm:h-10"
          >
            Найти
          </button>
        </div>
      </form>

      <CatalogAdvancedFiltersPanel
        open={filtersOpen}
        filters={{
          dateFrom: filters.from || '',
          dateTo: filters.to || '',
          date: filters.date || '',
          minPrice: filters.minPrice != null ? String(filters.minPrice) : 'all',
          maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : 'all',
          ageMax: filters.ageMax != null && filters.ageMax >= 0 ? filters.ageMax : -1,
          landing: filters.landing || 'all',
        }}
        landings={facets.landings}
        previewContext={previewContext}
        onApply={(next) => {
          applyAdvanced(navigate, filters, qDraft, next);
          setFiltersOpen(false);
        }}
        onClose={() => setFiltersOpen(false)}
        onReset={() => {
          navigate({
            q: filters.q,
            city: filters.city,
            category: filters.category,
            sort: filters.sort,
            limit: filters.limit,
          });
        }}
      />

      {/* Горизонтальные tag-chips без счётчиков («Мероприятия 2092»). */}
      <div className="-mx-4 px-4 pt-1 sm:mx-0 sm:px-0">
        <div
          role="tablist"
          aria-label="Категории"
          className="horizontal-snap-row flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <CategoryTabs filters={filters} categories={facets.categories} />
        </div>
      </div>
    </div>
  );
}

function CategoryTabs({
  filters,
  categories,
}: {
  filters: CatalogFilterValues;
  categories: Array<{ name: string; events: number }>;
}) {
  const byName = new Map(categories.map((item) => [item.name, item]));
  if (filters.category && !byName.has(filters.category)) {
    byName.set(filters.category, { name: filters.category, events: 0 });
  }
  const visible = [...byName.values()].filter((item) => item.events > 0 || filters.category === item.name);

  return (
    <>
      <Link
        href={buildCatalogHref({ ...filters, category: undefined, page: undefined })}
        role="tab"
        aria-selected={!filters.category}
        className={`catalog-chip snap-start ${!filters.category ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
      >
        Все
      </Link>
      {visible.map((item) => {
        const active = filters.category === item.name;
        const empty = item.events <= 0;
        const label = displayCatalogLabel(item.name);
        if (empty && !active) {
          return (
            <span
              key={item.name}
              role="tab"
              aria-selected={false}
              aria-disabled="true"
              title="Нет событий при текущих фильтрах"
              className="catalog-chip snap-start cursor-not-allowed opacity-40"
            >
              <CategoryTabIcon name={label} className="text-graphite-muted" />
              <span className="whitespace-nowrap">{label}</span>
            </span>
          );
        }
        return (
          <Link
            key={item.name}
            href={buildCatalogHref({
              ...filters,
              category: active ? undefined : item.name,
              page: undefined,
            })}
            role="tab"
            aria-selected={active}
            title={item.events > 0 ? `${label}: ${item.events}` : label}
            className={`catalog-chip snap-start ${
              active ? 'catalog-chip-on' : empty ? 'catalog-chip-idle opacity-50' : 'catalog-chip-idle'
            }`}
          >
            <CategoryTabIcon name={label} className={active ? 'text-white/85' : 'text-graphite-muted'} />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

function FiltersButton({
  open,
  count,
  disabled,
  onClick,
  className = '',
}: {
  open: boolean;
  count: number;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="advanced-filters-panel"
      className={`relative inline-btn inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:opacity-60 sm:h-10 ${
        open || count > 0
          ? 'bg-primary-600 text-white hover:bg-primary-700'
          : 'bg-surface-muted text-graphite hover:bg-slate-200/80'
      } ${className}`}
    >
      <SlidersHorizontal aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      <span className="hidden sm:inline">Фильтры</span>
      {count > 0 ? (
        <span className="grid min-w-5 place-items-center rounded-md bg-white/25 px-1.5 text-xs" aria-label={`Активных фильтров: ${count}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function applyAdvanced(
  navigate: (next: CatalogFilterValues) => void,
  filters: CatalogFilterValues,
  qDraft: string,
  next: {
    dateFrom: string;
    dateTo: string;
    date?: string;
    minPrice: string;
    maxPrice: string;
    ageMax: number;
    landing: string;
  },
) {
  const minPrice = next.minPrice === 'all' ? undefined : Number(next.minPrice);
  const maxPrice = next.maxPrice === 'all' ? undefined : Number(next.maxPrice);
  const hasRange = Boolean(next.dateFrom || next.dateTo);
  navigate({
    ...filters,
    q: qDraft.trim() || filters.q,
    date: hasRange ? undefined : next.date || undefined,
    from: next.dateFrom || undefined,
    to: next.dateTo || undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    ageMax: next.ageMax >= 0 ? next.ageMax : undefined,
    landing: next.landing === 'all' ? undefined : next.landing,
    page: undefined,
  });
}
