'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
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
  /** Desktop drawer overlays the planner while leaving the map visible beside it. */
  desktopOverlay?: boolean;
  /** Mount point for the desktop inline accordion. Mobile keeps the modal sheet. */
  desktopAccordion?: boolean;
  desktopMount?: HTMLElement | null;
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
  desktopOverlay = false,
  desktopAccordion = false,
  desktopMount = null,
}: MyDayPickerSheetProps) {
  const titleId = useId();
  const descId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const current = tabs.find((t) => t.value === section) ?? tabs[0];
  const [pickerWidth, setPickerWidth] = usePersistedNumber(PICKER_WIDTH_KEY, PICKER_WIDTH_DEFAULT);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open || (desktopAccordion && isDesktop && desktopMount)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, desktopAccordion, desktopMount, isDesktop]);

  useEffect(() => {
    if (!open) return;
    // `KeyboardEvent` here is React's synthetic type (imported at the top), but this
    // handler is attached to the native document, so it must take the DOM event.
    function onKey(e: globalThis.KeyboardEvent) {
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

  const panel = (
    <>
      <header className={`flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 ${desktopAccordion ? 'px-4 py-2.5' : 'px-5 py-4'}`}>
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-bold text-slate-900">{desktopAccordion ? 'Добавить места' : 'Подбор точек'}</h2>
          {!desktopAccordion ? (
            <p id={descId} className="mt-0.5 text-xs text-slate-500">
              Один поиск по местам и событиям. Выбранное сразу в маршрут и на карту
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Закрыть подбор"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {search && !desktopAccordion ? (
        <div className="relative z-20 shrink-0 border-b border-slate-200 px-5 py-3" data-my-day-picker-search>
          {search}
        </div>
      ) : null}

      <div className={`grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)] sm:grid-rows-1 ${desktopOverlay || desktopAccordion ? 'lg:grid-cols-1 lg:grid-rows-[auto_minmax(0,1fr)]' : ''}`}>
        <div
          ref={listRef}
          role="tablist"
          aria-orientation={desktopOverlay || desktopAccordion ? 'horizontal' : 'vertical'}
          aria-label="Разделы подбора"
          onKeyDown={onKeyNav}
          className={`flex gap-1 overflow-x-auto border-b border-slate-200 p-2 [scrollbar-width:none] sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r sm:border-slate-200 [&::-webkit-scrollbar]:hidden ${desktopAccordion ? 'lg:grid lg:grid-cols-2 lg:gap-1 lg:rounded-xl lg:border-0 lg:bg-[#F1F4F9] lg:p-1' : desktopOverlay ? 'lg:grid lg:grid-cols-2 lg:gap-1 lg:border-b lg:border-r-0' : ''}`}
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
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition sm:w-full ${(desktopOverlay || desktopAccordion) ? 'lg:min-w-0 lg:px-2 lg:text-xs' : ''} ${desktopAccordion ? (on ? 'lg:min-h-8 lg:justify-center lg:rounded-lg lg:bg-white lg:py-1.5 lg:text-center lg:text-[11px] lg:text-[#0F1B2D] lg:shadow-[0_1px_3px_rgba(15,27,45,.12)]' : 'lg:min-h-8 lg:justify-center lg:rounded-lg lg:bg-transparent lg:py-1.5 lg:text-center lg:text-[11px] lg:text-slate-500 lg:hover:text-[#0F1B2D]') : on ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-white/80'}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${desktopAccordion ? 'lg:hidden' : ''}`} aria-hidden />
                <span className="min-w-0 sm:truncate lg:whitespace-normal">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div
          id="my-day-picker-panel"
          role="tabpanel"
          aria-labelledby={current ? `my-day-picker-tab-${current.value}` : undefined}
          className={`min-w-0 overflow-y-auto p-4 [container-type:inline-size] ${desktopAccordion ? 'lg:border-t lg:border-slate-200 lg:p-3' : desktopOverlay ? 'lg:border-t lg:border-slate-200' : ''}`}
        >
          {current ? <p className="mb-3 text-xs text-slate-500" data-my-day-picker-hint>{current.hint}</p> : null}
          {children}
        </div>
      </div>
    </>
  );

  if (desktopAccordion && isDesktop && desktopMount) {
    return createPortal(
      <section
        role="region"
        aria-labelledby={titleId}
        aria-describedby={!desktopAccordion ? descId : undefined}
        className="sticky top-0 z-30 mb-4 flex h-[calc(100dvh_-_var(--site-header-height)_-_1rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm motion-safe:animate-[my-day-picker-reveal_180ms_ease-out]"
        data-my-day-picker-accordion="1"
      >
        {panel}
      </section>,
      desktopMount,
    );
  }

  return createPortal(
    <div className={`fixed inset-0 z-[80] ${desktopOverlay ? 'lg:top-[var(--site-header-height)] lg:pointer-events-none' : ''}`} data-my-day-picker-sheet="1" role="presentation">
      <button
        type="button"
        aria-label="Закрыть подбор"
        className={`absolute inset-0 bg-slate-950/70 ${desktopOverlay ? 'lg:hidden' : ''}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`absolute inset-y-0 left-0 flex w-full max-w-full flex-col bg-white shadow-2xl sm:w-[min(92vw,var(--my-day-picker-w))] sm:max-w-none ${desktopOverlay ? 'lg:pointer-events-auto lg:fixed lg:inset-y-auto lg:bottom-0 lg:left-0 lg:top-[var(--site-header-height)] lg:w-[min(45vw,620px)] lg:min-w-[420px] lg:max-w-none' : ''}`}
        style={{ ['--my-day-picker-w' as string]: `${pickerWidth}px` }}
        data-my-day-picker-panel
      >
        {!desktopOverlay ? <MyDayResizeHandle
          label="Ширина подбора"
          showFrom="sm"
          className="right-0 translate-x-1/2"
          onDrag={(clientX) => {
            const max = Math.min(PICKER_WIDTH_MAX, Math.round(window.innerWidth * 0.92));
            setPickerWidth(Math.min(max, Math.max(PICKER_WIDTH_MIN, clientX)));
          }}
        /> : null}
        {panel}
      </aside>
    </div>,
    document.body,
  );
}

type MyDayPickerLaunchProps = {
  tabs: MyDayPickerTab[];
  onOpen: (section: MyDayPickerSection) => void;
  className?: string;
  /** Hide chip row when parent places chips elsewhere (e.g. empty shell sidebar). */
  showChips?: boolean;
  /** Stack title + CTA for narrow sidebar rails. */
  layout?: 'bar' | 'rail';
};

/** Compact bar: chips open the drawer without stacking catalogs on the page. */
export function MyDayPickerLaunch({
  tabs,
  onOpen,
  className = '',
  showChips = true,
  layout = 'bar',
}: MyDayPickerLaunchProps) {
  const first = tabs[0]?.value ?? 'scenarios';
  const rail = layout === 'rail';
  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`.trim()}
      data-my-day-picker-launch="1"
      data-my-day-picker-layout={layout}
      aria-label="Подбор точек для дня"
    >
      <div
        className={
          rail
            ? 'grid grid-cols-1 gap-3'
            : 'grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
        }
      >
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
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 ${
            rail ? 'w-full' : 'w-full sm:w-auto'
          }`}
        >
          Открыть подбор
        </button>
      </div>
      {showChips ? (
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
      ) : null}
    </div>
  );
}
