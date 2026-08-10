'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Baby, Gift, Moon, MoreHorizontal, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CatalogAdvancedFiltersPanel } from '@/components/CatalogAdvancedFiltersPanel.client';
import { CategoryTabIcon } from '@/components/CategoryTabIcon';
import { displayCatalogLabel } from '@/lib/catalog-labels';
import {
  catalogSearchHintsFromFacets,
  splitCatalogCategories,
  type CatalogCategoryFacet,
} from '@/lib/catalog-category-rail';

import type { PublicCatalogDto } from '@daibilet/contracts/public';
import {
  buildCatalogHref,
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
/** Events with ageLimit ≤ 12 - family-friendly quick filter. */
const KIDS_AGE_MAX = 12;

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
  const [categoriesMoreOpen, setCategoriesMoreOpen] = useState(false);
  const [qDraft, setQDraft] = useState(filters.q || '');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const advancedCount = countAdvancedFilters(filters);
  const categorySplit = useMemo(
    () => splitCatalogCategories(facets.categories, filters.category),
    [facets.categories, filters.category],
  );
  const searchHints = useMemo(
    () => catalogSearchHintsFromFacets(facets.categories, 5),
    [facets.categories],
  );
  const showSearchHints = searchFocused && !qDraft.trim() && searchHints.length > 0 && !disabled;
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

  useEffect(() => {
    if (!showSearchHints) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && searchWrapRef.current?.contains(target)) return;
      setSearchFocused(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [showSearchHints]);

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
    setSearchFocused(false);
    navigate({
      ...filters,
      q: qDraft.trim() || undefined,
      page: undefined,
    });
  };

  const discoveryRow = (
    <div
      role="group"
      aria-label="Быстрые фильтры и категории"
      className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <CategoryTabs
        filters={filters}
        primary={categorySplit.primary}
        overflow={categorySplit.overflow}
        onOpenMore={() => setCategoriesMoreOpen(true)}
      />
      <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1.5">
        <QuickFilterToggles filters={filters} qDraft={qDraft} disabled={disabled} onNavigate={navigate} />
      </div>
    </div>
  );

  const advancedPanel = (
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
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{discoveryRow}</div>
          <FiltersButton
            open={filtersOpen}
            count={advancedCount}
            disabled={disabled}
            onClick={() => setFiltersOpen(true)}
          />
        </div>
        {advancedPanel}
        <MoreCategoriesSheet
          open={categoriesMoreOpen}
          filters={filters}
          overflow={categorySplit.overflow}
          onClose={() => setCategoriesMoreOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Sticky search + one discovery row; date rail lives in EventsCatalogHero. */}
      <div className="catalog-toolbar sticky top-[var(--site-header-height)] z-30 -mx-4 space-y-2 border-b border-slate-200/60 bg-white/95 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 sm:-mx-6 sm:px-6 md:static md:z-auto md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-1.5 md:p-1"
        >
          <div ref={searchWrapRef} className="relative flex min-w-0 flex-1 items-center gap-1">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Поиск по событиям</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-muted"
                strokeWidth={1.75}
              />
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                value={qDraft}
                onChange={(event) => setQDraft(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Название, место или артист"
                aria-label="Поиск по событиям"
                aria-expanded={showSearchHints}
                aria-controls={showSearchHints ? 'catalog-search-hints' : undefined}
                disabled={disabled}
                autoComplete="off"
                className="inline-btn h-10 w-full rounded-xl bg-transparent pl-10 pr-9 text-sm text-graphite outline-none transition placeholder:text-graphite-muted focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 md:h-9"
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

            <button
              type="submit"
              disabled={disabled}
              className="inline-btn btn-primary h-10 shrink-0 rounded-xl px-3.5 text-sm disabled:opacity-60 md:h-9"
            >
              Найти
            </button>

            {showSearchHints ? (
              <div
                id="catalog-search-hints"
                role="listbox"
                aria-label="Популярные запросы"
                className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-lg"
              >
                <p className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-graphite-muted">
                  Часто ищут
                </p>
                {searchHints.map((hint) => (
                  <button
                    key={`${hint.kind}:${hint.category || hint.q || hint.label}`}
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-graphite transition hover:bg-surface-muted"
                    onClick={() => {
                      setSearchFocused(false);
                      if (hint.kind === 'q' && hint.q) {
                        setQDraft(hint.q);
                        navigate({
                          ...filters,
                          q: hint.q,
                          category: undefined,
                          page: undefined,
                        });
                        return;
                      }
                      navigate({
                        ...filters,
                        q: undefined,
                        category: hint.category,
                        page: undefined,
                      });
                    }}
                  >
                    <Search aria-hidden className="h-3.5 w-3.5 shrink-0 text-graphite-muted" strokeWidth={1.75} />
                    <span className="truncate">{hint.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <FiltersButton
            open={filtersOpen}
            count={advancedCount}
            disabled={disabled}
            onClick={() => setFiltersOpen(true)}
            className="max-md:hidden"
          />
        </form>

        {/* One discovery row under search: quick + categories. */}
        {discoveryRow}
      </div>

      {advancedPanel}

      <MoreCategoriesSheet
        open={categoriesMoreOpen}
        filters={filters}
        overflow={categorySplit.overflow}
        onClose={() => setCategoriesMoreOpen(false)}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="pointer-events-auto border-t border-slate-200/80 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
          <button
            type="button"
            disabled={disabled}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            aria-controls="advanced-filters-panel"
            onClick={() => setFiltersOpen(true)}
            className={`inline-btn flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60 ${
              filtersOpen || advancedCount > 0
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-[#1A1A1A] text-white hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {advancedCount > 0 ? `Фильтры (${advancedCount})` : 'Фильтры'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickFilterToggles({
  filters,
  qDraft,
  disabled,
  onNavigate,
}: {
  filters: CatalogFilterValues;
  qDraft: string;
  disabled?: boolean;
  onNavigate: (next: CatalogFilterValues) => void;
}) {
  const freeOn = filters.minPrice === 0 && filters.maxPrice === 0;
  const kidsOn = filters.ageMax === KIDS_AGE_MAX;
  const eveningOn = filters.date === 'evening' && !filters.from && !filters.to;

  const withQ = (next: CatalogFilterValues): CatalogFilterValues => ({
    ...next,
    q: qDraft.trim() || filters.q,
    page: undefined,
  });

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={eveningOn}
        onClick={() =>
          onNavigate(
            withQ({
              ...filters,
              date: eveningOn ? undefined : 'evening',
              from: undefined,
              to: undefined,
            }),
          )
        }
        className={`catalog-chip snap-start disabled:opacity-60 ${
          eveningOn ? 'catalog-chip-on' : 'catalog-chip-idle'
        }`}
      >
        <Moon aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap">Сегодня вечером</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={freeOn}
        onClick={() =>
          onNavigate(
            withQ({
              ...filters,
              minPrice: freeOn ? undefined : 0,
              maxPrice: freeOn ? undefined : 0,
            }),
          )
        }
        className={`catalog-chip snap-start disabled:opacity-60 ${
          freeOn ? 'catalog-chip-on' : 'catalog-chip-idle'
        }`}
      >
        <Gift aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap">Бесплатные</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={kidsOn}
        onClick={() =>
          onNavigate(
            withQ({
              ...filters,
              ageMax: kidsOn ? undefined : KIDS_AGE_MAX,
            }),
          )
        }
        className={`catalog-chip snap-start disabled:opacity-60 ${
          kidsOn ? 'catalog-chip-on' : 'catalog-chip-idle'
        }`}
      >
        <Baby aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap">С детьми</span>
      </button>
    </>
  );
}

function CategoryTabs({
  filters,
  primary,
  overflow,
  onOpenMore,
}: {
  filters: CatalogFilterValues;
  primary: CatalogCategoryFacet[];
  overflow: CatalogCategoryFacet[];
  onOpenMore: () => void;
}) {
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
      {primary.map((item) => {
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
      {overflow.length > 0 ? (
        <button
          type="button"
          role="tab"
          aria-haspopup="dialog"
          aria-expanded={false}
          onClick={onOpenMore}
          className="catalog-chip catalog-chip-idle snap-start"
        >
          <MoreHorizontal aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span className="whitespace-nowrap">Ещё</span>
          <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold text-graphite-muted">
            {overflow.length}
          </span>
        </button>
      ) : null}
    </>
  );
}

function MoreCategoriesSheet({
  open,
  filters,
  overflow,
  onClose,
}: {
  open: boolean;
  filters: CatalogFilterValues;
  overflow: CatalogCategoryFacet[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Другие категории"
        className="relative z-[1] flex max-h-[min(80vh,32rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-display text-base font-bold text-graphite">Ещё категории</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-btn grid h-9 w-9 place-items-center rounded-xl text-graphite-muted hover:bg-surface-muted"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {overflow.map((item) => {
            const label = displayCatalogLabel(item.name);
            const active = filters.category === item.name;
            return (
              <li key={item.name}>
                <Link
                  href={buildCatalogHref({
                    ...filters,
                    category: active ? undefined : item.name,
                    page: undefined,
                  })}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    active ? 'bg-graphite text-white' : 'text-graphite hover:bg-surface-muted'
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <CategoryTabIcon name={label} className={active ? 'text-white/85' : 'text-graphite-muted'} />
                    <span className="truncate font-medium">{label}</span>
                  </span>
                  <span className={`shrink-0 text-xs ${active ? 'text-white/70' : 'text-graphite-muted'}`}>
                    {item.events}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
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
