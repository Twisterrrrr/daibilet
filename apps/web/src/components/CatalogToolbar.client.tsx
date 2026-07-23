'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { CatalogAdvancedFiltersPanel } from '@/components/CatalogAdvancedFiltersPanel.client';

import type { PublicCatalogDto } from '@daibilet/contracts/public';
import {
  buildCatalogHref,
  CATALOG_DATE_OPTIONS,
  catalogFiltersFromQuery,
  countAdvancedFilters,
  type CatalogFilterValues,
} from '@/lib/catalog-url';
import { buildCatalogPresetHref } from '@/lib/catalog-links';
import {
  catalogPresetMatches,
  CATALOG_PRESETS,
} from '@/lib/catalog-presets';
import { categoryEmoji } from '@/lib/catalog-view-mode';

type CatalogToolbarProps = {
  facets: PublicCatalogDto['facets'];
  values: CatalogFilterValues;
  disabled?: boolean;
  /** False until header city from storage is resolved - hide «Все города» flash. */
  cityReady?: boolean;
};

const SEARCH_DEBOUNCE_MS = 350;

const DATE_SCROLL_OPTIONS = CATALOG_DATE_OPTIONS.map((option) => ({
  ...option,
  shortLabel:
    option.value === 'all'
      ? 'Любая'
      : option.value === 'weekend'
        ? 'Выходные'
        : option.value === 'evening'
          ? 'Вечер'
          : option.label,
}));

export function CatalogToolbar({
  facets,
  values,
  disabled = false,
  cityReady: _cityReady = true,
}: CatalogToolbarProps) {
  const router = useRouter();
  const filters = useMemo(() => catalogFiltersFromQuery(values), [values]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(() => Boolean(filters.q?.trim()));
  const [qDraft, setQDraft] = useState(filters.q || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const advancedCount = countAdvancedFilters(filters);
  const activePreset = CATALOG_PRESETS.some((preset) => catalogPresetMatches(preset.slug, filters));
  const activeDate = filters.date || 'all';
  const activeDateLabel =
    DATE_SCROLL_OPTIONS.find((option) => option.value === activeDate)?.shortLabel || 'Любая';
  const showMobileSearch = searchExpanded || Boolean(qDraft.trim());

  useEffect(() => {
    setQDraft(filters.q || '');
    if (filters.q?.trim()) setSearchExpanded(true);
  }, [filters.q]);

  useEffect(() => {
    if (!showMobileSearch) return;
    const frame = window.requestAnimationFrame(() => {
      // Only auto-focus when user explicitly expanded search on mobile.
      if (searchExpanded && !filters.q?.trim()) searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchExpanded, showMobileSearch, filters.q]);

  const navigate = (next: CatalogFilterValues) => {
    router.push(buildCatalogHref(next));
  };

  // Live-apply search (debounce). Enter still submits immediately via form.
  useEffect(() => {
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
      page: undefined,
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-3">
        {/* Primary bar: mobile compact / desktop full */}
        <div className="flex items-center gap-2">
          {/* Mobile collapsed: tap to expand search */}
          {!showMobileSearch ? (
            <button
              type="button"
              onClick={() => setSearchExpanded(true)}
              disabled={disabled}
              className="inline-btn flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3.5 text-left text-sm text-slate-500 ring-1 ring-slate-200/80 transition hover:bg-slate-100 disabled:opacity-60 sm:hidden"
            >
              <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">Поиск событий</span>
            </button>
          ) : null}

          {/* Search field: always on desktop; on mobile when expanded */}
          <label
            className={`relative min-w-0 flex-1 items-center ${
              showMobileSearch ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <span className="sr-only">Поиск по событиям</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="search"
              name="q"
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              placeholder="Название, место или артист"
              aria-label="Поиск по событиям"
              disabled={disabled}
              className="inline-btn h-11 w-full rounded-xl bg-slate-50 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
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
                className="inline-btn absolute right-2 grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-60"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Свернуть поиск"
                onClick={() => setSearchExpanded(false)}
                className="inline-btn absolute right-2 grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 sm:hidden"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          {/* Mobile date chip - jumps to scroller */}
          {!showMobileSearch ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                document.getElementById('catalog-date-scroller')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                });
              }}
              className={`inline-btn inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition disabled:opacity-60 sm:hidden ${
                activeDate !== 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200/80'
              }`}
              aria-controls="catalog-date-scroller"
            >
              {activeDateLabel}
            </button>
          ) : null}

          {/* Desktop date select */}
          <div className="relative hidden sm:block sm:w-44">
            <label htmlFor="catalog-date" className="sr-only">
              Дата
            </label>
            <select
              id="catalog-date"
              name="date"
              value={filters.date || 'all'}
              disabled={disabled}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-4 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-70"
            >
              {CATALOG_DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            disabled={disabled}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            aria-controls="advanced-filters-panel"
            className={`relative inline-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:opacity-60 sm:px-4 ${
              filtersOpen || advancedCount > 0
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal aria-hidden className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Фильтры</span>
            {advancedCount > 0 ? (
              <span
                className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-xs sm:static"
                aria-label={`Активных фильтров: ${advancedCount}`}
              >
                {advancedCount}
              </span>
            ) : null}
          </button>
        </div>
      </form>

      <CatalogAdvancedFiltersPanel
        open={filtersOpen}
        filters={{
          dateFrom: filters.from || '',
          dateTo: filters.to || '',
          minPrice: filters.minPrice != null ? String(filters.minPrice) : 'all',
          maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : 'all',
          ageMax: filters.ageMax != null && filters.ageMax >= 0 ? filters.ageMax : -1,
          landing: filters.landing || 'all',
        }}
        landings={facets.landings}
        onApply={(next) => {
          const minPrice = next.minPrice === 'all' ? undefined : Number(next.minPrice);
          const maxPrice = next.maxPrice === 'all' ? undefined : Number(next.maxPrice);
          navigate({
            ...filters,
            q: qDraft.trim() || filters.q,
            from: next.dateFrom || undefined,
            to: next.dateTo || undefined,
            minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
            maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
            ageMax: next.ageMax >= 0 ? next.ageMax : undefined,
            landing: next.landing === 'all' ? undefined : next.landing,
            page: undefined,
          });
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

      {/* Mobile: горизонтальный date scroller */}
      <div id="catalog-date-scroller" className="-mx-4 px-4 sm:hidden">
        <div
          role="radiogroup"
          aria-label="Дата"
          className="horizontal-snap-row flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {DATE_SCROLL_OPTIONS.map((option) => {
            const active = activeDate === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => setDate(option.value)}
                className={`inline-btn shrink-0 snap-start rounded-full px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Категории: на mobile сильнее visual weight + snap */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="horizontal-snap-row flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href={buildCatalogHref({ ...filters, category: undefined, page: undefined })}
            className={`shrink-0 snap-start rounded-full px-3.5 py-2 text-sm font-semibold transition sm:py-1.5 sm:font-medium ${
              !filters.category
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 sm:bg-white sm:ring-1 sm:ring-slate-200 sm:hover:bg-slate-50'
            }`}
          >
            Все
          </Link>
          {facets.categories.map((item) => (
            <Link
              key={item.name}
              href={buildCatalogHref({
                ...filters,
                category: filters.category === item.name ? undefined : item.name,
                page: undefined,
              })}
              className={`shrink-0 snap-start rounded-full px-3.5 py-2 text-sm font-semibold transition sm:py-1.5 sm:font-medium ${
                filters.category === item.name
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 sm:bg-white sm:ring-1 sm:ring-slate-200 sm:hover:bg-slate-50'
              }`}
            >
              <span className="mr-1 opacity-80">{categoryEmoji(item.name)}</span>
              {item.name}
              <span className={filters.category === item.name ? 'ml-1 text-white/70' : 'ml-1 text-slate-400'}>
                {item.events}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Подборки: secondary chips / свёрнуты на mobile */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <button
          type="button"
          onClick={() => setPresetsOpen((open) => !open)}
          className="inline-btn text-xs font-medium text-slate-500 hover:text-slate-800 sm:pointer-events-none sm:cursor-default"
          aria-expanded={presetsOpen || activePreset}
        >
          Подборки
          <span className="ml-1 sm:hidden">{presetsOpen || activePreset ? '▾' : '▸'}</span>
        </button>
        <div
          className={`flex flex-wrap items-center gap-1.5 ${
            presetsOpen || activePreset ? 'flex' : 'hidden sm:flex'
          }`}
        >
          {CATALOG_PRESETS.map((preset) => {
            const active = catalogPresetMatches(preset.slug, filters);
            const href = active
              ? buildCatalogHref({ city: filters.city, sort: 'popular' })
              : buildCatalogPresetHref(preset.slug, filters.city);
            return (
              <Link
                key={preset.slug}
                href={href}
                className={`inline-btn rounded-full px-2.5 py-0.5 text-xs transition ${
                  active
                    ? 'bg-slate-100 font-medium text-slate-800 ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
