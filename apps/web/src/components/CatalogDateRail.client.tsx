'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  buildCatalogDateRailChips,
  CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX,
  formatCatalogDateRangeLabel,
  isDateRailChipActive,
  nextCatalogDateRailSelection,
  toLocalIsoDay,
  type CatalogDateRailDayChip,
} from '@/lib/catalog-date-rail';
import { isCatalogPageSize } from '@daibilet/contracts/catalog';
import {
  buildCatalogHref,
  catalogFiltersFromQuery,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

type CatalogDateRailProps = {
  disabled?: boolean;
  className?: string;
};

const EDGE_EPS = 4;
const SCROLL_STEP_CARDS = 5;

/**
 * Vertical day cards (СЕГ/ЗАВ + number + month) with range selection:
 * click A → day; click B → range A–B; click inside range → that day; click same day again → clear.
 * Desktop: Afisha-style prev/next; calendar/filter control on the row below so the day strip uses full width.
 */
export function CatalogDateRail({ disabled = false, className = '' }: CatalogDateRailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chips = useMemo(
    () =>
      buildCatalogDateRailChips(new Date(), CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX) as CatalogDateRailDayChip[],
    [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => {
    const minRaw = searchParams.get('minPrice');
    const maxRaw = searchParams.get('maxPrice');
    const ageRaw = searchParams.get('ageMax');
    const limitRaw = searchParams.get('limit');
    const minPrice = minRaw != null ? Number(minRaw) : undefined;
    const maxPrice = maxRaw != null ? Number(maxRaw) : undefined;
    const ageMax = ageRaw != null ? Number(ageRaw) : undefined;
    const limitNum = limitRaw != null ? Number(limitRaw) : undefined;
    return catalogFiltersFromQuery({
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      landing: searchParams.get('landing') || undefined,
      date: searchParams.get('date') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      sort: (searchParams.get('sort') as CatalogFilterValues['sort']) || undefined,
      limit: limitNum != null && isCatalogPageSize(limitNum) ? limitNum : undefined,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
    });
  }, [searchParams]);

  const rangeLabel = formatCatalogDateRangeLabel(filters.from, filters.to || filters.from);
  const dateFilterOn = Boolean(filters.from || filters.to) && !filters.date;

  const syncScrollState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + EDGE_EPS;
    setCanPrev(overflow && scrollLeft > EDGE_EPS);
    setCanNext(overflow && scrollLeft + clientWidth < scrollWidth - EDGE_EPS);
  }, []);

  useLayoutEffect(() => {
    syncScrollState();
  }, [syncScrollState, chips.length]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncScrollState, { passive: true });
    el.addEventListener('scrollend', syncScrollState);
    window.addEventListener('resize', syncScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncScrollState) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', syncScrollState);
      el.removeEventListener('scrollend', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
      ro?.disconnect();
    };
  }, [syncScrollState]);

  useEffect(() => {
    if (!pickerOpen) return;
    setDraftFrom(filters.from || '');
    setDraftTo(filters.to || filters.from || '');
    const timer = window.setTimeout(() => fromInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [pickerOpen, filters.from, filters.to]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && pickerRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pickerOpen]);

  const navigate = (next: CatalogFilterValues) => {
    router.push(buildCatalogHref(next));
  };

  const onSelectDay = (iso: string) => {
    setPickerOpen(false);
    const nextRange = nextCatalogDateRailSelection(
      { from: filters.from, to: filters.to },
      iso,
    );
    navigate({
      ...filters,
      date: undefined,
      from: nextRange.from,
      to: nextRange.to,
      page: undefined,
    });
  };

  const applyRange = () => {
    const from = draftFrom.trim();
    const to = (draftTo.trim() || draftFrom.trim()).trim();
    if (!from) {
      navigate({
        ...filters,
        date: undefined,
        from: undefined,
        to: undefined,
        page: undefined,
      });
      setPickerOpen(false);
      return;
    }
    const orderedFrom = to && to < from ? to : from;
    const orderedTo = to && to < from ? from : to || from;
    navigate({
      ...filters,
      date: undefined,
      from: orderedFrom,
      to: orderedTo,
      page: undefined,
    });
    setPickerOpen(false);
  };

  const clearRange = () => {
    setDraftFrom('');
    setDraftTo('');
    navigate({
      ...filters,
      date: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
    });
    setPickerOpen(false);
  };

  const scrollByDir = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    if (dir < 0 && !canPrev) return;
    if (dir > 0 && !canNext) return;
    if (dir > 0) setCanPrev(true);
    if (dir < 0) setCanNext(true);

    const firstCard = el.querySelector<HTMLElement>('[data-day]');
    const gap = 8;
    const cardW = firstCard?.offsetWidth ?? 54;
    const step = (cardW + gap) * SCROLL_STEP_CARDS;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * step, behavior: reduceMotion ? 'auto' : 'smooth' });
    requestAnimationFrame(() => {
      syncScrollState();
      requestAnimationFrame(syncScrollState);
    });
  };

  const minDay = toLocalIsoDay(new Date());

  const renderDayCard = (chip: CatalogDateRailDayChip) => {
    const active = isDateRailChipActive(chip, filters);
    const idleWeekend = !active && chip.isWeekend;
    return (
      <button
        key={chip.iso}
        type="button"
        data-day={chip.iso}
        disabled={disabled}
        aria-pressed={active}
        aria-label={`Выбрать ${chip.dayNum} ${chip.monthShort}`}
        title={`${chip.dayNum} ${chip.monthShort}`}
        onClick={() => onSelectDay(chip.iso)}
        className={[
          'catalog-date-day-card snap-start',
          active ? 'catalog-date-day-card-on' : idleWeekend ? 'catalog-date-day-card-weekend' : 'catalog-date-day-card-idle',
          disabled ? 'opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="catalog-date-day-card-weekday">{chip.weekday}</span>
        <span className="catalog-date-day-card-num">{chip.dayNum}</span>
        <span className="catalog-date-day-card-month">{chip.monthShort}</span>
      </button>
    );
  };

  const arrowBtnClass = (enabled: boolean) =>
    [
      'catalog-date-rail-arrow inline-btn hidden shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:inline-flex',
      enabled ? 'opacity-100 hover:bg-slate-50' : 'pointer-events-none opacity-35',
    ].join(' ');

  const calendarButton = (
    <button
      type="button"
      disabled={disabled}
      aria-label={rangeLabel ? `Выбрать даты: ${rangeLabel}` : 'Выбрать даты: Календарь'}
      title="Календарь"
      aria-expanded={pickerOpen}
      aria-haspopup="dialog"
      aria-pressed={dateFilterOn || pickerOpen}
      onClick={() => setPickerOpen((open) => !open)}
      className={[
        'catalog-date-rail-calendar inline-btn inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60',
        dateFilterOn || pickerOpen
          ? 'border-primary/60 bg-primary text-white hover:bg-primary/90'
          : 'border-slate-200 bg-[#F0F1F3] text-graphite/80 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
      ].join(' ')}
    >
      <CalendarIcon className="size-4" strokeWidth={2.25} aria-hidden />
      <span>Календарь</span>
    </button>
  );

  const modal =
    pickerOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
            role="presentation"
            data-catalog-date-modal
          >
            <div
              ref={pickerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Период дат"
              className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
            >
              <p className="text-sm font-semibold text-slate-900">Выбор дат</p>
              <p className="mt-0.5 text-xs text-slate-500">Укажите день или период</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-[11px] font-medium text-graphite-muted">Начало</span>
                  <input
                    ref={fromInputRef}
                    type="date"
                    value={draftFrom}
                    min={minDay}
                    aria-label="Дата начала"
                    onChange={(event) => {
                      const next = event.target.value;
                      setDraftFrom(next);
                      if (draftTo && next && draftTo < next) setDraftTo(next);
                    }}
                    className="h-10 w-full rounded-xl border border-transparent bg-[#F5F5F7] px-2.5 text-sm text-graphite outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-[11px] font-medium text-graphite-muted">Конец</span>
                  <input
                    type="date"
                    value={draftTo}
                    min={draftFrom || minDay}
                    aria-label="Дата конца"
                    onChange={(event) => setDraftTo(event.target.value)}
                    className="h-10 w-full rounded-xl border border-transparent bg-[#F5F5F7] px-2.5 text-sm text-graphite outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={clearRange}
                  className="text-xs font-medium text-graphite-muted hover:text-graphite hover:underline"
                >
                  Сбросить
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="inline-btn h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={applyRange}
                    className="inline-btn h-8 rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700"
                  >
                    Применить
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative w-full min-w-0 ${className}`} data-catalog-date-rail="cards">
      <div className="catalog-date-rail-track flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-label="Прокрутить даты влево"
          aria-disabled={!canPrev}
          tabIndex={canPrev ? 0 : -1}
          disabled={disabled}
          onClick={() => scrollByDir(-1)}
          className={arrowBtnClass(canPrev && !disabled)}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <div
          ref={railRef}
          role="group"
          aria-label="Дата"
          className="horizontal-snap-row catalog-date-rail-scroller flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((chip) => renderDayCard(chip))}
        </div>

        <button
          type="button"
          aria-label="Прокрутить даты вправо"
          aria-disabled={!canNext}
          tabIndex={canNext ? 0 : -1}
          disabled={disabled}
          onClick={() => scrollByDir(1)}
          className={arrowBtnClass(canNext && !disabled)}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="catalog-date-rail-actions mt-2.5 flex w-full min-w-0 flex-wrap items-center gap-2">
        {calendarButton}
        {rangeLabel ? (
          <span className="text-xs font-medium text-graphite-muted sm:text-sm">{rangeLabel}</span>
        ) : null}
      </div>

      {modal}
    </div>
  );
}
