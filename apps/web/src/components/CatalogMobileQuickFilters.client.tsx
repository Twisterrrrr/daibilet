'use client';

import {
  Calendar,
  MapPin,
  SlidersHorizontal,
  Ticket,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

import { CategoryTabIcon } from '@/components/CategoryTabIcon';
import { displayCatalogLabel } from '@/lib/catalog-labels';
import type { CatalogCategoryFacet } from '@/lib/catalog-category-rail';
import {
  catalogFiltersFromQuery,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

type QuickSheet = 'price' | 'date' | 'type' | 'location' | null;

type CatalogMobileQuickFiltersProps = {
  filters: CatalogFilterValues;
  categories: CatalogCategoryFacet[];
  disabled?: boolean;
  activeCount: number;
  onNavigate: (next: CatalogFilterValues) => void;
  onOpenAllFilters: () => void;
};

const PRICE_PRESETS = [
  { key: 'free', label: 'Бесплатно', min: 0, max: 0 },
  { key: 'to1k', label: 'до 1 000 ₽', min: undefined, max: 1000 },
  { key: '1k3k', label: '1 000 - 3 000 ₽', min: 1000, max: 3000 },
  { key: 'from3k', label: 'от 3 000 ₽', min: 3000, max: undefined },
] as const;

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

function priceActive(filters: CatalogFilterValues): boolean {
  return filters.minPrice != null || filters.maxPrice != null;
}

function dateActive(filters: CatalogFilterValues): boolean {
  return Boolean(filters.date || filters.from || filters.to);
}

function typeActive(filters: CatalogFilterValues): boolean {
  return Boolean(filters.category);
}

function locationActive(filters: CatalogFilterValues): boolean {
  return Boolean(filters.q?.trim());
}

function countResettable(filters: CatalogFilterValues): number {
  let n = 0;
  if (priceActive(filters)) n += 1;
  if (dateActive(filters)) n += 1;
  if (typeActive(filters)) n += 1;
  if (locationActive(filters)) n += 1;
  if (filters.ageMax != null && filters.ageMax >= 0) n += 1;
  if (filters.landing) n += 1;
  return n;
}

export function CatalogMobileQuickFilters({
  filters,
  categories,
  disabled = false,
  activeCount,
  onNavigate,
  onOpenAllFilters,
}: CatalogMobileQuickFiltersProps) {
  const [sheet, setSheet] = useState<QuickSheet>(null);
  const [locationDraft, setLocationDraft] = useState(filters.q || '');
  const titleId = useId();

  useEffect(() => {
    setLocationDraft(filters.q || '');
  }, [filters.q]);

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheet(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [sheet]);

  const resetQuick = () => {
    onNavigate(
      catalogFiltersFromQuery({
        city: filters.city,
        sort: filters.sort,
        limit: filters.limit,
      }),
    );
  };

  const chipClass = (active: boolean) =>
    `inline-btn inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-60 ${
      active
        ? 'bg-graphite text-white shadow-sm'
        : 'bg-[#F5F5F7] text-graphite hover:bg-slate-200/70'
    }`;

  const sheetTitle =
    sheet === 'price'
      ? 'Цена'
      : sheet === 'date'
        ? 'Дата'
        : sheet === 'type'
          ? 'Тип'
          : sheet === 'location'
            ? 'Локация'
            : '';

  const sheetBody =
    sheet === 'price' ? (
      <div className="flex flex-wrap gap-2">
        {PRICE_PRESETS.map((preset) => {
          const active =
            (preset.min === 0 && preset.max === 0 && filters.minPrice === 0 && filters.maxPrice === 0) ||
            (preset.key === 'to1k' && filters.maxPrice === 1000 && filters.minPrice == null) ||
            (preset.key === '1k3k' && filters.minPrice === 1000 && filters.maxPrice === 3000) ||
            (preset.key === 'from3k' && filters.minPrice === 3000 && filters.maxPrice == null);
          return (
            <button
              key={preset.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                onNavigate(
                  catalogFiltersFromQuery({
                    ...filters,
                    minPrice: active ? undefined : preset.min,
                    maxPrice: active ? undefined : preset.max,
                    page: undefined,
                  }),
                );
                setSheet(null);
              }}
              className={chipClass(active)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    ) : sheet === 'date' ? (
      <div className="flex flex-col gap-1">
        {DATE_PRESETS.map((item) => {
          const active =
            item.key === 'all'
              ? !filters.date && !filters.from && !filters.to
              : filters.date === item.date && !filters.from && !filters.to;
          return (
            <button
              key={item.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                onNavigate(
                  catalogFiltersFromQuery({
                    ...filters,
                    date: item.date,
                    from: undefined,
                    to: undefined,
                    page: undefined,
                    sort:
                      item.date === 'today' || item.date === 'tomorrow' || item.date === 'evening'
                        ? 'time'
                        : filters.sort,
                  }),
                );
                setSheet(null);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active ? 'bg-graphite text-white' : 'text-graphite hover:bg-surface-muted'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    ) : sheet === 'type' ? (
      <div className="max-h-[min(50vh,20rem)] overflow-y-auto">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onNavigate(catalogFiltersFromQuery({ ...filters, category: undefined, page: undefined }));
            setSheet(null);
          }}
          className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
            !filters.category ? 'bg-graphite text-white' : 'text-graphite hover:bg-surface-muted'
          }`}
        >
          <CategoryTabIcon name="Все" className={!filters.category ? 'text-white/85' : 'text-graphite-muted'} />
          Все события
        </button>
        {categories.map((item) => {
          const label = displayCatalogLabel(item.name);
          const active = filters.category === item.name;
          if (item.events <= 0 && !active) return null;
          return (
            <button
              key={item.name}
              type="button"
              disabled={disabled}
              onClick={() => {
                onNavigate(
                  catalogFiltersFromQuery({
                    ...filters,
                    category: active ? undefined : item.name,
                    page: undefined,
                  }),
                );
                setSheet(null);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm transition ${
                active ? 'bg-graphite text-white' : 'text-graphite hover:bg-surface-muted'
              }`}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <CategoryTabIcon name={label} className={active ? 'text-white/85' : 'text-graphite-muted'} />
                <span className="truncate font-medium">{label}</span>
              </span>
              {item.events > 0 ? (
                <span className={`shrink-0 text-xs ${active ? 'text-white/70' : 'text-graphite-muted'}`}>
                  {item.events}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    ) : sheet === 'location' ? (
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const q = locationDraft.trim();
          onNavigate(
            catalogFiltersFromQuery({
              ...filters,
              q: q || undefined,
              page: undefined,
            }),
          );
          setSheet(null);
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-graphite-muted">Район, метро или площадка</span>
          <input
            type="search"
            value={locationDraft}
            onChange={(event) => setLocationDraft(event.target.value)}
            placeholder="Название места"
            disabled={disabled}
            className="h-11 w-full rounded-xl border border-transparent bg-[#F5F5F7] px-3.5 text-sm text-graphite outline-none focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="inline-btn inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          Применить
        </button>
      </form>
    ) : null;

  const resetCount = countResettable(filters);

  return (
    <>
      <div className="catalog-mobile-quick-chips lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" disabled={disabled} onClick={() => setSheet('price')} className={chipClass(priceActive(filters))}>
            <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Цена
          </button>
          <button type="button" disabled={disabled} onClick={() => setSheet('date')} className={chipClass(dateActive(filters))}>
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Дата
          </button>
          <button type="button" disabled={disabled} onClick={() => setSheet('type')} className={chipClass(typeActive(filters))}>
            <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Тип
          </button>
          <button type="button" disabled={disabled} onClick={() => setSheet('location')} className={chipClass(locationActive(filters))}>
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Локация
          </button>
          {resetCount > 0 ? (
            <button
              type="button"
              disabled={disabled}
              onClick={resetQuick}
              className="inline-btn shrink-0 text-xs font-semibold text-primary-700 hover:underline disabled:opacity-60"
            >
              Сбросить
            </button>
          ) : null}
        </div>
      </div>

      <div className="catalog-mobile-sticky-filters pointer-events-none fixed inset-x-0 bottom-0 z-[98] lg:hidden">
        <div className="pointer-events-auto mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_-4px_24px_rgba(15,23,42,0.1)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenAllFilters}
            className={`inline-btn inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-60 ${
              activeCount > 0 ? 'bg-primary text-white hover:bg-primary/90' : 'bg-[#1A1A1A] text-white hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{activeCount > 0 ? `Фильтры (${activeCount})` : 'Фильтры'}</span>
          </button>
          <button type="button" disabled={disabled} aria-label="Цена" onClick={() => setSheet('price')} className={`catalog-mobile-sticky-filters__icon ${priceActive(filters) ? 'is-active' : ''}`}>
            <Wallet className="h-[1.15rem]" strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" disabled={disabled} aria-label="Дата" onClick={() => setSheet('date')} className={`catalog-mobile-sticky-filters__icon ${dateActive(filters) ? 'is-active' : ''}`}>
            <Calendar className="h-[1.15rem]" strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" disabled={disabled} aria-label="Тип" onClick={() => setSheet('type')} className={`catalog-mobile-sticky-filters__icon ${typeActive(filters) ? 'is-active' : ''}`}>
            <Ticket className="h-[1.15rem]" strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" disabled={disabled} aria-label="Локация" onClick={() => setSheet('location')} className={`catalog-mobile-sticky-filters__icon ${locationActive(filters) ? 'is-active' : ''}`}>
            <MapPin className="h-[1.15rem]" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      {sheet && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center lg:hidden">
              <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-slate-950/40" onClick={() => setSheet(null)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-[1] flex max-h-[min(75vh,28rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h2 id={titleId} className="font-display text-base font-bold text-graphite">
                    {sheetTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSheet(null)}
                    className="inline-btn grid h-9 w-9 place-items-center rounded-xl text-graphite-muted hover:bg-surface-muted"
                    aria-label="Закрыть"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{sheetBody}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
