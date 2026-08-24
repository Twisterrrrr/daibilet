'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  buildCatalogDateRailChips,
  CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX,
  CATALOG_DATE_RAIL_DAYS_TABLET,
  isDateRailChipActive,
  toLocalIsoDay,
  type CatalogDateRailChip,
} from '@/lib/catalog-date-rail';
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
 * Horizontal date presets + upcoming days + calendar as the last in-flow chip.
 * Calendar opens a centered modal (not a right-pinned popover).
 */
export function CatalogDateRail({ disabled = false, className = '' }: CatalogDateRailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [upcomingDays, setUpcomingDays] = useState(CATALOG_DATE_RAIL_DAYS_TABLET);
  const chips = useMemo(() => buildCatalogDateRailChips(new Date(), upcomingDays), [upcomingDays]);
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
      limit: limitNum === 50 || limitNum === 100 ? limitNum : undefined,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
    });
  }, [searchParams]);

  const calendarActive = Boolean(filters.from || filters.to) && !filters.date;
  const calendarOffRail =
    calendarActive &&
    Boolean(filters.from) &&
    !chips.some((chip) => chip.kind === 'day' && chip.iso === filters.from && filters.to === filters.from);

  const measurePool = useMemo(
    () => buildCatalogDateRailChips(new Date(), CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX),
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

      const gap = 6; // gap-1.5
      const kids = Array.from(measure.children) as HTMLElement[];
      // Last child is the calendar chip - always reserve it.
      const calendarEl = kids[kids.length - 1];
      const calendarW = calendarEl?.offsetWidth ?? 36;
      let used = calendarW;
      let dayCount = 0;
      for (let i = 0; i < kids.length - 1; i += 1) {
        const w = kids[i]!.offsetWidth;
        const next = used + gap + w;
        if (next > available + 0.5) break;
        used = next;
        if (measurePool[i]?.kind === 'day') dayCount += 1;
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

  const onSelect = (chip: CatalogDateRailChip) => {
    setPickerOpen(false);
    if (chip.kind === 'preset') {
      const nextDate = chip.value;
      navigate({
        ...filters,
        date: nextDate === 'all' ? undefined : nextDate,
        from: undefined,
        to: undefined,
        page: undefined,
        sort:
          nextDate === 'today' || nextDate === 'tomorrow' || nextDate === 'evening'
            ? 'time'
            : filters.sort,
      });
      return;
    }
    navigate({
      ...filters,
      date: undefined,
      from: chip.iso,
      to: chip.iso,
      page: undefined,
      sort: 'time',
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

  const renderChipLabel = (chip: CatalogDateRailChip) =>
    chip.kind === 'day' ? (
      <span className="whitespace-nowrap">
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{chip.weekday}</span>
        <span className="ml-1 font-semibold">{chip.iso.slice(8)}</span>
      </span>
    ) : (
      <span className="whitespace-nowrap">{chip.shortLabel}</span>
    );

  const calendarButton = (
    <button
      type="button"
      disabled={disabled}
      aria-label="Выбрать даты в календаре"
      aria-expanded={pickerOpen}
      aria-haspopup="dialog"
      aria-pressed={calendarOffRail || pickerOpen}
      onClick={() => setPickerOpen((open) => !open)}
      className={`catalog-date-chip inline-flex h-9 w-9 shrink-0 items-center justify-center px-0 py-0 disabled:opacity-60 ${
        calendarOffRail || pickerOpen ? 'catalog-date-chip-on' : 'catalog-date-chip-idle'
      }`}
    >
      <CalendarIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
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
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={railRef}
        role="group"
        aria-label="Дата"
        className="horizontal-snap-row flex min-w-0 w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-x-hidden"
      >
        {chips.map((chip) => {
          const active = isDateRailChipActive(chip, filters);
          const key = chip.kind === 'preset' ? chip.value : chip.iso;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelect(chip)}
              className={`catalog-date-chip h-9 snap-start disabled:opacity-60 ${
                active ? 'catalog-date-chip-on' : 'catalog-date-chip-idle'
              }`}
            >
              {renderChipLabel(chip)}
            </button>
          );
        })}
        {calendarButton}
      </div>

      {/* Off-screen measure: full day pool + trailing calendar chip. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 flex flex-nowrap items-center gap-1.5 opacity-0"
      >
        {measurePool.map((chip) => {
          const key = chip.kind === 'preset' ? `m-${chip.value}` : `m-${chip.iso}`;
          return (
            <span key={key} className="catalog-date-chip catalog-date-chip-idle h-9">
              {renderChipLabel(chip)}
            </span>
          );
        })}
        <span className="catalog-date-chip catalog-date-chip-idle inline-flex h-9 w-9 shrink-0 items-center justify-center px-0 py-0">
          <CalendarIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
      </div>

      {modal}
    </div>
  );
}
