'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, SlidersHorizontal, Users, Wallet, X } from 'lucide-react';

import { formatNumber, pluralEvents } from '@/lib/format';

type LandingFacet = { slug: string; title: string; events: number };

export type AdvancedCatalogFilters = {
  dateFrom: string;
  dateTo: string;
  /** Preset date: today | tomorrow | weekend | evening */
  date?: string;
  minPrice: string;
  maxPrice: string;
  ageMax: number;
  landing: string;
};

/** Context from toolbar (not edited inside the sheet) for live result preview. */
export type CatalogFilterPreviewContext = {
  q?: string;
  city?: string;
  category?: string;
  sort?: string;
};

export const AGE_FILTER_OPTIONS = [
  { value: 0, label: '0+' },
  { value: 6, label: '6+' },
  { value: 12, label: '12+' },
  { value: 16, label: '16+' },
  { value: 18, label: '18+' },
] as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PREVIEW_DEBOUNCE_MS = 350;

const inputCls =
  'h-11 w-full min-w-0 rounded-xl border-0 bg-surface-muted px-3 text-base text-graphite outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-10 sm:text-sm';
const chipCls =
  'catalog-chip inline-btn min-h-10 px-3.5 py-2 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs';
const labelCls = 'mb-2 flex items-center gap-1.5 text-sm font-medium text-graphite-muted sm:mb-1.5 sm:text-xs';

function filterChip(active: boolean) {
  return active ? `${chipCls} catalog-chip-on` : `${chipCls} catalog-chip-idle`;
}

function emptyFilters(): AdvancedCatalogFilters {
  return {
    dateFrom: '',
    dateTo: '',
    date: '',
    minPrice: 'all',
    maxPrice: 'all',
    ageMax: -1,
    landing: 'all',
  };
}

function buildPreviewQuery(
  context: CatalogFilterPreviewContext,
  draft: AdvancedCatalogFilters,
  minDraft: string,
  maxDraft: string,
): string {
  const params = new URLSearchParams();
  params.set('limit', '1');
  if (context.q?.trim()) params.set('q', context.q.trim());
  if (context.city) params.set('city', context.city);
  if (context.category) params.set('category', context.category);
  if (context.sort && context.sort !== 'time') params.set('sort', context.sort);

  const hasRange = Boolean(draft.dateFrom || draft.dateTo);
  if (hasRange) {
    if (draft.dateFrom) params.set('from', draft.dateFrom);
    if (draft.dateTo) params.set('to', draft.dateTo);
  } else if (draft.date) {
    params.set('date', draft.date);
  }

  const minPrice = minDraft.trim() ? Number(minDraft.trim()) : NaN;
  const maxPrice = maxDraft.trim() ? Number(maxDraft.trim()) : NaN;
  if (Number.isFinite(minPrice)) params.set('minPrice', String(minPrice));
  if (Number.isFinite(maxPrice)) params.set('maxPrice', String(maxPrice));
  if (draft.ageMax >= 0) params.set('ageMax', String(draft.ageMax));
  if (draft.landing && draft.landing !== 'all') params.set('landing', draft.landing);

  return params.toString();
}

function pluralVariants(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} вариантов`;
  if (mod10 === 1) return `${formatNumber(count)} вариант`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} варианта`;
  return `${formatNumber(count)} вариантов`;
}

export function CatalogAdvancedFiltersPanel({
  open,
  filters,
  landings,
  previewContext,
  onApply,
  onClose,
  onReset,
}: {
  open: boolean;
  filters: AdvancedCatalogFilters;
  landings: LandingFacet[];
  previewContext?: CatalogFilterPreviewContext;
  onApply: (next: AdvancedCatalogFilters) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [draft, setDraft] = React.useState(filters);
  const [minDraft, setMinDraft] = React.useState(filters.minPrice === 'all' ? '' : filters.minPrice);
  const [maxDraft, setMaxDraft] = React.useState(filters.maxPrice === 'all' ? '' : filters.maxPrice);
  const [previewTotal, setPreviewTotal] = React.useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setDraft(filters);
    setMinDraft(filters.minPrice === 'all' ? '' : filters.minPrice);
    setMaxDraft(filters.maxPrice === 'all' ? '' : filters.maxPrice);
  }, [open, filters]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
      );

    const frame = window.requestAnimationFrame(() => {
      const nodes = focusable();
      (nodes.find((el) => el.tagName === 'INPUT') ?? nodes[0])?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
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
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      const qs = buildPreviewQuery(previewContext || {}, draft, minDraft, maxDraft);
      fetch(`/api/public/events?${qs}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error('preview_failed');
          return response.json() as Promise<{ total?: number }>;
        })
        .then((payload) => {
          setPreviewTotal(typeof payload.total === 'number' ? payload.total : 0);
        })
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          setPreviewTotal(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, draft, minDraft, maxDraft, previewContext]);

  const patchDraft = (patch: Partial<AdvancedCatalogFilters>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const isoDay = (date: Date) => date.toISOString().slice(0, 10);

  const apply = () => {
    onApply({
      ...draft,
      minPrice: minDraft.trim() ? minDraft.trim() : 'all',
      maxPrice: maxDraft.trim() ? maxDraft.trim() : 'all',
    });
  };

  const resetDraft = () => {
    const cleared = emptyFilters();
    setDraft(cleared);
    setMinDraft('');
    setMaxDraft('');
    onReset();
  };

  const applyLabel =
    previewTotal == null
      ? previewLoading
        ? 'Считаем…'
        : 'Показать варианты'
      : previewTotal === 0
        ? 'Нет подходящих событий'
        : `Показать ${pluralVariants(previewTotal)}`;

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-start sm:px-4 sm:pt-16 md:pt-24">
      <button
        type="button"
        aria-label="Закрыть фильтры"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        id="advanced-filters-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92vh,44rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:max-h-[min(85vh,40rem)] sm:max-w-2xl sm:rounded-card"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal aria-hidden className="h-4 w-4 shrink-0 text-graphite-muted" strokeWidth={1.75} />
            <h2 id={titleId} className="truncate text-base font-semibold text-graphite">
              Фильтры
            </h2>
            {previewTotal != null && !previewLoading ? (
              <span className="truncate text-xs text-graphite-muted">{pluralEvents(previewTotal)}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-btn grid h-10 w-10 place-items-center rounded-lg text-graphite-muted transition hover:bg-surface-muted hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Закрыть"
          >
            <X aria-hidden className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-5 sm:gap-6">
            <section>
              <div className={labelCls}>Быстрые</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    patchDraft({ date: 'evening', dateFrom: '', dateTo: '' });
                  }}
                  className={filterChip(draft.date === 'evening' && !draft.dateFrom && !draft.dateTo)}
                >
                  Сегодня вечером
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMinDraft('0');
                    setMaxDraft('0');
                  }}
                  className={filterChip(minDraft === '0' && maxDraft === '0')}
                >
                  Бесплатно
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMinDraft('');
                    setMaxDraft('2000');
                  }}
                  className={filterChip(minDraft === '' && maxDraft === '2000')}
                >
                  До 2000
                </button>
              </div>
            </section>

            <section>
              <div className={labelCls}>
                <CalendarIcon aria-hidden className="h-3.5 w-3.5 text-slate-400" />
                Дата
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={draft.dateFrom}
                  aria-label="Дата с"
                  onChange={(event) => patchDraft({ dateFrom: event.target.value, date: '' })}
                  className={inputCls}
                />
                <input
                  type="date"
                  value={draft.dateTo}
                  min={draft.dateFrom || undefined}
                  aria-label="Дата по"
                  onChange={(event) => patchDraft({ dateTo: event.target.value, date: '' })}
                  className={inputCls}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  { label: 'Сегодня', days: 0 },
                  { label: 'Завтра', days: 1 },
                  { label: 'Неделя', days: 7 },
                  { label: '2 недели', days: 14 },
                  { label: 'Месяц', days: 30 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const to = new Date(today);
                      to.setDate(today.getDate() + item.days);
                      patchDraft({ dateFrom: isoDay(today), dateTo: isoDay(to), date: '' });
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
                  inputMode="numeric"
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
                  inputMode="numeric"
                  value={maxDraft}
                  placeholder="до"
                  aria-label="Цена до, руб."
                  onChange={(event) => setMaxDraft(event.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  { label: 'Бесплатно', min: '0', max: '0' },
                  { label: 'до 1000', min: '', max: '1000' },
                  { label: '1-3К', min: '1000', max: '3000' },
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

            <section className="space-y-4">
              <div>
                <div className={labelCls}>
                  <Users aria-hidden className="h-3.5 w-3.5 text-slate-400" />
                  Возраст
                </div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Возрастное ограничение">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={draft.ageMax < 0}
                    onClick={() => patchDraft({ ageMax: -1 })}
                    className={filterChip(draft.ageMax < 0)}
                  >
                    Любой
                  </button>
                  {AGE_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={draft.ageMax === option.value}
                      onClick={() => patchDraft({ ageMax: option.value })}
                      className={filterChip(draft.ageMax === option.value)}
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
                    value={draft.landing}
                    onChange={(event) => patchDraft({ landing: event.target.value })}
                    className={inputCls}
                  >
                    <option value="all">Все подборки</option>
                    {landings.map((item) => {
                      const empty = item.events <= 0 && draft.landing !== item.slug;
                      return (
                        <option key={item.slug} value={item.slug} disabled={empty}>
                          {item.title} · {formatNumber(item.events)}
                          {empty ? ' (нет)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 items-center gap-2 border-t border-slate-100/80 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <button
            type="button"
            onClick={resetDraft}
            className="inline-btn h-11 min-w-[6.5rem] rounded-xl px-4 text-sm font-semibold text-graphite-muted transition hover:bg-surface-muted hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-10"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={previewTotal === 0}
            aria-disabled={previewTotal === 0}
            className={
              previewTotal === 0
                ? 'inline-btn h-11 flex-1 cursor-not-allowed rounded-xl bg-[#F8F9FA] px-4 text-sm font-semibold text-slate-400 ring-1 ring-slate-200/80 sm:h-10'
                : 'inline-btn btn-primary h-11 flex-1 rounded-xl px-4 text-sm font-semibold sm:h-10'
            }
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
