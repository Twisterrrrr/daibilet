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
  /** Desktop drawer overlays the planner while leaving the map visible beside it. */
  desktopOverlay?: boolean;
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
    // `KeyboardEvent` here is React's synthetic type (imported at the top), but this
    // handler is attached to the native document, so it must take the DOM event.
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] transition-[visibility] duration-300 ${open ? 'visible delay-0' : 'invisible delay-300 pointer-events-none'} ${desktopOverlay ? 'lg:top-[var(--site-header-height)] lg:pointer-events-none' : ''}`}
      data-my-day-picker-sheet="1"
      role="presentation"
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Закрыть подбор"
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 bg-slate-950/70 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'} ${desktopOverlay ? 'lg:hidden' : ''}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal={open || undefined}
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-hidden={!open}
        className={`absolute inset-y-0 left-0 flex w-full max-w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'} sm:w-[min(92vw,var(--my-day-picker-w))] sm:max-w-none ${desktopOverlay ? `lg:fixed lg:inset-y-auto lg:bottom-0 lg:left-0 lg:top-[var(--site-header-height)] lg:w-[min(45vw,620px)] lg:min-w-[420px] lg:max-w-none ${open ? 'lg:pointer-events-auto' : 'lg:pointer-events-none'}` : ''}`}
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
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 id={titleId} className="text-sm font-semibold text-slate-700">
            Подбор мест и событий
          </h2>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={listRef}
            role="tablist"
            aria-label="Разделы подбора"
            onKeyDown={onKeyNav}
            className="relative z-10 grid shrink-0 grid-cols-2 gap-1.5 border-b border-slate-200 bg-white px-4 py-2.5"
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
                  className={`inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5 text-left text-[13px] font-semibold leading-4 transition ${
                    on
                      ? 'bg-primary-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="line-clamp-2 min-w-0">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id="my-day-picker-panel"
            role="tabpanel"
            aria-labelledby={current ? `my-day-picker-tab-${current.value}` : undefined}
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50/50 p-4 [container-type:inline-size] ${desktopOverlay ? 'lg:border-t lg:border-slate-200' : ''}`}
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
};

/** Entry point for layouts without the route toolbar. */
export function MyDayPickerLaunch({
  tabs,
  onOpen,
}: MyDayPickerLaunchProps) {
  return (
    <button
      type="button"
      data-my-day-picker-open
      className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
      onClick={() => onOpen(tabs.some((tab) => tab.value === 'places') ? 'places' : tabs[0]?.value ?? 'own')}
    >
      Добавить места
    </button>
  );
}
