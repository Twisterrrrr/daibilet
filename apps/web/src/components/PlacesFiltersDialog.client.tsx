'use client';

import * as React from 'react';
import { MapPin, SlidersHorizontal, X } from 'lucide-react';
import { createPortal } from 'react-dom';

type PlacesScope = 'all' | 'institutions' | 'locations' | 'events';

type CategoryChip = {
  id: string;
  label: string;
  count: number;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SCOPE_OPTIONS: Array<[PlacesScope, string]> = [
  ['all', 'Все места'],
  ['institutions', 'Площадки'],
  ['locations', 'Локации'],
  ['events', 'С событиями'],
];

export function PlacesFiltersDialog({
  open,
  activeCount,
  resultLabel,
  cityPending,
  cityFilter,
  cityOptions,
  scope,
  typeFilter,
  categoryChips,
  onCityChange,
  onScopeChange,
  onTypeChange,
  onReset,
  onClose,
}: {
  open: boolean;
  activeCount: number;
  resultLabel: string;
  cityPending: boolean;
  cityFilter: string;
  cityOptions: Array<[string, number]>;
  scope: PlacesScope;
  typeFilter: string;
  categoryChips: CategoryChip[];
  onCityChange: (value: string) => void;
  onScopeChange: (value: PlacesScope) => void;
  onTypeChange: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="places-filters-title"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
            <h2 id="places-filters-title" className="font-display text-lg font-bold text-slate-950">
              Фильтры мест
            </h2>
            {activeCount > 0 ? (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {activeCount}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-btn min-h-9 px-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Сбросить
              </button>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Закрыть фильтры"
              title="Закрыть"
              className="inline-btn grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800" htmlFor="places-filter-city">
              <MapPin className="h-4 w-4 text-primary-600" aria-hidden />
              Город
            </label>
            <select
              id="places-filter-city"
              value={cityPending ? '' : cityFilter}
              disabled={cityPending}
              onChange={(event) => onCityChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-[#F5F5F7] px-3.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {cityPending ? <option value="">Город...</option> : null}
              <option value="all">Все города</option>
              {cityOptions.map(([city, count]) => (
                <option key={city} value={city}>
                  {city} ({count})
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Показывать</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map(([value, label]) => {
                const active = scope === value && typeFilter === 'all';
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onScopeChange(value)}
                    className={`catalog-chip ${active ? 'catalog-chip-on' : 'catalog-chip-idle'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Тип места</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={typeFilter === 'all'}
                onClick={() => onTypeChange('all')}
                className={`flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  typeFilter === 'all'
                    ? 'bg-slate-950 text-white'
                    : 'bg-[#F5F5F7] text-slate-800 hover:bg-slate-200/70'
                }`}
              >
                <span>Все типы</span>
              </button>
              {categoryChips.map((chip) => {
                const active = typeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onTypeChange(active ? 'all' : chip.id)}
                    className={`flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                      active
                        ? 'bg-slate-950 text-white'
                        : 'bg-[#F5F5F7] text-slate-800 hover:bg-slate-200/70'
                    }`}
                  >
                    <span className="min-w-0 leading-tight [overflow-wrap:anywhere]">{chip.label}</span>
                    <span className={`shrink-0 ${active ? 'text-white/65' : 'text-slate-400'}`}>{chip.count}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700"
          >
            {resultLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
