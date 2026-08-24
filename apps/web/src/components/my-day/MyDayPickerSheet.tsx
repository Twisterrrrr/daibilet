'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import { MyDayResizeHandle } from '@/components/my-day/MyDayResizeHandle';
import { usePersistedNumber } from '@/components/my-day/usePersistedNumber';

const PICKER_WIDTH_KEY = 'daibilet.my-day.picker-width.v2';
const PICKER_WIDTH_DEFAULT = 1120;
const PICKER_WIDTH_MIN = 560;
const PICKER_WIDTH_MAX = 1280;

export type MyDayPickerSection =
  | 'scenarios'
  | 'places'
  | 'suburbs'
  | 'picks'
  | 'boat'
  | 'own';

export type MyDayPickerTab = {
  value: MyDayPickerSection;
  label: string;
  hint: string;
  icon: LucideIcon;
};

type MyDayPickerSheetProps = {
  open: boolean;
  section: MyDayPickerSection;
  tabs: MyDayPickerTab[];
  onSectionChange: (section: MyDayPickerSection) => void;
  onClose: () => void;
  /** Unified catalog search above tabs (places + events). */
  search?: ReactNode;
  children: ReactNode;
};

/**
 * Lovable-style left drawer for add-flow: scenarios / places / suburbs / picks / own.
 */
export function MyDayPickerSheet({
  open,
  section,
  tabs,
  onSectionChange,
  onClose,
  search,
  children,
}: MyDayPickerSheetProps) {
  const titleId = useId();
  const descId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const current = tabs.find((t) => t.value === section) ?? tabs[0];
  const [pickerWidth, setPickerWidth] = usePersistedNumber(PICKER_WIDTH_KEY, PICKER_WIDTH_DEFAULT);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  function onKeyNav(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.value === section);
    if (i < 0) return;
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    const value = tabs[next]?.value;
    if (!value) return;
    onSectionChange(value);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]" data-my-day-picker-sheet="1" role="presentation">
      <button
        type="button"
        aria-label="Закрыть подбор"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="absolute inset-y-0 left-0 flex w-full max-w-full flex-col bg-white shadow-2xl sm:w-[min(92vw,var(--my-day-picker-w))] sm:max-w-none"
        style={{ ['--my-day-picker-w' as string]: `${pickerWidth}px` }}
        data-my-day-picker-panel
      >
        <MyDayResizeHandle
          label="Ширина подбора"
          showFrom="sm"
          className="right-0 translate-x-1/2"
          onDrag={(clientX) => {
            const max = Math.min(PICKER_WIDTH_MAX, Math.round(window.innerWidth * 0.92));
            setPickerWidth(Math.min(max, Math.max(PICKER_WIDTH_MIN, clientX)));
          }}
        />
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              Подбор точек
            </h2>
            <p id={descId} className="mt-0.5 text-xs text-slate-500">
              Один поиск по местам и событиям. Выбранное сразу в маршрут и на карту
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {search ? (
          <div
            className="relative z-20 shrink-0 border-b border-slate-200 px-5 py-3"
            data-my-day-picker-search
          >
            {search}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)] sm:grid-rows-1">
          <div
            ref={listRef}
            role="tablist"
            aria-orientation="vertical"
            aria-label="Разделы подбора"
            onKeyDown={onKeyNav}
            className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 [scrollbar-width:none] sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r sm:border-slate-200 [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((t) => {
              const on = t.value === current?.value;
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  id={`my-day-picker-tab-${t.value}`}
                  aria-selected={on}
                  aria-controls="my-day-picker-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => onSectionChange(t.value)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition sm:w-full ${
                    on
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 sm:truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id="my-day-picker-panel"
            role="tabpanel"
            aria-labelledby={current ? `my-day-picker-tab-${current.value}` : undefined}
            className="min-w-0 overflow-y-auto p-4 [container-type:inline-size]"
          >
            {current ? (
              <p className="mb-3 text-xs text-slate-500" data-my-day-picker-hint>
                {current.hint}
              </p>
            ) : null}
            {children}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

type MyDayPickerLaunchProps = {
  tabs: MyDayPickerTab[];
  onOpen: (section: MyDayPickerSection) => void;
  className?: string;
};

/** Compact bar: chips open the drawer without stacking catalogs on the page. */
export function MyDayPickerLaunch({ tabs, onOpen, className = '' }: MyDayPickerLaunchProps) {
  const first = tabs[0]?.value ?? 'scenarios';
  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`.trim()}
      data-my-day-picker-launch="1"
      aria-label="Подбор точек для дня"
    >
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Добавить точки в день</p>
          <p className="text-xs text-slate-500">
            Сценарии, главные места, пригороды и рекомендации - в одной боковой панели
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(first)}
          data-my-day-picker-open
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 sm:w-auto"
        >
          Открыть подбор
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onOpen(t.value)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
