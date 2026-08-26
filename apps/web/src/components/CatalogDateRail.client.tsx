'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  buildCatalogDateRailChips,
  CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX,
  CATALOG_DATE_RAIL_DAYS_TABLET,
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

const DESKTOP_DATE_RAIL_MQ = '(min-width: 1024px)';

/**
 * Vertical day cards (СЕГ/ЗАВ + number + month) with range selection:
 * click A → day; click B → range A–B; click inside range → that day; click same day again → clear.
 */
export function CatalogDateRail({ disabled = false, className = '' }: CatalogDateRailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [upcomingDays, setUpcomingDays] = useState(CATALOG_DATE_RAIL_DAYS_TABLET);
  const chips = useMemo(
    () => buildCatalogDateRailChips(new Date(), upcomingDays) as CatalogDateRailDayChip[],
    [upcomingDays],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

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

  const measurePool = useMemo(
    () => buildCatalogDateRailChips(new Date(), CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX) as CatalogDateRailDayChip[],
    [],
  );

  useLayoutEffect(() => {
    const mq = window.matchMedia(DESKTOP_DATE_RAIL_MQ);

    const fitDesktopDays = () => {
      if (!mq.matches) {
        setUpcomingDays(CATALOG_DATE_RAIL_DAYS_TABLET);
        return;
      }
      const rail = railRef.current;
      const measure = measureRef.current;
      if (!rail || !measure) {
        setUpcomingDays(CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX);
        return;
      }
      const available = rail.clientWidth;
      if (available <= 0) return;

      const gap = 6;
      const kids = Array.from(measure.children) as HTMLElement[];
      const calendarEl = kids[kids.length - 1];
      const calendarW = calendarEl?.offsetWidth ?? 44;
      let used = calendarW;
      let dayCount = 0;
      for (let i = 0; i < kids.length - 1; i += 1) {
        const w = kids[i]!.offsetWidth;
        const next = used + gap + w;
        if (next > available + 0.5) break;
        used = next;
        dayCount += 1;
      }
      setUpcomingDays(Math.max(CATALOG_DATE_RAIL_DAYS_TABLET, dayCount));
    };

    fitDesktopDays();
    const ro = new ResizeObserver(fitDesktopDays);
    if (railRef.current) ro.observe(railRef.current);
    mq.addEventListener('change', fitDesktopDays);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', fitDesktopDays);
    };
  }, [measurePool]);

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
    const single = Boolean(nextRange.from && nextRange.from === nextRange.to);
    navigate({
      ...filters,
      date: undefined,
      from: nextRange.from,
      to: nextRange.to,
      page: undefined,
      sort: single ? 'time' : nextRange.from ? filters.sort : filters.sort,
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
      sort: orderedFrom === orderedTo ? 'time' : filters.sort,
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

  const minDay = toLocalIsoDay(new Date());

  const renderDayCard = (chip: CatalogDateRailDayChip, opts?: { measure?: boolean }) => {
    const active = isDateRailChipActive(chip, filters);
    const idleWeekend = !active && chip.isWeekend;
    return (
      <button
        key={opts?.measure ? `m-${chip.iso}` : chip.iso}
        type="button"
        disabled={disabled || opts?.measure}
        tabIndex={opts?.measure ? -1 : undefined}
        aria-pressed={opts?.measure ? undefined : active}
        aria-label={chip.label}
        onClick={opts?.measure ? undefined : () => onSelectDay(chip.iso)}
        className={[
          'catalog-date-day-card snap-start',
          active ? 'catalog-date-day-card-on' : idleWeekend ? 'catalog-date-day-card-weekend' : 'catalog-date-day-card-idle',
          disabled || opts?.measure ? 'opacity-60' : '',
          opts?.measure ? 'pointer-events-none' : '',
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

  const calendarButton = (
    <button
      type="button"
      disabled={disabled}
      aria-label={rangeLabel ? `Календарь: ${rangeLabel}` : 'Выбрать даты в календаре'}
      aria-expanded={pickerOpen}
      aria-haspopup="dialog"
      aria-pressed={dateFilterOn || pickerOpen}
      onClick={() => setPickerOpen((open) => !open)}
      className={`catalog-date-day-card catalog-date-day-card-dates shrink-0 disabled:opacity-60 ${
        dateFilterOn || pickerOpen ? 'catalog-date-day-card-on' : ''
      }`}
    >
      <CalendarIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      <span className="catalog-date-day-card-dates-label">Даты</span>
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
    <div className={`relative min-w-0 ${className}`} data-catalog-date-rail="cards">
      <div
        ref={railRef}
        role="group"
        aria-label="Дата"
        className="horizontal-snap-row flex min-w-0 w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-x-hidden"
      >
        {chips.map((chip) => renderDayCard(chip))}
        {calendarButton}
      </div>

      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 flex flex-nowrap items-center gap-1.5 opacity-0"
      >
        {measurePool.map((chip) => renderDayCard(chip, { measure: true }))}
        <span className="catalog-date-day-card catalog-date-day-card-dates">
          <CalendarIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          <span className="catalog-date-day-card-dates-label">Даты</span>
        </span>
      </div>

      {modal}
    </div>
  );
}
