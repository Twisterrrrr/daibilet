'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { CatalogAdvancedFiltersPanel } from '@/components/CatalogAdvancedFiltersPanel.client';

import type { PublicCatalogDto } from '@daibilet/contracts/public';
import {
  buildCatalogHref,
  CATALOG_SORT_OPTIONS,
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
import { persistSelectedCity } from '@/lib/selected-city';

type CatalogToolbarProps = {
  facets: PublicCatalogDto['facets'];
  values: CatalogFilterValues;
  disabled?: boolean;
  /** False until header city from storage is resolved — hide «Все города» flash. */
  cityReady?: boolean;
};

export function CatalogToolbar({
  facets,
  values,
  disabled = false,
  cityReady = true,
}: CatalogToolbarProps) {
  const router = useRouter();
  const filters = useMemo(() => catalogFiltersFromQuery(values), [values]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qDraft, setQDraft] = useState(filters.q || '');
  const advancedCount = countAdvancedFilters(filters);
  const cityPending = !cityReady && !filters.city;

  useEffect(() => {
    setQDraft(filters.q || '');
  }, [filters.q]);

  const navigate = (next: CatalogFilterValues) => {
    router.push(buildCatalogHref(next));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextCity = String(data.get('city') || 'all');
    persistSelectedCity(nextCity === 'all' ? 'all' : nextCity);
    const next = catalogFiltersFromQuery({
      ...filters,
      q: String(data.get('q') || ''),
      city: nextCity,
      category: String(data.get('category') || 'all'),
      landing: String(data.get('landing') || 'all'),
      date: String(data.get('date') || 'all'),
      from: String(data.get('from') || ''),
      to: String(data.get('to') || ''),
      minPrice: parseOptionalNumber(data.get('minPrice')),
      maxPrice: parseOptionalNumber(data.get('maxPrice')),
      ageMax: parseAgeMax(data.get('ageMax')),
      sort: filters.sort,
      limit: filters.limit,
    });
    navigate(next);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex flex-1 items-center">
            <span className="sr-only">Поиск по событиям</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              name="q"
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              placeholder="Название, место или артист"
              aria-label="Поиск по событиям"
              className="inline-btn h-11 w-full rounded-xl bg-slate-50 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            {qDraft ? (
              <button
                type="button"
                aria-label="Очистить поиск"
                onClick={() => setQDraft('')}
                className="inline-btn absolute right-2 grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="relative sm:w-52">
            <label htmlFor="catalog-city" className="sr-only">
              Город
            </label>
            <select
              id="catalog-city"
              name="city"
              value={cityPending ? '' : filters.city || 'all'}
              disabled={disabled || cityPending}
              onChange={(event) => {
                const nextCity = event.target.value;
                persistSelectedCity(nextCity === 'all' ? 'all' : nextCity);
                navigate({
                  ...filters,
                  q: qDraft.trim() || undefined,
                  city: nextCity === 'all' ? undefined : nextCity,
                  page: undefined,
                });
              }}
              className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-4 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-70"
            >
              {cityPending ? <option value="">Город…</option> : null}
              <option value="all">Все города</option>
              {facets.cities.slice(0, 40).map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Сортировка" className="inline-flex rounded-xl bg-slate-100 p-1">
            {CATALOG_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={filters.sort === option.value}
                onClick={() => navigate({ ...filters, sort: option.value })}
                className={`inline-btn h-9 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  filters.sort === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
              aria-controls="advanced-filters-panel"
              className={`relative inline-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ${
                filtersOpen || advancedCount > 0
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Фильтры</span>
              {advancedCount > 0 ? (
                <span
                  className="grid min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-xs"
                  aria-label={`Активных фильтров: ${advancedCount}`}
                >
                  {advancedCount}
                </span>
              ) : null}
            </button>

            <button
              type="submit"
              disabled={disabled}
              className="btn-primary inline-btn h-10 px-4 text-sm disabled:opacity-60"
            >
              Найти
            </button>
          </div>
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

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="horizontal-snap-row flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href={buildCatalogHref({ ...filters, category: undefined })}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !filters.category ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="mr-1">✨</span>
            Все
          </Link>
          {facets.categories.map((item) => (
            <Link
              key={item.name}
              href={buildCatalogHref({
                ...filters,
                category: filters.category === item.name ? undefined : item.name,
              })}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filters.category === item.name
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="mr-1">{categoryEmoji(item.name)}</span>
              {item.name}
              <span className={filters.category === item.name ? 'ml-1 text-white/70' : 'ml-1 text-slate-400'}>
                {item.events}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Подборки:</span>
        {CATALOG_PRESETS.map((preset) => {
          const active = catalogPresetMatches(preset.slug, filters);
          const href = active
            ? buildCatalogHref({ city: filters.city, sort: 'popular' })
            : buildCatalogPresetHref(preset.slug, filters.city);
          return (
            <Link
              key={preset.slug}
              href={href}
              className={`inline-btn rounded-full px-3 py-1 text-xs font-medium transition ${
                active ? 'bg-primary/10 text-primary-700 ring-1 ring-primary/30' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseAgeMax(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number(String(value ?? '-1'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
