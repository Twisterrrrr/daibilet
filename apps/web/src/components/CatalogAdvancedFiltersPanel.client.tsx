'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, Users, Wallet, X } from 'lucide-react';

import { formatNumber } from '@/lib/format';

type LandingFacet = { slug: string; title: string; events: number };

export type AdvancedCatalogFilters = {
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
  ageMax: number;
  landing: string;
};

export const AGE_FILTER_OPTIONS = [
  { value: 0, label: '0+' },
  { value: 6, label: '6+' },
  { value: 12, label: '12+' },
  { value: 16, label: '16+' },
  { value: 18, label: '18+' },
] as const;

const inputCls =
  'h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30';
const chipCls =
  'inline-btn rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
const labelCls = 'mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600';

function filterChip(active: boolean) {
  return active
    ? `${chipCls} border-primary bg-primary text-white`
    : `${chipCls} border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
}

export function CatalogAdvancedFiltersPanel({
  filters,
  landings,
  onChange,
  onClose,
  onReset,
}: {
  filters: AdvancedCatalogFilters;
  landings: LandingFacet[];
  onChange: (patch: Partial<AdvancedCatalogFilters>) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [minDraft, setMinDraft] = React.useState(filters.minPrice === 'all' ? '' : filters.minPrice);
  const [maxDraft, setMaxDraft] = React.useState(filters.maxPrice === 'all' ? '' : filters.maxPrice);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);
  const firstPriceSync = React.useRef(true);

  React.useEffect(() => {
    setMinDraft(filters.minPrice === 'all' ? '' : filters.minPrice);
    setMaxDraft(filters.maxPrice === 'all' ? '' : filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);

  React.useEffect(() => {
    if (firstPriceSync.current) {
      firstPriceSync.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      onChange({
        minPrice: minDraft.trim() ? minDraft.trim() : 'all',
        maxPrice: maxDraft.trim() ? maxDraft.trim() : 'all',
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [maxDraft, minDraft, onChange]);

  React.useEffect(() => {
    closeBtnRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setDateRange = (from: string, to: string) => {
    onChange({ dateFrom: from, dateTo: to });
  };

  const isoDay = (date: Date) => date.toISOString().slice(0, 10);

  return (
    <div
      id="advanced-filters-panel"
      role="region"
      aria-label="Расширенные фильтры"
      className="catalog-advanced-filters relative rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
    >
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        className="inline-btn absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Закрыть панель фильтров"
      >
        <X aria-hidden className="h-3.5 w-3.5" />
      </button>

      <div className="grid gap-4 pr-8 lg:grid-cols-3 lg:gap-5">
        <section>
          <div className={labelCls}>
            <CalendarIcon aria-hidden className="h-3.5 w-3.5 text-slate-400" />
            Дата
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              aria-label="Дата с"
              onChange={(event) => onChange({ dateFrom: event.target.value })}
              className={inputCls}
            />
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              aria-label="Дата по"
              onChange={(event) => onChange({ dateTo: event.target.value })}
              className={inputCls}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { label: 'Сегодня', days: 0 },
              { label: 'Завтра', days: 1 },
              { label: 'Неделя', days: 7 },
              { label: 'Месяц', days: 30 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  const today = new Date();
                  const to = new Date(today);
                  to.setDate(today.getDate() + item.days);
                  setDateRange(isoDay(today), isoDay(to));
                }}
                className={filterChip(false)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className={labelCls}>
            <Wallet aria-hidden className="h-3.5 w-3.5 text-slate-400" />
            Цена, ₽
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              step={100}
              value={minDraft}
              placeholder="от"
              aria-label="Цена от, руб."
              onChange={(event) => setMinDraft(event.target.value)}
              className={inputCls}
            />
            <input
              type="number"
              min={0}
              step={100}
              value={maxDraft}
              placeholder="до"
              aria-label="Цена до, руб."
              onChange={(event) => setMaxDraft(event.target.value)}
              className={inputCls}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { label: 'Бесплатно', min: '0', max: '0' },
              { label: 'до 1000', min: '', max: '1000' },
              { label: '1–3К', min: '1000', max: '3000' },
              { label: '3К+', min: '3000', max: '' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMinDraft(item.min);
                  setMaxDraft(item.max);
                }}
                className={filterChip(false)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <div className={labelCls}>
              <Users aria-hidden className="h-3.5 w-3.5 text-slate-400" />
              Возраст
            </div>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Возрастное ограничение">
              <button
                type="button"
                role="radio"
                aria-checked={filters.ageMax < 0}
                onClick={() => onChange({ ageMax: -1 })}
                className={filterChip(filters.ageMax < 0)}
              >
                Любой
              </button>
              {AGE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={filters.ageMax === option.value}
                  onClick={() => onChange({ ageMax: option.value })}
                  className={filterChip(filters.ageMax === option.value)}
                >
                  до {option.label}
                </button>
              ))}
            </div>
          </div>

          {landings.length ? (
            <div>
              <label htmlFor="catalog-advanced-landing" className={labelCls}>
                Подборка
              </label>
              <select
                id="catalog-advanced-landing"
                value={filters.landing}
                onChange={(event) => onChange({ landing: event.target.value })}
                className={inputCls}
              >
                <option value="all">Все подборки</option>
                {landings.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title} · {formatNumber(item.events)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-btn text-xs font-medium text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Сбросить
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-btn rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
