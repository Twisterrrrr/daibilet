'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Baby, Gift, Moon, MoreHorizontal, Search, SlidersHorizontal, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { CatalogDateRail } from '@/components/CatalogDateRail.client';
import { CatalogExcludeThemes } from '@/components/CatalogExcludeThemes.client';
import { CatalogMobileQuickFilters } from '@/components/CatalogMobileQuickFilters.client';
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
  normalizeExcludeLandingParam,
  type CatalogFilterValues,
} from '@/lib/catalog-url';
import type { AdvancedCatalogFilters } from '@/components/CatalogAdvancedFiltersPanel.client';

/** Heavy filter sheet - load only when drawer opens (keeps /events first JS lighter). */
const CatalogAdvancedFiltersPanel = dynamic(
  () =>
    import('@/components/CatalogAdvancedFiltersPanel.client').then((m) => m.CatalogAdvancedFiltersPanel),
  { ssr: false },
);

type CatalogToolbarProps = {
  facets: PublicCatalogDto['facets'];
  values: CatalogFilterValues;
  disabled?: boolean;
  cityReady?: boolean;
  compact?: boolean;
  /** Sidebar + main column on lg+; children render in main column. */
  layout?: 'default' | 'split';
  children?: ReactNode;
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
  layout = 'default',
  children,
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
    () => catalogSearchHintsFromFacets(facets.categories, 6),
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

  // Desktop search settles after a short pause; mobile commits on submit.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(max-width: 639px)').matches) return;
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
      className="catalog-discovery-row"
    >
      <CategoryTabs
        filters={filters}
        primary={categorySplit.primary}
        overflow={categorySplit.overflow}
        onOpenMore={() => setCategoriesMoreOpen(true)}
      />
      <div className="catalog-discovery-row__actions">
        <QuickFilterToggles filters={filters} qDraft={qDraft} disabled={disabled} onNavigate={navigate} />
      </div>
    </div>
  );

  const excludeThemesRow = (
    <CatalogExcludeThemes
      filters={filters}
      landings={facets.landings || []}
      disabled={disabled}
      onNavigate={navigate}
    />
  );

  const advancedPanel = filtersOpen ? (
    <CatalogAdvancedFiltersPanel
      open={filtersOpen}
      filters={{
        q: qDraft,
        category: filters.category || '',
        excludeLanding: normalizeExcludeLandingParam(filters.excludeLanding),
        dateFrom: filters.from || '',
        dateTo: filters.to || '',
        date: filters.date || '',
        minPrice: filters.minPrice != null ? String(filters.minPrice) : 'all',
        maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : 'all',
        ageMax:
          filters.ageMax != null && filters.ageMax >= 0
            ? filters.ageMax
            : -1,
        landing: filters.landing || 'all',
      }}
      categories={facets.categories}
      landings={facets.landings}
      previewContext={{
        q: qDraft.trim() || filters.q,
        city: filters.city,
        category: filters.category,
        sort: filters.sort,
      }}
      onApply={(next) => {
        setQDraft(next.q || '');
        applyAdvanced(navigate, filters, next);
        setFiltersOpen(false);
      }}
      onClose={() => setFiltersOpen(false)}
      onReset={() => {
        setQDraft('');
        navigate({
          city: filters.city,
          sort: filters.sort,
          limit: filters.limit,
        });
      }}
    />
  ) : null;

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
        {excludeThemesRow}
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

  const sidebarActiveCount =
    countAdvancedFilters(filters) +
    (filters.category ? 1 : 0) +
    (qDraft.trim() ? 1 : 0);

  const catalogSearchField = (
    <div ref={searchWrapRef} className="catalog-toolbar-search-field max-w-none md:max-w-none">
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Поиск по событиям</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
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
          aria-controls={showSearchHints ? 'catalog-search-hints-sidebar' : undefined}
          disabled={disabled}
          autoComplete="off"
          className="inline-btn h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-9 text-sm text-graphite outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 search-input--custom-clear"
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
            className="inline-btn absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-graphite-muted hover:bg-surface-muted hover:text-graphite disabled:opacity-60"
          >
            <X aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </label>
      {showSearchHints ? (
        <div
          id="catalog-search-hints-sidebar"
          role="listbox"
          aria-label="Популярные запросы"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg"
        >
          <p className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-graphite-muted">
            Часто ищут
          </p>
          {searchHints.map((hint) => (
            <button
              key={`sidebar-${hint.kind}:${hint.category || hint.q || hint.label}`}
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
  );

  if (layout === 'split') {
    return (
      <>
        <div className="catalog-content">
          <div className="catalog-events-sticky-controls">
            <div className="min-w-0 flex-1">
              <CatalogDateRail
                disabled={disabled}
                className="min-w-0 w-full"
                showCalendarButton={false}
              />
            </div>
            <FiltersButton
              open={filtersOpen}
              count={sidebarActiveCount}
              disabled={disabled}
              onClick={() => setFiltersOpen(true)}
              alwaysShowLabel
            />
          </div>
          {children}
        </div>

        {advancedPanel}
      </>
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Sticky on all breakpoints: search + (md) date/category/sort; mobile date + category icon rail. */}
      <div className="catalog-toolbar sticky top-[var(--site-header-height)] z-30 -mx-4 space-y-2 border-b border-slate-200/60 bg-white/95 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 sm:-mx-6 sm:px-6 md:mx-0 md:rounded-2xl md:border md:border-slate-200/70 md:px-3 md:py-2.5 md:shadow-sm">
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <div className="catalog-toolbar-search-row">
            <div
              ref={searchWrapRef}
              className="catalog-toolbar-search-field"
            >
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">Поиск по событиям</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 md:left-3"
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
                  className="inline-btn h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-9 text-sm text-graphite outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 md:h-10 md:pl-11 search-input--custom-clear"
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
                    className="inline-btn absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-graphite-muted hover:bg-surface-muted hover:text-graphite disabled:opacity-60"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
              </label>

              {showSearchHints ? (
                <div
                  id="catalog-search-hints"
                  role="listbox"
                  aria-label="Популярные запросы"
                  className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg"
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

            <button
              type="submit"
              disabled={disabled}
              className="inline-btn h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-60 md:h-10 md:px-2"
            >
              Найти
            </button>

            <FiltersButton
              open={filtersOpen}
              count={advancedCount}
              disabled={disabled}
              onClick={() => setFiltersOpen(true)}
              className="max-md:hidden"
            />
          </div>

          {/* Mobile: date carousel (Lovable) + category icon rail. */}
          <div className="space-y-2 md:hidden">
            <div className="catalog-date-timeline w-full min-w-0">
              <CatalogDateRail disabled={disabled} className="min-w-0 w-full" />
            </div>
            <MobileCategoryIconRail
              filters={filters}
              categories={facets.categories}
              disabled={disabled}
              qDraft={qDraft}
            />
          </div>
        </form>

        {/* Desktop sticky: categories + sort (date rail lives in EventsCatalogHero). */}
        <div className="hidden space-y-2 md:block">
          {discoveryRow}
          {excludeThemesRow}
        </div>
      </div>

      {advancedPanel}

      <MoreCategoriesSheet
        open={categoriesMoreOpen}
        filters={filters}
        overflow={categorySplit.overflow}
        onClose={() => setCategoriesMoreOpen(false)}
      />

      {/* Mobile filters FAB. SiteLayout chrome pads the footer so it is not clipped. */}
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

function MobileCategoryIconRail({
  filters,
  categories,
  disabled,
  qDraft,
}: {
  filters: CatalogFilterValues;
  categories: CatalogCategoryFacet[];
  disabled?: boolean;
  qDraft: string;
}) {
  const withQ = (category: string | undefined): CatalogFilterValues => ({
    ...filters,
    q: qDraft.trim() || filters.q,
    category,
    page: undefined,
  });

  return (
    <div
      role="tablist"
      aria-label="Тип события"
      className="flex w-full min-w-0 flex-nowrap items-stretch gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Link
        href={buildCatalogHref(withQ(undefined))}
        role="tab"
        aria-selected={!filters.category}
        aria-disabled={disabled || undefined}
        className={`inline-flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center transition ${
          !filters.category
            ? 'bg-graphite text-white shadow-sm'
            : 'bg-[#F5F5F7] text-graphite hover:bg-slate-200/70'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${
            !filters.category ? 'bg-white/15' : 'bg-white'
          }`}
        >
          <CategoryTabIcon name="Все" className={!filters.category ? 'text-white' : 'text-graphite-muted'} />
        </span>
        <span className="max-w-[4.5rem] truncate text-[11px] font-medium leading-tight">Все</span>
      </Link>
      {categories.map((item) => {
        const label = displayCatalogLabel(item.name);
        const active = filters.category === item.name;
        const empty = item.events <= 0;
        if (empty && !active) {
          return (
            <span
              key={item.name}
              role="tab"
              aria-selected={false}
              aria-disabled="true"
              title="Нет событий при текущих фильтрах"
              className="inline-flex min-w-[4.25rem] shrink-0 cursor-not-allowed flex-col items-center gap-1 rounded-2xl bg-[#F5F5F7] px-2 py-2 text-center opacity-40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white">
                <CategoryTabIcon name={label} className="text-graphite-muted" />
              </span>
              <span className="max-w-[4.5rem] truncate text-[11px] font-medium leading-tight">{label}</span>
            </span>
          );
        }
        return (
          <Link
            key={item.name}
            href={buildCatalogHref(withQ(active ? undefined : item.name))}
            role="tab"
            aria-selected={active}
            title={item.events > 0 ? `${label}: ${item.events}` : label}
            aria-disabled={disabled || undefined}
            className={`inline-flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center transition ${
              active
                ? 'bg-graphite text-white shadow-sm'
                : 'bg-[#F5F5F7] text-graphite hover:bg-slate-200/70'
            } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full ${
                active ? 'bg-white/15' : 'bg-white'
              }`}
            >
              <CategoryTabIcon name={label} className={active ? 'text-white' : 'text-graphite-muted'} />
            </span>
            <span className="max-w-[4.5rem] truncate text-[11px] font-medium leading-tight">{label}</span>
          </Link>
        );
      })}
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
  alwaysShowLabel = false,
}: {
  open: boolean;
  count: number;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  alwaysShowLabel?: boolean;
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
          : 'border border-slate-200 bg-white text-graphite hover:bg-slate-50'
      } ${className}`}
    >
      <SlidersHorizontal aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      <span className={alwaysShowLabel ? '' : 'hidden sm:inline'}>Фильтры</span>
      {count > 0 ? (
        <span className="grid min-w-5 place-items-center rounded-md bg-white/25 px-1.5 text-xs" aria-label={`Активных фильтров: ${count}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function mergeAdvancedFilters(
  filters: CatalogFilterValues,
  next: AdvancedCatalogFilters,
): CatalogFilterValues {
  const minPrice = next.minPrice === 'all' ? undefined : Number(next.minPrice);
  const maxPrice = next.maxPrice === 'all' ? undefined : Number(next.maxPrice);
  const hasRange = Boolean(next.dateFrom || next.dateTo);
  const landing = next.landing === 'all' ? undefined : next.landing;
  const excludeLanding = normalizeExcludeLandingParam(next.excludeLanding);
  return {
    ...filters,
    q: next.q?.trim() || undefined,
    category: next.category || undefined,
    date: hasRange ? undefined : next.date || undefined,
    from: next.dateFrom || undefined,
    to: next.dateTo || undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    ageMax: next.ageMax >= 0 ? next.ageMax : undefined,
    landing,
    // Include-landing and exclude themes conflict - drop excludes when pinning a landing.
    excludeLanding: landing ? undefined : excludeLanding.length ? excludeLanding : undefined,
    page: undefined,
  };
}

function applyAdvanced(
  navigate: (next: CatalogFilterValues) => void,
  filters: CatalogFilterValues,
  next: AdvancedCatalogFilters,
) {
  navigate(mergeAdvancedFilters(filters, next));
}
