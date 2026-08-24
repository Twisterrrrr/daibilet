'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Baby, ChevronDown, Gift, Moon, MoreHorizontal, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { CatalogAdvancedFiltersInline } from '@/components/CatalogAdvancedFiltersInline.client';
import { CatalogAdvancedFiltersPanel } from '@/components/CatalogAdvancedFiltersPanel.client';
import { CatalogDateRail } from '@/components/CatalogDateRail.client';
import { CatalogDrawerApplyFooter } from '@/components/CatalogDrawerApplyFooter.client';
import { CatalogPriceRange } from '@/components/CatalogPriceRange.client';
import {
  CatalogDesktopFiltersCollapseButton,
  CatalogSidebarLayout,
} from '@/components/CatalogSidebarLayout.client';
import { CategoryTabIcon } from '@/components/CategoryTabIcon';
import { displayCatalogLabel } from '@/lib/catalog-labels';
import {
  catalogSearchHintsFromFacets,
  splitCatalogCategories,
  type CatalogCategoryFacet,
} from '@/lib/catalog-category-rail';
import {
  buildCatalogDateRailChips,
  type CatalogDateRailChip,
} from '@/lib/catalog-date-rail';

import type { PublicCatalogDto } from '@daibilet/contracts/public';
import {
  buildCatalogHref,
  CATALOG_SORT_OPTIONS,
  catalogFiltersFromQuery,
  countAdvancedFilters,
  type CatalogFilterValues,
  type CatalogSort,
} from '@/lib/catalog-url';

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

const CATALOG_PRICE_MAX = 10_000;

const SEARCH_DEBOUNCE_MS = 350;
const MOBILE_DRAWER_MQ = '(max-width: 1023px)';
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [drawerDraft, setDrawerDraft] = useState<CatalogFilterValues | null>(null);
  const [drawerQDraft, setDrawerQDraft] = useState<string | null>(null);
  const drawerSnapshotRef = useRef<{ filters: CatalogFilterValues; q: string } | null>(null);
  const [categoriesMoreOpen, setCategoriesMoreOpen] = useState(false);
  const [qDraft, setQDraft] = useState(filters.q || '');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const advancedCount = countAdvancedFilters(filters);
  const dateRailChips = useMemo(() => buildCatalogDateRailChips(), []);
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

  const isMobileDrawerDraft = mobileDrawerOpen && drawerDraft != null;

  const effectiveFilters = isMobileDrawerDraft ? drawerDraft : filters;
  const effectiveQDraft = isMobileDrawerDraft && drawerQDraft != null ? drawerQDraft : qDraft;

  const catalogNavigate = (next: CatalogFilterValues) => {
    if (isMobileDrawerDraft) {
      setDrawerDraft(next);
      return;
    }
    navigate(next);
  };

  const setEffectiveQDraft = (next: string) => {
    if (isMobileDrawerDraft) {
      setDrawerQDraft(next);
      setQDraft(next);
      return;
    }
    setQDraft(next);
  };

  const openMobileDrawer = () => {
    drawerSnapshotRef.current = { filters, q: qDraft };
    setDrawerDraft({ ...filters });
    setDrawerQDraft(qDraft);
    setMobileDrawerOpen(true);
  };

  const dismissMobileDrawer = () => {
    const snapshot = drawerSnapshotRef.current;
    if (snapshot) setQDraft(snapshot.q);
    drawerSnapshotRef.current = null;
    setDrawerDraft(null);
    setDrawerQDraft(null);
    setMobileDrawerOpen(false);
  };

  const applyMobileDrawer = () => {
    const next = drawerDraft ?? filters;
    const q = (drawerQDraft ?? qDraft).trim();
    drawerSnapshotRef.current = null;
    setDrawerDraft(null);
    setDrawerQDraft(null);
    setMobileDrawerOpen(false);
    navigate({
      ...next,
      q: q || undefined,
      page: undefined,
    });
  };

  // Live search on desktop-sized viewports; mobile drawer uses draft until «Применить».
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(max-width: 639px)').matches) return;
      if (window.matchMedia(MOBILE_DRAWER_MQ).matches && mobileDrawerOpen) return;
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
  }, [qDraft, mobileDrawerOpen]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchFocused(false);
    catalogNavigate({
      ...effectiveFilters,
      q: effectiveQDraft.trim() || undefined,
      page: undefined,
    });
  };

  const setDatePreset = (nextDate: 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening') => {
    navigate({
      ...filters,
      q: qDraft.trim() || undefined,
      date: nextDate === 'all' ? undefined : nextDate,
      from: undefined,
      to: undefined,
      page: undefined,
      sort:
        nextDate === 'today' || nextDate === 'tomorrow' || nextDate === 'evening'
          ? 'time'
          : filters.sort,
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

  const setSort = (sort: CatalogSort) => {
    navigate({
      ...filters,
      q: qDraft.trim() || undefined,
      sort,
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
        <div
          role="radiogroup"
          aria-label="Сортировка"
          className="flex shrink-0 gap-0.5 rounded-lg bg-slate-100 p-0.5"
        >
          {CATALOG_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={(filters.sort || 'time') === option.value}
              disabled={disabled}
              onClick={() => setSort(option.value)}
              className={`inline-btn h-7 shrink-0 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60 ${
                (filters.sort || 'time') === option.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const advancedPanel = (
    <CatalogAdvancedFiltersPanel
      open={filtersOpen}
      filters={{
        dateFrom: effectiveFilters.from || '',
        dateTo: effectiveFilters.to || '',
        date: effectiveFilters.date || '',
        minPrice: effectiveFilters.minPrice != null ? String(effectiveFilters.minPrice) : 'all',
        maxPrice: effectiveFilters.maxPrice != null ? String(effectiveFilters.maxPrice) : 'all',
        ageMax:
          effectiveFilters.ageMax != null && effectiveFilters.ageMax >= 0
            ? effectiveFilters.ageMax
            : -1,
        landing: effectiveFilters.landing || 'all',
      }}
      landings={facets.landings}
      previewContext={{
        q: effectiveQDraft.trim() || effectiveFilters.q,
        city: effectiveFilters.city,
        category: effectiveFilters.category,
        sort: effectiveFilters.sort,
      }}
      onApply={(next) => {
        if (isMobileDrawerDraft) {
          setDrawerDraft(mergeAdvancedFilters(drawerDraft ?? filters, drawerQDraft ?? qDraft, next));
          setFiltersOpen(false);
          return;
        }
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

  const priceMinValue = effectiveFilters.minPrice ?? 0;
  const priceMaxValue = effectiveFilters.maxPrice ?? CATALOG_PRICE_MAX;

  const setPriceRange = (min: number, max: number) => {
    const atDefault = min <= 0 && max >= CATALOG_PRICE_MAX;
    catalogNavigate({
      ...effectiveFilters,
      q: effectiveQDraft.trim() || effectiveFilters.q,
      minPrice: atDefault ? undefined : min,
      maxPrice: atDefault ? undefined : max,
      page: undefined,
    });
  };

  const resetSidebarFilters = () => {
    if (isMobileDrawerDraft) {
      setDrawerDraft({
        city: effectiveFilters.city,
        sort: effectiveFilters.sort,
        limit: effectiveFilters.limit,
      });
      setDrawerQDraft('');
      setQDraft('');
      return;
    }
    setQDraft('');
    navigate({
      city: filters.city,
      sort: filters.sort,
      limit: filters.limit,
    });
  };

  const sidebarActiveCount =
    countAdvancedFilters(effectiveFilters) +
    (effectiveFilters.category ? 1 : 0) +
    (effectiveQDraft.trim() ? 1 : 0);

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
          value={effectiveQDraft}
          onChange={(event) => setEffectiveQDraft(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Название, место или артист"
          aria-label="Поиск по событиям"
          aria-expanded={showSearchHints}
          aria-controls={showSearchHints ? 'catalog-search-hints-sidebar' : undefined}
          disabled={disabled}
          autoComplete="off"
          className="inline-btn h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-9 text-sm text-graphite outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 search-input--custom-clear"
        />
        {effectiveQDraft ? (
          <button
            type="button"
            aria-label="Очистить поиск"
            disabled={disabled}
            onClick={() => {
              setEffectiveQDraft('');
              catalogNavigate({ ...effectiveFilters, q: undefined, page: undefined });
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
                  setEffectiveQDraft(hint.q);
                  catalogNavigate({
                    ...effectiveFilters,
                    q: hint.q,
                    category: undefined,
                    page: undefined,
                  });
                  return;
                }
                catalogNavigate({
                  ...effectiveFilters,
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
    const eventsSidebar = (
      <>
        <div className="catalog-sidebar-desktop-header">
          <span className="catalog-sidebar-desktop-title">Фильтры</span>
          <div className="flex items-center gap-0.5">
            {sidebarActiveCount > 0 ? (
              <button type="button" className="catalog-sidebar-clear" onClick={resetSidebarFilters}>
                Сбросить
              </button>
            ) : null}
            <CatalogDesktopFiltersCollapseButton />
          </div>
        </div>

        <form onSubmit={onSubmit} className="catalog-sidebar-section catalog-sidebar-search">
          {catalogSearchField}
          <button
            type="submit"
            disabled={disabled}
            className="catalog-sidebar-search__submit mt-2.5"
          >
            Найти
          </button>
        </form>

        <div className="catalog-sidebar-section">
          <p className="catalog-sidebar-section__title">Стоимость, ₽</p>
          <CatalogPriceRange
            min={0}
            max={CATALOG_PRICE_MAX}
            valueMin={priceMinValue}
            valueMax={priceMaxValue}
            disabled={disabled}
            onChange={setPriceRange}
          />
        </div>

        <div className="catalog-sidebar-section">
          <p className="catalog-sidebar-section__title">Категории</p>
          <CategorySidebarNav
            filters={effectiveFilters}
            primary={categorySplit.primary}
            overflow={categorySplit.overflow}
            onOpenMore={() => setCategoriesMoreOpen(true)}
            onNavigate={catalogNavigate}
          />
        </div>

        <div className="catalog-sidebar-section">
          <p className="catalog-sidebar-section__title">Особенности</p>
          <QuickFilterSidebarNav
            filters={effectiveFilters}
            qDraft={effectiveQDraft}
            disabled={disabled}
            onNavigate={catalogNavigate}
          />
        </div>

        <CatalogAdvancedFiltersInline
          filters={effectiveFilters}
          landings={facets.landings}
          qDraft={effectiveQDraft}
          disabled={disabled}
          onNavigate={catalogNavigate}
        />

      </>
    );

    const drawerPreviewFilters: CatalogFilterValues = {
      ...effectiveFilters,
      q: effectiveQDraft.trim() || effectiveFilters.q,
    };

    return (
      <>
        <CatalogSidebarLayout
          sidebar={eventsSidebar}
          title="Фильтры"
          triggerLabel="Фильтры и поиск"
          activeCount={sidebarActiveCount}
          onDrawerOpen={openMobileDrawer}
          onDrawerDismiss={dismissMobileDrawer}
          footer={({ closeApply }) => (
            <CatalogDrawerApplyFooter
              filters={drawerPreviewFilters}
              disabled={disabled}
              onApply={() => {
                applyMobileDrawer();
                closeApply();
              }}
            />
          )}
        >
          <div className="catalog-content">
            <div className="catalog-date-timeline hidden w-full md:block">
              <CatalogDateRail disabled={disabled} className="min-w-0 w-full" />
            </div>
            <div className="w-full md:hidden">
              <MobileDateSelect
                chips={dateRailChips}
                filters={filters}
                disabled={disabled}
                onPreset={setDatePreset}
                onExactDay={setExactDay}
              />
            </div>
            {children}
          </div>
        </CatalogSidebarLayout>
        {advancedPanel}
        <MoreCategoriesSheet
          open={categoriesMoreOpen}
          filters={filters}
          overflow={categorySplit.overflow}
          onClose={() => setCategoriesMoreOpen(false)}
        />
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

          {/* Mobile: дата select + горизонтальный icon rail категорий. */}
          <div className="space-y-2 md:hidden">
            <MobileDateSelect
              chips={dateRailChips}
              filters={filters}
              disabled={disabled}
              onPreset={setDatePreset}
              onExactDay={setExactDay}
            />
            <MobileCategoryIconRail
              filters={filters}
              categories={facets.categories}
              disabled={disabled}
              qDraft={qDraft}
            />
          </div>
        </form>

        {/* Desktop sticky: categories + sort (date rail lives in EventsCatalogHero). */}
        <div className="hidden md:block">{discoveryRow}</div>
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

const mobileSelectCls =
  'h-10 w-full appearance-none truncate rounded-xl border-0 bg-[#F5F5F7] py-2 pl-3 pr-8 text-sm font-medium text-[#1A1A1A] outline-none transition hover:bg-[#EBEBED] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60';

function formatSelectDay(iso: string): string {
  const day = Number(iso.slice(8));
  const date = new Date(`${iso}T12:00:00`);
  const weekday = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][date.getDay()] || '';
  return `${weekday} ${day}`;
}

function resolveMobileDateValue(filters: CatalogFilterValues): string {
  if (filters.date) return filters.date;
  if (filters.from && filters.to === filters.from) return `day:${filters.from}`;
  if (filters.from || filters.to) return 'custom';
  return 'all';
}

function MobileDateSelect({
  chips,
  filters,
  disabled,
  onPreset,
  onExactDay,
}: {
  chips: CatalogDateRailChip[];
  filters: CatalogFilterValues;
  disabled?: boolean;
  onPreset: (value: 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening') => void;
  onExactDay: (iso: string) => void;
}) {
  const value = resolveMobileDateValue(filters);
  const customLabel =
    filters.from && filters.to && filters.from !== filters.to
      ? `${filters.from.slice(8)}.${filters.from.slice(5, 7)} - ${filters.to.slice(8)}.${filters.to.slice(5, 7)}`
      : filters.from
        ? formatSelectDay(filters.from)
        : 'Диапазон дат';

  return (
    <div className="relative min-w-0">
      <label className="sr-only" htmlFor="catalog-mobile-date">
        Дата
      </label>
      <select
        id="catalog-mobile-date"
        disabled={disabled}
        value={value === 'custom' ? 'custom' : value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'custom') return;
          if (
            next === 'all' ||
            next === 'today' ||
            next === 'tomorrow' ||
            next === 'weekend' ||
            next === 'evening'
          ) {
            onPreset(next);
            return;
          }
          if (next.startsWith('day:')) onExactDay(next.slice(4));
        }}
        className={mobileSelectCls}
      >
        <option value="all">Любая дата</option>
        <option value="today">Сегодня</option>
        <option value="tomorrow">Завтра</option>
        <option value="weekend">Выходные</option>
        <option value="evening">Сегодня вечером</option>
        {chips
          .filter((chip): chip is Extract<CatalogDateRailChip, { kind: 'day' }> => chip.kind === 'day')
          .map((chip) => (
            <option key={chip.iso} value={`day:${chip.iso}`}>
              {formatSelectDay(chip.iso)}
            </option>
          ))}
        {value === 'custom' ? <option value="custom">{customLabel}</option> : null}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]"
        strokeWidth={1.75}
      />
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

function QuickFilterSidebarNav({
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

  const items = [
    {
      key: 'evening',
      label: 'Сегодня вечером',
      active: eveningOn,
      onClick: () =>
        onNavigate(
          withQ({
            ...filters,
            date: eveningOn ? undefined : 'evening',
            from: undefined,
            to: undefined,
          }),
        ),
    },
    {
      key: 'free',
      label: 'Бесплатные',
      active: freeOn,
      onClick: () =>
        onNavigate(
          withQ({
            ...filters,
            minPrice: freeOn ? undefined : 0,
            maxPrice: freeOn ? undefined : 0,
          }),
        ),
    },
    {
      key: 'kids',
      label: 'С детьми',
      active: kidsOn,
      onClick: () =>
        onNavigate(
          withQ({
            ...filters,
            ageMax: kidsOn ? undefined : KIDS_AGE_MAX,
          }),
        ),
    },
  ];

  return (
    <div className="catalog-sidebar-checkbox-list" aria-label="Особенности">
      {items.map((item) => (
        <label key={item.key} className="catalog-sidebar-checkbox">
          <input
            type="checkbox"
            checked={item.active}
            disabled={disabled}
            onChange={() => item.onClick()}
          />
          <span className="catalog-sidebar-checkbox__mark" aria-hidden />
          <span className="catalog-sidebar-checkbox__label">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

function CategorySidebarNav({
  filters,
  primary,
  overflow,
  onOpenMore,
  onNavigate,
}: {
  filters: CatalogFilterValues;
  primary: CatalogCategoryFacet[];
  overflow: CatalogCategoryFacet[];
  onOpenMore: () => void;
  onNavigate?: (next: CatalogFilterValues) => void;
}) {
  const pickCategory = (category?: string) => {
    const next = { ...filters, category, page: undefined };
    if (onNavigate) {
      onNavigate(next);
      return;
    }
  };

  return (
    <nav className="catalog-sidebar-nav" aria-label="Категории">
      {onNavigate ? (
        <button
          type="button"
          onClick={() => pickCategory(undefined)}
          className={`catalog-sidebar-nav__item${!filters.category ? ' catalog-sidebar-nav__item--active' : ''}`}
        >
          <span className="catalog-sidebar-nav__name">Все события</span>
        </button>
      ) : (
        <Link
          href={buildCatalogHref({ ...filters, category: undefined, page: undefined })}
          className={`catalog-sidebar-nav__item${!filters.category ? ' catalog-sidebar-nav__item--active' : ''}`}
        >
          <span className="catalog-sidebar-nav__name">Все события</span>
        </Link>
      )}
      {primary.map((item) => {
        const active = filters.category === item.name;
        const empty = item.events <= 0;
        const label = displayCatalogLabel(item.name);
        if (empty && !active) {
          return (
            <span
              key={item.name}
              className="catalog-sidebar-nav__item cursor-not-allowed opacity-40"
              aria-disabled="true"
            >
              <span className="catalog-sidebar-nav__name">{label}</span>
              <span className="catalog-sidebar-nav__count">0</span>
            </span>
          );
        }
        if (onNavigate) {
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => pickCategory(active ? undefined : item.name)}
              className={`catalog-sidebar-nav__item${active ? ' catalog-sidebar-nav__item--active' : ''}${empty ? ' opacity-60' : ''}`}
            >
              <span className="catalog-sidebar-nav__name">{label}</span>
              {item.events > 0 ? (
                <span className="catalog-sidebar-nav__count">{item.events}</span>
              ) : null}
            </button>
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
            className={`catalog-sidebar-nav__item${active ? ' catalog-sidebar-nav__item--active' : ''}${empty ? ' opacity-60' : ''}`}
          >
            <span className="catalog-sidebar-nav__name">{label}</span>
            {item.events > 0 ? (
              <span className="catalog-sidebar-nav__count">{item.events}</span>
            ) : null}
          </Link>
        );
      })}
      {overflow.length > 0 ? (
        <button type="button" onClick={onOpenMore} className="catalog-sidebar-nav__item catalog-sidebar-nav__item--more">
          <span className="catalog-sidebar-nav__name">Ещё категории</span>
          <span className="catalog-sidebar-nav__count">{overflow.length}</span>
        </button>
      ) : null}
    </nav>
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
          : 'border border-slate-200 bg-white text-graphite hover:bg-slate-50'
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

function mergeAdvancedFilters(
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
): CatalogFilterValues {
  const minPrice = next.minPrice === 'all' ? undefined : Number(next.minPrice);
  const maxPrice = next.maxPrice === 'all' ? undefined : Number(next.maxPrice);
  const hasRange = Boolean(next.dateFrom || next.dateTo);
  return {
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
  };
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
