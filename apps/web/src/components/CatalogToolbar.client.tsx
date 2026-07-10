'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

import type { PublicCatalogDto } from '@daibilet/contracts/public';
import { CATALOG_PAGE_SIZES } from '@daibilet/contracts/catalog';
import {
  AGE_FILTER_OPTIONS,
  buildCatalogHref,
  CATALOG_SORT_OPTIONS,
  catalogFiltersFromQuery,
  countAdvancedFilters,
  type CatalogFilterValues,
} from '@/lib/catalog-url';
import {
  buildCatalogPresetValues,
  catalogPresetMatches,
  CATALOG_PRESETS,
} from '@/lib/catalog-presets';

type CatalogToolbarProps = {
  facets: PublicCatalogDto['facets'];
  values: CatalogFilterValues;
};

export function CatalogToolbar({ facets, values }: CatalogToolbarProps) {
  const router = useRouter();
  const filters = useMemo(() => catalogFiltersFromQuery(values), [values]);
  const [filtersOpen, setFiltersOpen] = useState(countAdvancedFilters(filters) > 0);
  const advancedCount = countAdvancedFilters(filters);

  const navigate = (next: CatalogFilterValues) => {
    router.push(buildCatalogHref(next));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = catalogFiltersFromQuery({
      ...filters,
      q: String(data.get('q') || ''),
      city: String(data.get('city') || 'all'),
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
              defaultValue={filters.q || ''}
              placeholder="Название, место или артист"
              aria-label="Поиск по событиям"
              className="inline-btn h-11 w-full rounded-xl bg-slate-50 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </label>

          <div className="relative sm:w-52">
            <label htmlFor="catalog-city" className="sr-only">
              Город
            </label>
            <select
              id="catalog-city"
              name="city"
              defaultValue={filters.city || 'all'}
              className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-4 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/60"
            >
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
            <div className="relative hidden sm:block">
              <label htmlFor="catalog-page-size" className="sr-only">
                Карточек на странице
              </label>
              <select
                id="catalog-page-size"
                value={filters.limit}
                onChange={(event) =>
                  navigate({ ...filters, limit: Number(event.target.value) as CatalogFilterValues['limit'] })
                }
                className="inline-btn h-10 appearance-none rounded-xl bg-slate-100 pl-3 pr-8 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {CATALOG_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} на странице
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className={`relative inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                filtersOpen || advancedCount > 0
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Фильтры</span>
              {advancedCount > 0 ? (
                <span aria-hidden className="grid min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-xs">
                  {advancedCount}
                </span>
              ) : null}
            </button>

            <button type="submit" className="btn-primary inline-btn h-10 px-4 text-sm">
              Найти
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div
            id="advanced-filters-panel"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
              <AdvancedField title="Категория">
                <select name="category" defaultValue={filters.category || 'all'} className={selectCls}>
                  <option value="all">Все категории</option>
                  {facets.categories.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} ({item.events})
                    </option>
                  ))}
                </select>
              </AdvancedField>

              <AdvancedField title="Подборка">
                <select name="landing" defaultValue={filters.landing || 'all'} className={selectCls}>
                  <option value="all">Все подборки</option>
                  {facets.landings.slice(0, 24).map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.title} ({item.events})
                    </option>
                  ))}
                </select>
              </AdvancedField>

              <AdvancedField title="Дата">
                <select name="date" defaultValue={filters.date || 'all'} className={selectCls}>
                  <option value="all">Любая дата</option>
                  <option value="today">Сегодня</option>
                  <option value="tomorrow">Завтра</option>
                  <option value="weekend">На выходных</option>
                  <option value="evening">Вечером</option>
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input type="date" name="from" defaultValue={filters.from || ''} className={inputCls} aria-label="Дата с" />
                  <input type="date" name="to" defaultValue={filters.to || ''} className={inputCls} aria-label="Дата по" />
                </div>
              </AdvancedField>

              <AdvancedField title="Цена и возраст">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="minPrice"
                    min={0}
                    step={100}
                    defaultValue={filters.minPrice ?? ''}
                    placeholder="от"
                    className={inputCls}
                    aria-label="Цена от"
                  />
                  <input
                    type="number"
                    name="maxPrice"
                    min={0}
                    step={100}
                    defaultValue={filters.maxPrice ?? ''}
                    placeholder="до"
                    className={inputCls}
                    aria-label="Цена до"
                  />
                </div>
                <select
                  name="ageMax"
                  defaultValue={filters.ageMax != null && filters.ageMax >= 0 ? String(filters.ageMax) : '-1'}
                  className={`${selectCls} mt-2`}
                >
                  {AGE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {facets.priceSteps.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {facets.priceSteps.map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => navigate({ ...filters, maxPrice: step, minPrice: undefined })}
                        className="inline-btn rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      >
                        до {step} ₽
                      </button>
                    ))}
                  </div>
                ) : null}
              </AdvancedField>
            </div>
          </div>
        ) : null}
      </form>

      <div className="horizontal-snap-row scrollbar-hide">
        <div className="flex w-max flex-nowrap gap-2">
          {CATALOG_PRESETS.map((preset) => {
            const active = catalogPresetMatches(preset.slug, filters);
            const href = buildCatalogHref(
              active ? { sort: 'popular' } : buildCatalogPresetValues(preset.slug, false),
            );
            return (
              <Link
                key={preset.slug}
                href={href}
                className={`catalog-chip ${active ? 'catalog-chip-active' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                <span aria-hidden>{preset.emoji}</span>
                {preset.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdvancedField({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </div>
  );
}

const inputCls =
  'inline-btn h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40';
const selectCls =
  'inline-btn h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40';

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
