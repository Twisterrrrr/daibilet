'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, SlidersHorizontal, Users, Wallet, X } from 'lucide-react';

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
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40';
const quickChipCls =
  'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';
const legendCls = 'mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500';
const sectionCls = 'p-5 pt-6';
const subLabelCls = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400';

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
      aria-labelledby="advanced-filters-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
        <h3 id="advanced-filters-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <SlidersHorizontal aria-hidden className="h-4 w-4 text-primary-600" />
          Расширенные фильтры
        </h3>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label="Закрыть панель фильтров"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className={sectionCls}>
          <div className={legendCls}>
            <CalendarIcon aria-hidden className="h-3.5 w-3.5" /> Дата события
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={subLabelCls}>с</span>
              <input
                type="date"
                value={filters.dateFrom}
                aria-label="Дата с"
                onChange={(event) => onChange({ dateFrom: event.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={subLabelCls}>по</span>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                aria-label="Дата по"
                onChange={(event) => onChange({ dateTo: event.target.value })}
                className={inputCls}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
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
                className={quickChipCls}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={sectionCls}>
          <div className={legendCls}>
            <Wallet aria-hidden className="h-3.5 w-3.5" /> Цена, ₽
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={subLabelCls}>от</span>
              <input
                type="number"
                min={0}
                step={100}
                value={minDraft}
                placeholder="0"
                aria-label="Цена от, руб."
                onChange={(event) => setMinDraft(event.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={subLabelCls}>до</span>
              <input
                type="number"
                min={0}
                step={100}
                value={maxDraft}
                placeholder="∞"
                aria-label="Цена до, руб."
                onChange={(event) => setMaxDraft(event.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
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
                className={quickChipCls}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={sectionCls}>
          <div className={legendCls}>
            <Users aria-hidden className="h-3.5 w-3.5" /> Возрастное ограничение
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Возрастное ограничение">
            <button
              type="button"
              role="radio"
              aria-checked={filters.ageMax < 0}
              onClick={() => onChange({ ageMax: -1 })}
              className={`h-10 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                filters.ageMax < 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Любое
            </button>
            {AGE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={filters.ageMax === option.value}
                onClick={() => onChange({ ageMax: option.value })}
                className={`h-10 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  filters.ageMax === option.value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                до {option.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-slate-400">
            Покажем события, чей возрастной ценз не выше выбранного.
          </p>
        </div>
      </div>

      {landings.length ? (
        <div className="border-t border-slate-200 px-5 py-4 pt-5">
          <div className={legendCls}>Подборка</div>
          <select
            value={filters.landing}
            onChange={(event) => onChange({ landing: event.target.value })}
            className={`${inputCls} max-w-md`}
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

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <X aria-hidden className="h-3.5 w-3.5" /> Сбросить всё
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-primary-600 px-5 py-2 text-xs font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
        >
          Применить
        </button>
      </div>
    </div>
  );
}
