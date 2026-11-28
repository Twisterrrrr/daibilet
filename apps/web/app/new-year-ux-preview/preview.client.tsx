'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fontInter, fontUnbounded, fontUnboundedLatin } from '@/lib/fonts';
import { CheckoutModalButton } from '@/components/CheckoutModal.client';
import { TcWidgetButton, normalizeTcPurchaseUrl } from '@/components/TcWidget.client';
import { getTeplohodWidgetIdsFromSession, resolveTeplohodCheckoutUrl } from '@/components/TeplohodWidget.client';
import { extractTcEventIdFromSession } from '@/lib/event-purchase';
import { trackSelectTickets } from '@/lib/catalog-analytics';
import { resolveCityCases } from '@/lib/city-declension';
import { resolveSessionTimeZone } from '@/lib/city-timezone';
import { parseSessionStartsAt } from '@/lib/datetime';
import { pluralRu } from '@/lib/format';
import { citySlug as cityToSlug } from '@/lib/routes';
import { appendUniqueNewYearPreviewEvents } from '@/lib/new-year-preview-order';
import { landingCategoryHref, normalizeKnownCitySlug } from '@/lib/landing-routes';
import { resolveSeoListingText, splitSeoListingParagraphs } from '@/data/seo-listing-texts';
import type { PreviewEvent } from './preview-data';
import { deriveNewYearPreviewData, type NewYearPreviewIndex } from './preview-index';
import { resolvePreviewFormat, resolveThematicFormats, type PreviewTheme } from './preview-format';
import { getNewYearRegionGuide, NEW_YEAR_CITY_GUIDES, NEW_YEAR_NATIONAL_GUIDE } from './new-year-guide-content';
import styles from './preview.module.css';

type DateFilter = 'all' | 'today' | 'tomorrow' | 'dec24to31' | 'dec31' | 'jan1' | 'jan1to14' | 'weekend' | 'holidays' | 'custom';
type PriceFilter = 'all' | 'free' | 'under1000' | 'under2000' | 'over2000' | 'over5000' | 'over10000';
type PreviewFilters = { city: string; region: string; date: DateFilter; customDate: string; dateFrom: string; dateTo: string; price: PriceFilter; priceFrom: number | null; priceTo: number | null; format: string; ageLimit: string; availableOnly: boolean; q: string; sort: 'date' | 'price' | 'price-desc' };
type Facet = { name?: string; value?: string; count: number; region?: string; filterable?: boolean; geoKind?: 'city' | 'region' };
const FIRST_SEASON_DATE = '2026-12-01';
const NEW_YEAR_EVENT_FORMS = ['мероприятие', 'мероприятия', 'мероприятий'] as const;
const CONCERT_EVENT_FORMS = ['концерт', 'концерта', 'концертов'] as const;
const PLURAL_SESSION_FORMS = ['сеанс', 'сеанса', 'сеансов'] as const;
const PLURAL_SEAT_FORMS = ['место', 'места', 'мест'] as const;
type PreviewData = {
  items: PreviewEvent[];
  total: number;
  sourceTotal: number;
  offset: number;
  nextOffset: number;
  limit: number;
  hasMore: boolean;
  generatedAt: string | null;
  priceFrom: number | null;
  facets: { cities: Facet[]; regions: Facet[]; dates: Facet[]; prices: Facet[]; formats: Facet[]; ages: Facet[]; lowStock: number; priceRange: { min: number; max: number } };
};

const DATE_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Любая дата' },
  { value: 'dec24to31', label: '24–31 декабря' },
  { value: 'dec31', label: '31 декабря' },
  { value: 'jan1', label: '1 января' },
  { value: 'jan1to14', label: '1–14 января' },
  { value: 'weekend', label: 'Выходные' },
  { value: 'holidays', label: 'Новогодние праздники' },
];
const STANDARD_DATE_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Все даты' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'На выходных' },
];
const NEW_YEAR_DATE_PRESETS = [
  { label: 'Все даты', from: '', to: '' },
  { label: '31 дек - 10 янв', from: '2026-12-31', to: '2027-01-10' },
  { label: '24-31 дек', from: '2026-12-24', to: '2026-12-31' },
  { label: '1-10 янв', from: '2027-01-01', to: '2027-01-10' },
  { label: 'Декабрь', from: '2026-12-01', to: '2026-12-31' },
  { label: 'Январь', from: '2027-01-01', to: '2027-01-14' },
];

function isCustomDate(value?: string | null, seasonal = true): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || (seasonal && value < FIRST_SEASON_DATE)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const PRICE_OPTIONS: Array<{ value: PriceFilter; label: string }> = [
  { value: 'all', label: 'Любая цена' },
  { value: 'under1000', label: 'до 1 000 ₽' },
  { value: 'under2000', label: 'до 2 000 ₽' },
  { value: 'over2000', label: 'от 2 000 ₽' },
  { value: 'over5000', label: 'от 5 000 ₽' },
  { value: 'over10000', label: 'от 10 000 ₽' },
];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = parseSessionStartsAt(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const slotFormatters = new Map<string, { compact: Intl.DateTimeFormat; day: Intl.DateTimeFormat; rest: Intl.DateTimeFormat; time: Intl.DateTimeFormat; full: Intl.DateTimeFormat }>();

function getSlotFormatters(timeZone: string) {
  let formatters = slotFormatters.get(timeZone);
  if (!formatters) {
    formatters = {
      compact: new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'short' }),
      day: new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric' }),
      rest: new Intl.DateTimeFormat('ru-RU', { timeZone, weekday: 'short', month: 'short' }),
      time: new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }),
      full: new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    };
    slotFormatters.set(timeZone, formatters);
  }
  return formatters;
}

function formatSlot(slot: NonNullable<PreviewEvent['upcomingSlots']>[number], fallbackTimeZone = 'Europe/Moscow'): string {
  const date = parseDate(slot.startsAt);
  if (!date) return [slot.dateLabel, slot.timeLabel].filter(Boolean).join(' · ') || 'Дата уточняется';
  return getSlotFormatters(slot.timeZone || fallbackTimeZone).full.format(date).replace(' г.', '');
}

function formatShortDate(slot: NonNullable<PreviewEvent['upcomingSlots']>[number], fallbackTimeZone = 'Europe/Moscow'): { day: string; rest: string; time: string; compact: string } {
  const date = parseDate(slot.startsAt);
  if (!date) return { day: slot.dateLabel || '—', rest: '', time: slot.timeLabel || '', compact: slot.dateLabel || 'Дата уточняется' };
  const formatters = getSlotFormatters(slot.timeZone || fallbackTimeZone);
  const compact = formatters.compact
    .format(date)
    .replace(' г.', '')
    .replace(/\.$/u, '');
  return {
    day: formatters.day.format(date),
    rest: formatters.rest.format(date),
    time: formatters.time.format(date),
    compact,
  };
}

type EventBadge = { id: string; label: string; className: string };

function taxonomyTitle(value: PreviewEvent['catalogSubcategory']): string {
  if (typeof value === 'string') return value;
  return value?.title || '';
}

function eventBadges(event: PreviewEvent, theme: PreviewTheme = 'new-year'): EventBadge[] {
  if (theme !== 'new-year') {
    const label = resolveThematicFormats(event, theme)[0];
    return label ? [{ id: `theme:${label}`, label, className: theme === 'concerts-genre' ? styles.tagConcert : styles.tagKids }] : [];
  }
  const subcategory = taxonomyTitle(event.catalogSubcategory);
  const catalogCategory = taxonomyTitle(event.catalogCategory);
  const labels = [subcategory, ...(event.tagLabels || []), ...(event.subcategories || []), ...(event.tags || [])].filter((label): label is string => Boolean(label));
  const text = [event.title, event.category, catalogCategory, ...labels].join(' ').toLocaleLowerCase('ru');
  const isStandUp = /stand\s*[- ]?up|стендап/.test(text);
  const isExcursion = /экскурс/.test(`${event.category || ''} ${catalogCategory} ${subcategory}`.toLocaleLowerCase('ru'));
  const resolvedFormat = resolvePreviewFormat(event);
  let typeBadge: EventBadge | undefined;
  if (isStandUp) typeBadge = { id: 'stand-up', label: 'Шоу', className: styles.tagShow };
  else if (resolvedFormat === 'Квесты') typeBadge = { id: 'quest', label: 'Квест', className: styles.tagTour };
  else if (resolvedFormat === 'Ёлки') typeBadge = { id: 'tree', label: 'Ёлки', className: styles.tagTree };
  else if (isExcursion) typeBadge = { id: 'tour', label: 'Экскурсия', className: styles.tagTour };
  else typeBadge = [
    { id: 'fireworks', label: 'Фейерверк', pattern: /фейерверк|салют/, className: styles.tagFireworks },
    { id: 'gatherings', label: 'Гуляния', pattern: /гулян/, className: styles.tagGatherings },
    { id: 'apartment', label: 'Квартирник', pattern: /квартирник/, className: styles.tagApartment },
    { id: 'tree', label: 'Ёлки', pattern: /ёлк|елк/, className: styles.tagTree },
    { id: 'skating', label: 'Каток', pattern: /каток|конькобеж|ледов(ый|ая|ое|ые)/, className: styles.tagSkating },
    { id: 'workshop', label: 'Мастер-класс', pattern: /мастер\s*-?\s*класс/, className: styles.tagWorkshop },
    { id: 'fair', label: 'Ярмарка', pattern: /ярмарк/, className: styles.tagGatherings },
    { id: 'new-year-night', label: 'Новогодняя ночь', pattern: /новогодн\w*\s+ноч|новогодн\w*\s+вечерин/, className: styles.tagFireworks },
    { id: 'acoustic', label: 'Акустика', pattern: /акустик/, className: styles.tagApartment },
    { id: 'kids', label: 'Детская программа', pattern: /детск|семь|реб[её]н/, className: styles.tagKids },
    { id: 'concert', label: 'Концерт', pattern: /концерт|музык|джаз|оркестр/, className: styles.tagConcert },
    { id: 'show', label: 'Спектакль', pattern: /спектакл|представлен|театр/, className: styles.tagShow },
    { id: 'tour', label: 'Экскурсия', pattern: /экскурс|прогулк|квест/, className: styles.tagTour },
  ].find((badge) => badge.pattern.test(text));
  const badges: EventBadge[] = [];
  const explicitHit = labels.some((label) => /(?:^|\W)(?:хит|hit)(?:$|\W)/i.test(label));
  if (explicitHit || (event.sessionCount || 0) >= 4) badges.push({ id: 'hit', label: 'Хит', className: styles.tagHit });
  if (typeBadge) badges.push(typeBadge);
  else {
    const label = labels[0] || event.category || catalogCategory;
    if (label) badges.push({ id: `category-${label}`, label, className: styles.tagNeutral });
  }
  return badges;
}

function safeExternalUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function previewSlotPurchaseUrls(event: PreviewEvent, slot: NonNullable<PreviewEvent['upcomingSlots']>[number]): string[] {
  const slotUrls = [slot.purchaseUrl, ...(slot.purchaseUrls || [])]
    .map(safeExternalUrl)
    .filter((url): url is string => Boolean(url));
  const candidates = slotUrls.length ? slotUrls : [event.widgetUrl]
    .map(safeExternalUrl)
    .filter((url): url is string => Boolean(url));
  return [...new Set(candidates)];
}

function PreviewPurchaseButton({ event, className, label = 'Купить' }: { event: PreviewEvent; className: string; label?: string }) {
  const purchaseUrl = event.widgetUrl || event.purchaseUrl || event.upcomingSlots?.[0]?.purchaseUrl || null;
  if (event.purchaseReady === false) return <span>Билеты уточняются</span>;

  const teplohod = getTeplohodWidgetIdsFromSession(event);
  const teplohodCheckoutUrl = resolveTeplohodCheckoutUrl({
    purchaseUrl,
    tepEventId: teplohod?.tepEventId,
    tepWidgetId: teplohod?.tepWidgetId,
  });
  if (teplohod?.tepEventId && teplohodCheckoutUrl) {
    return <CheckoutModalButton
      checkoutUrl={teplohodCheckoutUrl}
      label={label}
      className={className}
      onOpen={() => trackSelectTickets({ eventId: String(teplohod.tepEventId), provider: 'teplohod', source: 'new_year_preview' })}
    />;
  }

  const tcEventId = extractTcEventIdFromSession(event);
  const tcPurchaseUrl = normalizeTcPurchaseUrl(purchaseUrl);
  if (tcEventId && tcPurchaseUrl) {
    return <TcWidgetButton tcEventId={tcEventId} purchaseUrl={tcPurchaseUrl} label={label} className={className} />;
  }

  const externalUrl = safeExternalUrl(purchaseUrl);
  return externalUrl
    ? <a href={externalUrl} rel="noopener noreferrer" className={className}>{label}</a>
    : <span>Билеты уточняются</span>;
}

function shortEventDescription(value?: string | null): string {
  const plain = String(value || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/[\*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= 320) return plain;
  const boundary = plain.lastIndexOf(' ', 320);
  return `${plain.slice(0, boundary > 220 ? boundary : 320).trimEnd()}…`;
}

function serializeFilters(filters: PreviewFilters): string {
  const params = new URLSearchParams();
  if (filters.city !== 'Вся Россия') params.set('city', filters.city);
  if (filters.region) params.set('region', filters.region);
  if (filters.dateFrom || filters.dateTo) {
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
  } else if (filters.date !== 'all') params.set('date', filters.date === 'custom' ? filters.customDate : filters.date);
  if (filters.price !== 'all') params.set('price', filters.price);
  if (filters.priceFrom != null) params.set('priceFrom', String(filters.priceFrom));
  if (filters.priceTo != null) params.set('priceTo', String(filters.priceTo));
  if (filters.format !== 'Все форматы') params.set('format', filters.format);
  if (filters.ageLimit) params.set('ageLimit', filters.ageLimit);
  if (filters.availableOnly) params.set('available', '1');
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.sort !== 'date') params.set('sort', filters.sort);
  return params.toString();
}

function getFacetCount(facets: Facet[] | undefined, value: string): number {
  return facets?.find((facet) => (facet.value || facet.name) === value)?.count || 0;
}

function formatCustomDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function urlNumberParam(url: URL, name: string): number | null {
  const raw = url.searchParams.get(name);
  if (raw === null || !/^\d{1,7}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function PriceRangeFields({ min, max, domainMax, onChange }: { min: number | null; max: number | null; domainMax: number; onChange: (min: number | null, max: number | null) => void }) {
  const minValue = min ?? 0;
  const maxValue = max ?? domainMax;

  return <div className={styles.priceFilter} role="group" aria-label="Цена, ₽">
    <span className={`${styles.filterChip} ${styles.filterChipActive} ${styles.priceFieldsLabel}`}>Цена, ₽</span>
    <div className={styles.priceBoundGroup}>
      <span className={styles.priceBoundaryLabel}>От</span>
      <label className={styles.priceInlineInput}><span className="sr-only">Цена от, ₽</span><input type="number" min="0" max={maxValue} step="100" inputMode="numeric" value={min ?? 0} onChange={(event) => {
        const value = event.target.value === '' ? null : Math.max(0, Number(event.target.value) || 0);
        const next = value === 0 ? null : value;
        onChange(next, max == null || next == null ? max : Math.max(max, next));
      }} aria-label="Цена от" /></label>
    </div>
    <div className={styles.priceBoundGroup}>
      <span className={styles.priceBoundaryLabel}>До</span>
      <label className={styles.priceInlineInput}><span className="sr-only">Цена до, ₽</span><input type="number" min={minValue} max={domainMax} step="100" inputMode="numeric" value={max ?? domainMax} onChange={(event) => {
        const value = event.target.value === '' ? null : Math.max(min ?? 0, Number(event.target.value) || 0);
        const next = value != null && value >= domainMax ? null : value;
        onChange(min, next);
      }} aria-label="Цена до" /></label>
    </div>
  </div>;
}

function GeoSearchDropdown({ options, city, region, onSelect }: { options: Facet[]; city: string; region: string; onSelect: (item: Facet) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = region || city;
  const filtered = options.filter((item) => (item.name || '').toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')));
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className={styles.geoSearch} ref={rootRef}>
    <button type="button" className={styles.geoSearchTrigger} data-new-year-geo-trigger="true" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
      <span>{selectedLabel}</span><span className={styles.geoSearchChevron} aria-hidden="true">⌄</span>
    </button>
    {open ? <div className={styles.geoSearchPopover}>
      <label className={styles.geoSearchInputWrap}><span className="sr-only">Найти город или регион</span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти город или регион" /></label>
      <div className={styles.geoSearchOptions} role="listbox" aria-label="Города и регионы">
        {filtered.length ? filtered.map((item) => {
          const selected = item.geoKind === 'region' ? region === item.name : city === item.name && !region;
          return <button type="button" role="option" aria-selected={selected} key={`${item.geoKind}:${item.name}`} onClick={() => { onSelect(item); setOpen(false); setSearch(''); }}><span>{item.name}</span><small>{item.count}</small></button>;
        }) : <p>Ничего не найдено</p>}
      </div>
    </div> : null}
  </div>;
}

function DatePickerChip({ date, customDate, onChange, seasonal = true }: { date: DateFilter; customDate: string; onChange: (value: string) => void; seasonal?: boolean }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else { picker.focus(); picker.click(); }
  };
  return <span className={styles.datePickerWrap}>
    <button type="button" className={`${styles.filterChip} ${styles.datePickerChip} ${date === 'custom' ? styles.filterChipActive : ''}`} onClick={openPicker} aria-label="Выбрать дату мероприятия">
      {date === 'custom' && customDate ? formatCustomDate(customDate) : 'Выбрать дату'}
    </button>
    <input ref={pickerRef} className={styles.datePickerInput} type="date" min={seasonal ? FIRST_SEASON_DATE : undefined} aria-label="Дата мероприятия" value={customDate} onChange={(event) => onChange(event.target.value)} />
  </span>;
}

function DateFilterDropdown({
  date,
  customDate,
  facets,
  onDateChange,
  onCustomDateChange,
  options = DATE_OPTIONS,
  seasonal = true,
}: {
  date: DateFilter;
  customDate: string;
  facets: Facet[] | undefined;
  onDateChange: (value: DateFilter) => void;
  onCustomDateChange: (value: string) => void;
  options?: Array<{ value: DateFilter; label: string }>;
  seasonal?: boolean;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      if (typeof picker.showPicker === 'function') picker.showPicker();
      else { picker.focus(); picker.click(); }
    } catch {
      picker.focus();
      picker.click();
    }
  };
  return <span className={styles.dateDropdownWrap}>
    <select aria-label="Дата" value={date} onChange={(event) => {
      const value = event.target.value as DateFilter;
      onDateChange(value);
      if (value === 'custom') openPicker();
    }}>
      {options.filter((item) => item.value !== 'custom').map((item) => <option key={`dropdown-date:${item.value}`} value={item.value} disabled={getFacetCount(facets, item.value) === 0 && date !== item.value}>{item.label}</option>)}
      <option value="custom">{customDate ? formatCustomDate(customDate) : 'Выбрать дату…'}</option>
    </select>
    <input ref={pickerRef} className={styles.datePickerInput} type="date" min={seasonal ? FIRST_SEASON_DATE : undefined} aria-label="Выбрать дату мероприятия" value={customDate} onChange={(event) => onCustomDateChange(event.target.value)} />
  </span>;
}

function isThemePath(pathname: string, landingPath: string): boolean {
  return pathname === landingPath || pathname.startsWith(`${landingPath}/`);
}

function resolveGeoPath(pathname: string, landingPath: string, facets?: PreviewData['facets']): { city: string; region: string } {
  const slug = normalizeKnownCitySlug(pathname.replace(/\/$/u, '').split('/').at(-1));
  if (!slug || !facets || pathname === landingPath) return { city: 'Вся Россия', region: '' };
  const city = facets.cities.find((item) => item.name && item.name !== 'Вся Россия' && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === slug);
  if (city?.name) return { city: city.name, region: '' };
  const region = facets.regions.find((item) => item.name && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === slug);
  return region?.name ? { city: 'Вся Россия', region: region.name } : { city: 'Вся Россия', region: '' };
}

function publicGeoPath(theme: PreviewTheme, city: string, region: string): string {
  if (city !== 'Вся Россия') return landingCategoryHref(theme, cityToSlug({ name: city }));
  if (region) return landingCategoryHref(theme, cityToSlug({ name: region }));
  return landingCategoryHref(theme);
}

export function NewYearUxPreview({
  initialData,
  initialCity = null,
  initialRegion = null,
  errorMessage,
  theme = 'new-year',
}: {
  initialData: PreviewData | null;
  initialCity?: string | null;
  initialRegion?: string | null;
  errorMessage: string | null;
  theme?: PreviewTheme;
}) {
  const seasonal = theme === 'new-year';
  const landingPath = theme === 'concerts-genre' ? '/kontserty' : theme === 'family-kids' ? '/detyam-i-semyam' : '/novyj-god';
  const landingName = theme === 'concerts-genre' ? 'Концерты' : theme === 'family-kids' ? 'Детям и семьям' : 'Новый год';
  const eventForms = theme === 'concerts-genre' ? CONCERT_EVENT_FORMS : NEW_YEAR_EVENT_FORMS;
  const isConcerts = theme === 'concerts-genre';
  const isFamily = theme === 'family-kids';
  const allFormatsLabel = isConcerts ? 'Все жанры' : 'Все форматы';
  const dateOptions = seasonal ? DATE_OPTIONS : STANDARD_DATE_OPTIONS;
  const datePresets: Array<{ label: string; from?: string; to?: string; value?: DateFilter }> = seasonal
    ? NEW_YEAR_DATE_PRESETS
    : [
      { label: 'Все даты', value: 'all' },
      { label: 'Сегодня', value: 'today' },
      { label: 'Завтра', value: 'tomorrow' },
      { label: 'На выходных', value: 'weekend' },
    ];
  const router = useRouter();
  const [festive, setFestive] = useState(seasonal);
  const [data, setData] = useState<PreviewData | null>(initialData);
  const [catalogIndex, setCatalogIndex] = useState<NewYearPreviewIndex | null>(null);
  const [catalogIndexState, setCatalogIndexState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [localVisibleCount, setLocalVisibleCount] = useState(30);
  const localVisibleCountRef = useRef(30);
  const [loadedFilterQuery, setLoadedFilterQuery] = useState(() =>
    initialCity || initialRegion
      ? serializeFilters({ city: initialCity || 'Вся Россия', region: initialRegion || '', date: 'all', customDate: '', dateFrom: '', dateTo: '', price: 'all', priceFrom: null, priceTo: null, format: 'Все форматы', ageLimit: '', availableOnly: false, q: '', sort: 'date' })
      : '',
  );
  const [region, setRegion] = useState(() => initialRegion || '');
  const [city, setCity] = useState(() => initialCity || 'Вся Россия');
  const [customDate, setCustomDate] = useState('');
  const [date, setDate] = useState<DateFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [price, setPrice] = useState<PriceFilter>('all');
  const [priceFrom, setPriceFrom] = useState<number | null>(null);
  const [priceTo, setPriceTo] = useState<number | null>(null);
  const [format, setFormat] = useState('Все форматы');
  const [ageLimit, setAgeLimit] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [allFormatsExpanded, setAllFormatsExpanded] = useState(false);
  const [visibleFormatCount, setVisibleFormatCount] = useState(5);
  const formatChipFieldRef = useRef<HTMLDivElement>(null);
  const formatMeasureRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PreviewFilters['sort']>('date');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [heroVisibleGeoCount, setHeroVisibleGeoCount] = useState(8);
  const [heroAllCitiesExpanded, setHeroAllCitiesExpanded] = useState(false);
  const [mobileHeroCitiesExpanded, setMobileHeroCitiesExpanded] = useState(false);
  const [mobileHeroVisibleGeoCount, setMobileHeroVisibleGeoCount] = useState(3);
  const heroCitiesRef = useRef<HTMLDivElement>(null);
  const heroGeoMeasureRef = useRef<HTMLDivElement>(null);
  const heroMobileGeoMeasureRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLElement>(null);
  const [showFloatingFilters, setShowFloatingFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileAutoLoad, setMobileAutoLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PreviewEvent | null>(null);
  const firstUrlSync = useRef(true);
  const lastSyncedFilterQuery = useRef<string | null>(null);
  const filterRequestId = useRef(0);
  const loadMoreController = useRef<AbortController | null>(null);
  const loadMoreRequestId = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const filters = useMemo<PreviewFilters>(() => ({ city, region, date, customDate, dateFrom, dateTo, price, priceFrom, priceTo, format, ageLimit, availableOnly, q: query, sort }), [city, region, date, customDate, dateFrom, dateTo, price, priceFrom, priceTo, format, ageLimit, availableOnly, query, sort]);
  const filterQuery = useMemo(() => serializeFilters(filters), [filters]);
  const localData = useMemo(() => catalogIndex ? deriveNewYearPreviewData(catalogIndex, filters, localVisibleCount) : null, [catalogIndex, filters, localVisibleCount]);
  const pageData = catalogIndex ? localData : loadedFilterQuery === filterQuery ? data : null;

  useEffect(() => {
    const controller = new AbortController();
    const indexUrl = `/api/new-year-ux-preview?${seasonal ? '' : `theme=${theme}&`}index=1`;
    void fetch(indexUrl, { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('compact index request failed');
        return response.json() as Promise<NewYearPreviewIndex>;
      })
      .then((index) => {
        if (controller.signal.aborted) return;
        setCatalogIndex(index);
        setCatalogIndexState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setCatalogIndexState('failed');
      });
    return () => controller.abort();
  }, [seasonal, theme]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const isLandingUrl = url.pathname === landingPath || url.pathname.startsWith(`${landingPath}/`);
    if (!isLandingUrl) {
      setCity(url.searchParams.get('city') || 'Вся Россия');
      setRegion(url.searchParams.get('region') || '');
    }
    setFestive(seasonal && url.searchParams.get('festive') !== '0');
    const nextDate = url.searchParams.get('date') || 'all';
    setDate(dateOptions.some((item) => item.value === nextDate) ? nextDate as DateFilter : isCustomDate(nextDate, seasonal) ? 'custom' : 'all');
    setCustomDate(isCustomDate(nextDate, seasonal) ? nextDate : '');
    setDateFrom(url.searchParams.get('dateFrom') || '');
    setDateTo(url.searchParams.get('dateTo') || '');
    const nextPrice = url.searchParams.get('price') || 'all';
    setPrice(PRICE_OPTIONS.some((item) => item.value === nextPrice) ? nextPrice as PriceFilter : 'all');
    setPriceFrom(urlNumberParam(url, 'priceFrom'));
    setPriceTo(urlNumberParam(url, 'priceTo'));
      const nextFormat = url.searchParams.get('format') || 'Все форматы';
      setFormat(nextFormat);
    setAgeLimit(url.searchParams.get('ageLimit') || '');
    setAvailableOnly(url.searchParams.get('available') === '1');
    setQuery(url.searchParams.get('q') || '');
    const nextSort = url.searchParams.get('sort');
    setSort(nextSort === 'price' || nextSort === 'price-desc' ? nextSort : 'date');
  }, [dateOptions, landingPath, seasonal]);

  useEffect(() => {
    if (!initialCity && !initialRegion) return;
    setCity(initialCity || 'Вся Россия');
    setRegion(initialRegion || '');
    setData(initialData);
    setLoadedFilterQuery(serializeFilters({ city: initialCity || 'Вся Россия', region: initialRegion || '', date: 'all', customDate: '', dateFrom: '', dateTo: '', price: 'all', priceFrom: null, priceTo: null, format: 'Все форматы', ageLimit: '', availableOnly: false, q: '', sort: 'date' }));
  }, [initialCity, initialRegion, initialData]);

  useEffect(() => {
    // Don't make the first filter interaction wait for the background compact
    // index. Use the fast server-filtered response while that index is loading;
    // once ready, all subsequent filter changes are derived locally.
    if (catalogIndexState === 'loading' && filterQuery === loadedFilterQuery) {
      setLoading(false);
      return;
    }
    if (catalogIndex) {
      localVisibleCountRef.current = 30;
      setLocalVisibleCount(30);
      setLoading(false);
      setLoadError(null);
      setLoadMoreError(null);
      return;
    }
    if (filterQuery === loadedFilterQuery) {
      setLoading(false);
      setLoadError(null);
      return;
    }
    const controller = new AbortController();
    const requestId = ++filterRequestId.current;
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    loadMoreRequestId.current++;
    setLoadingMore(false);
    setLoadMoreError(null);
    setLoading(true);
    setLoadError(null);
    const timer = setTimeout(async () => {
      try {
        const endpoint = `/api/new-year-ux-preview?${seasonal ? '' : `theme=${theme}&`}`;
        const response = await fetch(`${endpoint}${filterQuery}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('preview request failed');
        const next = await response.json() as PreviewData;
        if (controller.signal.aborted || requestId !== filterRequestId.current) return;
        setData(next);
        setLoadedFilterQuery(filterQuery);
      } catch (error) {
        if (!controller.signal.aborted && requestId === filterRequestId.current && !(error instanceof DOMException && error.name === 'AbortError')) setLoadError('Не удалось обновить выборку. Попробуйте ещё раз.');
      } finally {
        if (!controller.signal.aborted && requestId === filterRequestId.current) setLoading(false);
      }
    }, query ? 180 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filterQuery, query, loadedFilterQuery, retryToken, catalogIndex, catalogIndexState, seasonal, theme]);

  useEffect(() => {
    if (!selectedEvent) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedEvent(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedEvent]);

  useEffect(() => {
    setSelectedEvent(null);
  }, [filterQuery]);

  useEffect(() => {
    if (firstUrlSync.current) {
      firstUrlSync.current = false;
      lastSyncedFilterQuery.current = filterQuery;
      return;
    }
    const url = new URL(window.location.href);
    for (const key of ['city', 'region', 'date', 'dateFrom', 'dateTo', 'price', 'priceFrom', 'priceTo', 'format', 'ageLimit', 'available', 'q', 'sort', 'lowStock']) url.searchParams.delete(key);
    const isLandingUrl = isThemePath(url.pathname, landingPath);
    if (isLandingUrl) url.pathname = publicGeoPath(theme, city, region);
    new URLSearchParams(filterQuery).forEach((value, key) => {
      if (isLandingUrl && (key === 'city' || key === 'region')) return;
      url.searchParams.set(key, value);
    });
    const nextHref = `${url.pathname}${url.search}${url.hash}`;
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextHref !== currentHref) {
      const previous = new URLSearchParams(lastSyncedFilterQuery.current || '');
      const next = new URLSearchParams(filterQuery);
      const keys = new Set([...previous.keys(), ...next.keys()]);
      const changed = [...keys].filter((key) => previous.get(key) !== next.get(key));
      const searchOnlyChange = changed.length === 1 && changed[0] === 'q';
      const syncHistory = searchOnlyChange ? window.history.replaceState : window.history.pushState;
      syncHistory.call(window.history, window.history.state, '', nextHref);
    }
    lastSyncedFilterQuery.current = filterQuery;
  }, [filterQuery, city, region, theme, landingPath]);

  useEffect(() => {
    const syncLocation = () => {
      const url = new URL(window.location.href);
      const geo = isThemePath(url.pathname, landingPath)
        ? resolveGeoPath(url.pathname, landingPath, data?.facets)
        : { city: url.searchParams.get('city') || 'Вся Россия', region: url.searchParams.get('region') || '' };
      setCity(geo.city);
      setRegion(geo.region);
      const nextDate = url.searchParams.get('date') || 'all';
      setFestive(seasonal && url.searchParams.get('festive') !== '0');
      setDate(dateOptions.some((item) => item.value === nextDate) ? nextDate as DateFilter : isCustomDate(nextDate, seasonal) ? 'custom' : 'all');
      setCustomDate(isCustomDate(nextDate, seasonal) ? nextDate : '');
      setDateFrom(url.searchParams.get('dateFrom') || '');
      setDateTo(url.searchParams.get('dateTo') || '');
      const nextPrice = url.searchParams.get('price') || 'all';
    setPrice(PRICE_OPTIONS.some((item) => item.value === nextPrice) ? nextPrice as PriceFilter : 'all');
      setPriceFrom(urlNumberParam(url, 'priceFrom'));
    setPriceTo(urlNumberParam(url, 'priceTo'));
    const nextFormat = url.searchParams.get('format') || 'Все форматы';
    setFormat(nextFormat);
      setAgeLimit(url.searchParams.get('ageLimit') || '');
      setAvailableOnly(url.searchParams.get('available') === '1');
      setQuery(url.searchParams.get('q') || '');
      const nextSort = url.searchParams.get('sort');
      setSort(nextSort === 'price' || nextSort === 'price-desc' ? nextSort : 'date');
    };
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, [data?.facets, dateOptions, landingPath, seasonal]);

  const loadMore = useCallback(async () => {
    if (!pageData?.hasMore || loadingMore || loading) return;
    if (catalogIndex) {
      const nextCount = Math.min(localVisibleCountRef.current + 30, pageData.total);
      localVisibleCountRef.current = nextCount;
      setLocalVisibleCount(nextCount);
      return;
    }
    const controller = new AbortController();
    const requestId = ++loadMoreRequestId.current;
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const params = new URLSearchParams(filterQuery);
      params.set('offset', String(pageData.nextOffset ?? pageData.items.length));
      const endpoint = `/api/new-year-ux-preview?${seasonal ? '' : `theme=${theme}&`}`;
      const response = await fetch(`${endpoint}${params.toString()}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('pagination request failed');
      const next = await response.json() as PreviewData;
      if (controller.signal.aborted || requestId !== loadMoreRequestId.current || loadedFilterQuery !== filterQuery) return;
      setData((current) => {
        if (!current || loadedFilterQuery !== filterQuery) return current;
        return { ...next, items: appendUniqueNewYearPreviewEvents(current.items, next.items) };
      });
    } catch (error) {
      if (!controller.signal.aborted && requestId === loadMoreRequestId.current && !(error instanceof DOMException && error.name === 'AbortError')) {
        setLoadMoreError('Не удалось загрузить следующие события. Повторите попытку.');
      }
    } finally {
      if (requestId === loadMoreRequestId.current) {
        setLoadingMore(false);
        loadMoreController.current = null;
      }
    }
  }, [pageData, filterQuery, loadedFilterQuery, loading, loadingMore, catalogIndex, seasonal, theme]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const updateMobileAutoLoad = () => setMobileAutoLoad(media.matches && 'IntersectionObserver' in window);
    updateMobileAutoLoad();
    media.addEventListener('change', updateMobileAutoLoad);
    return () => media.removeEventListener('change', updateMobileAutoLoad);
  }, []);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!mobileAutoLoad || !sentinel || !pageData?.hasMore || loading || loadingMore || loadMoreError) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: '1000px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mobileAutoLoad, pageData?.hasMore, loading, loadingMore, loadMoreError, loadMore]);

  const cities = (pageData || data)?.facets.cities || [];
  const regions = (pageData || data)?.facets.regions || [];
  // Keep the format choices mounted while a new filter query is in flight.
  // pageData is temporarily null until the response for filterQuery arrives;
  // deriving chips from it made the whole row disappear on every selection.
  const formats = (pageData || data)?.facets.formats || [];
  const allCityOptions = cities
    .filter((item) => item.name && item.name !== 'Вся Россия' && item.filterable !== false)
    .sort((a, b) => b.count - a.count || (a.name || '').localeCompare(b.name || '', 'ru'));
  const orderedCities = [cities.find((item) => item.name === 'Вся Россия'), ...allCityOptions]
    .filter((item, index, list) => item && list.findIndex((candidate) => candidate?.name === item.name) === index) as Facet[];
  const geoOptions = [
    ...orderedCities.map((item) => ({ ...item, geoKind: 'city' as const })),
    ...regions.map((item) => ({ ...item, region: item.name, geoKind: 'region' as const })),
  ].filter((item) => Boolean(item.name) && item.count > 0);
  const currentGeoOption = geoOptions.find((item) => item.name === (region || city)) || (region
    ? regions.find((item) => item.name === region)
    : cities.find((item) => item.name === city)) || undefined;
  const normalizedCurrentGeoOption = currentGeoOption && !currentGeoOption.geoKind
    ? { ...currentGeoOption, geoKind: region ? 'region' as const : 'city' as const }
    : currentGeoOption;
  const allGeoOption = geoOptions.find((item) => item.name === 'Вся Россия');
  const featuredPriority = !region && city === 'Вся Россия'
    ? ['Москва', 'Санкт-Петербург']
    : [];
  const preferredCityOptions: Facet[] = featuredPriority.flatMap((name) => {
    const option = geoOptions.find((item) => item.name === name);
    return option ? [option] : [];
  });
  const featuredRegionOptions: Facet[] = regions
    .filter((item) => item.name && item.count > 0)
    .slice(0, 2)
    .map((item) => ({ ...item, region: item.name, geoKind: 'region' as const }));
  const orderedGeoOptions: Facet[] = [
    ...(allGeoOption ? [allGeoOption] : []),
    ...(normalizedCurrentGeoOption && normalizedCurrentGeoOption.name !== 'Вся Россия' ? [normalizedCurrentGeoOption] : []),
    ...preferredCityOptions,
    ...featuredRegionOptions,
    ...geoOptions.filter((item) => item.name !== 'Вся Россия' && item.name !== normalizedCurrentGeoOption?.name),
  ].filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index);
  const mobileGeoOptions = orderedGeoOptions;
  const mobileVisibleGeoOptions = mobileGeoOptions.slice(0, mobileHeroVisibleGeoCount);
  const mobileHiddenGeoOptions = mobileGeoOptions.slice(mobileHeroVisibleGeoCount);
  const featuredGeoOptions = orderedGeoOptions.slice(0, heroVisibleGeoCount);
  const hiddenGeoOptions = orderedGeoOptions.slice(heroVisibleGeoCount);
  const hiddenGeoCountLabel = `Ещё ${hiddenGeoOptions.length} ${pluralRu(hiddenGeoOptions.length, ['город', 'города', 'городов'])}`;
  const mobileMoreLabel = `Ещё ${mobileHiddenGeoOptions.length} ${pluralRu(mobileHiddenGeoOptions.length, ['город', 'города', 'городов'])}`;
  const measureMoreLabel = `Ещё ${orderedGeoOptions.length} ${pluralRu(orderedGeoOptions.length, ['город', 'города', 'городов'])} ↓`;
  useEffect(() => {
    const container = heroCitiesRef.current;
    const measure = heroGeoMeasureRef.current;
    const mobileMeasure = heroMobileGeoMeasureRef.current;
    if (!container || !measure || !mobileMeasure) return;
    const fitOneRow = (items: HTMLElement[], more: HTMLElement | undefined, availableWidth: number, gap: number) => {
      if (!items.length || availableWidth <= 0) return 0;
      const widths = items.map((item) => item.getBoundingClientRect().width);
      const moreWidth = more?.getBoundingClientRect().width || 0;
      for (let count = widths.length; count >= 1; count--) {
        const visibleWidth = widths.slice(0, count).reduce((sum, width) => sum + width, 0) + gap * Math.max(0, count - 1);
        const needsMore = count < widths.length;
        if (visibleWidth + (needsMore ? gap + moreWidth : 0) <= availableWidth) return count;
      }
      return 1;
    };
    const fitHeroChips = () => {
      const availableWidth = container.clientWidth;
      const desktopChips = Array.from(measure.children).slice(0, orderedGeoOptions.length) as HTMLElement[];
      const desktopMore = measure.children[orderedGeoOptions.length] as HTMLElement | undefined;
      const desktopGap = Number.parseFloat(getComputedStyle(measure).columnGap) || 0;
      const desktopVisible = fitOneRow(desktopChips, desktopMore, availableWidth, desktopGap);
      setHeroVisibleGeoCount((current) => current === desktopVisible ? current : desktopVisible);

      if (window.matchMedia('(max-width: 899px)').matches) {
        const mobileChips = Array.from(mobileMeasure.children).slice(0, mobileGeoOptions.length) as HTMLElement[];
        const mobileMore = mobileMeasure.children[mobileGeoOptions.length] as HTMLElement | undefined;
        const mobileGap = Number.parseFloat(getComputedStyle(mobileMeasure).columnGap) || 0;
        const visible = fitOneRow(mobileChips, mobileMore, availableWidth, mobileGap);
        setMobileHeroVisibleGeoCount((current) => current === visible ? current : visible);
      }
    };
    fitHeroChips();
    const observer = new ResizeObserver(fitHeroChips);
    observer.observe(container);
    return () => observer.disconnect();
  }, [orderedGeoOptions.map((item) => `${item.geoKind}:${item.name}:${item.count}`).join('|'), mobileGeoOptions.map((item) => `${item.geoKind}:${item.name}:${item.count}`).join('|')]);
  useEffect(() => {
    let previousY = window.scrollY;
    const updateFloatingButton = () => {
      const filtersElement = filtersRef.current;
      if (!filtersElement || window.matchMedia('(min-width: 900px)').matches) {
        setShowFloatingFilters(false);
        previousY = window.scrollY;
        return;
      }
      const currentY = window.scrollY;
      const scrollingDown = currentY > previousY;
      if (filtersElement.getBoundingClientRect().bottom >= 0 || !scrollingDown) setShowFloatingFilters(false);
      else setShowFloatingFilters(true);
      previousY = currentY;
    };
    window.addEventListener('scroll', updateFloatingButton, { passive: true });
    window.addEventListener('resize', updateFloatingButton);
    updateFloatingButton();
    return () => {
      window.removeEventListener('scroll', updateFloatingButton);
      window.removeEventListener('resize', updateFloatingButton);
    };
  }, []);
  const dateRangeLabel = [dateFrom ? formatCustomDate(dateFrom) : 'любая дата', dateTo ? formatCustomDate(dateTo) : 'любая дата'].join(' - ');
  const currentDateLabel = dateFrom || dateTo ? dateRangeLabel : date === 'custom' && customDate ? formatCustomDate(customDate) : dateOptions.find((item) => item.value === date)?.label;
  const currentPriceLabel = priceFrom != null || priceTo != null
    ? `${priceFrom != null ? `от ${formatPrice(priceFrom)}` : 'любая цена'}${priceTo != null ? ` до ${formatPrice(priceTo)}` : ''}`
    : PRICE_OPTIONS.find((item) => item.value === price)?.label;
  const hasFilters = Boolean((city !== 'Вся Россия' || region) || query.trim() || date !== 'all' || dateFrom || dateTo || price !== 'all' || priceFrom != null || priceTo != null || format !== 'Все форматы' || ageLimit || availableOnly);
  const activeFilterCount = [city !== 'Вся Россия' || Boolean(region), date !== 'all' || Boolean(dateFrom || dateTo), price !== 'all' || priceFrom != null || priceTo != null, format !== 'Все форматы', Boolean(query.trim()), Boolean(ageLimit), availableOnly].filter(Boolean).length;
  const geographySummary = [...new Set([city !== 'Вся Россия' ? city : '', region].filter(Boolean))].join(', ');
  const activeFilterSummary = [query.trim() ? `«${query.trim()}»` : '', date !== 'all' || dateFrom || dateTo ? currentDateLabel : '', price !== 'all' || priceFrom != null || priceTo != null ? currentPriceLabel : '', format !== 'Все форматы' ? format : '', ageLimit ? `Возраст ${ageLimit}` : '', availableOnly ? 'Есть места' : ''].filter(Boolean).join(' · ') || 'Все мероприятия';
  const cityPrepositional = city === 'Вся Россия' ? null : resolveCityCases(city).prepositional;
  const regionPrepositional = region ? resolveCityCases(region).prepositional : null;
  const heroLocality = city !== 'Вся Россия'
    ? `в ${cityPrepositional || city}`
    : region
      ? `в ${regionPrepositional || `регионе «${region}»`}`
      : null;
  const heroTitle = seasonal
    ? <>Новый год <span className={styles.titleYear}>2027</span> в {region ? resolveCityCases(region).prepositional || `регионе «${region}»` : cityPrepositional || 'России'}:<br className={styles.titleBreak} /> мероприятия, афиша и билеты</>
    : isConcerts
      ? <>Концерты {heroLocality || 'в России'}: афиша, расписание и билеты</>
      : <>Куда сходить с детьми {heroLocality ? ` ${heroLocality}` : 'в России'}: афиша и билеты</>;
  const heroDescription = seasonal
    ? heroLocality
      ? `Новогодние праздники - отличный повод выбраться из дома, провести время с близкими или отправиться в небольшое путешествие. На этой странице собраны праздничные концерты, спектакли, детские ёлки, экскурсии и развлекательные программы ${heroLocality}. Выбирайте интересующие даты, сравнивайте мероприятия и находите подходящий вариант для всей семьи или компании друзей.`
      : 'Новогодние праздники - отличный повод выбраться из дома, провести время с близкими или отправиться в небольшое путешествие. На этой странице собраны праздничные концерты, спектакли, детские ёлки, экскурсии и развлекательные программы в разных городах России. Выбирайте интересующие даты, сравнивайте мероприятия и находите подходящий вариант для всей семьи или компании друзей.'
    : isConcerts
      ? `Рок, поп, джаз, классическая музыка, симфонические концерты и камерные выступления. Выбирайте исполнителей, жанры, города и даты. Сравнивайте мероприятия и покупайте билеты онлайн${heroLocality ? ` ${heroLocality}` : ''}.`
      : `Детские спектакли, цирк, интерактивные шоу, мастер-классы, музеи и развлечения для всей семьи. Выбирайте город, возраст ребёнка, дату и подходящие мероприятия${heroLocality ? ` ${heroLocality}` : ''}.`;
  const placeLabel = city !== 'Вся Россия' && region
    ? `в ${cityPrepositional || city}, регион «${region}»`
    : city !== 'Вся Россия'
      ? `в ${cityPrepositional || city}`
      : region
        ? `в населённых пунктах региона «${region}»`
        : 'в городах России';
  const cityGuide = seasonal && city !== 'Вся Россия' ? NEW_YEAR_CITY_GUIDES[city] || null : null;
  const cityEditorial = useMemo(() => seasonal && city !== 'Вся Россия' ? resolveSeoListingText('new-year', cityToSlug({ name: city })) : null, [city, seasonal]);
  const liveCityFormats = formats.filter((item) => item.name && item.name !== 'Все форматы' && item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const popularFormats = formats.filter((item) => item.name && item.name !== 'Все форматы' && item.count > 0);
  const primaryFormats = allFormatsExpanded ? popularFormats : popularFormats.slice(0, visibleFormatCount);
  const otherFormats = popularFormats.slice(visibleFormatCount);
  useEffect(() => {
    if (format !== 'Все форматы' && otherFormats.some((item) => item.name === format)) setAllFormatsExpanded(true);
  }, [format, otherFormats.map((item) => item.name).join('|')]);
  useEffect(() => {
    const container = formatChipFieldRef.current;
    const measure = formatMeasureRef.current;
    if (!container || !measure) return;

    const fitFormats = () => {
      const availableWidth = container.clientWidth;
      const allFormatsChip = measure.querySelector<HTMLElement>('[data-measure-all]');
      const moreChip = measure.querySelector<HTMLElement>('[data-measure-more]');
      const formatChips = Array.from(measure.querySelectorAll<HTMLElement>('[data-measure-format]'));
      if (!availableWidth || !allFormatsChip) return;

      const gap = Number.parseFloat(getComputedStyle(container).columnGap) || 0;
      let usedWidth = allFormatsChip.offsetWidth;
      let visibleCount = 0;
      for (let index = 0; index < formatChips.length; index++) {
        const nextWidth = usedWidth + gap + formatChips[index].offsetWidth;
        const stillHasMore = index < formatChips.length - 1;
        const totalWidth = nextWidth + (stillHasMore && moreChip ? gap + moreChip.offsetWidth : 0);
        if (totalWidth > availableWidth) break;
        usedWidth = nextWidth;
        visibleCount++;
      }
      setVisibleFormatCount((current) => current === visibleCount ? current : visibleCount);
    };

    fitFormats();
    const observer = new ResizeObserver(fitFormats);
    observer.observe(container);
    return () => observer.disconnect();
  }, [popularFormats.map((item) => `${item.name}:${item.count}`).join('|')]);
  const liveCityHighlights = (pageData?.items || []).slice(0, 3).map((event) => event.title).filter(Boolean);
  const dynamicCityParagraph = seasonal && pageData && city !== 'Вся Россия' && !cityGuide && pageData.total > 0
    ? `В новогодней афише ${city} сейчас ${pageData.total} ${pluralRu(pageData.total, NEW_YEAR_EVENT_FORMS)}. В каталоге представлены форматы: ${liveCityFormats.length ? liveCityFormats.map((item) => `${item.name!.toLocaleLowerCase('ru')} (${item.count})`).join(', ') : 'праздничные программы'}.${liveCityHighlights.length ? ` Среди ближайших вариантов: ${liveCityHighlights.map((title) => `«${title}»`).join('; ')}.` : ''}`
    : null;
  const seoContentHeading = seasonal ? cityGuide?.heading || (region && city === 'Вся Россия' ? `Новогодние события: ${region}` : city === 'Вся Россия' ? NEW_YEAR_NATIONAL_GUIDE.heading : cityEditorial?.heading || `Новогодняя афиша ${placeLabel}`) || 'Новогодние мероприятия' : '';
  const seoContentParagraphs = !seasonal ? [] : cityGuide
    ? [cityGuide.intro]
    : region && city === 'Вся Россия'
      ? [getNewYearRegionGuide(region)]
    : city === 'Вся Россия'
      ? [NEW_YEAR_NATIONAL_GUIDE.intro]
      : cityEditorial
        ? splitSeoListingParagraphs(cityEditorial.body)
        : dynamicCityParagraph ? [dynamicCityParagraph] : [];
  const guideSections = seasonal ? cityGuide?.sections || [] : [];
  const regionCityNames = new Set((pageData?.facets.cities || []).filter((item) => item.region === region && item.name).map((item) => item.name!));
  const regionGuideLinks = NEW_YEAR_NATIONAL_GUIDE.cities.filter((item) => regionCityNames.has(item.title));
  const guideLinks = seasonal ? cityGuide?.recommendations || (city === 'Вся Россия' ? region ? regionGuideLinks : NEW_YEAR_NATIONAL_GUIDE.cities : []) : [];
  const faqItems = seasonal ? cityGuide?.faq || [] : [];
  const navigateGeo = (nextCity: string, nextRegion: string) => {
    const current = new URL(window.location.href);
    if (!isThemePath(current.pathname, landingPath)) return;
    current.pathname = publicGeoPath(theme, nextCity, nextRegion);
    current.searchParams.delete('city');
    current.searchParams.delete('region');
    router.push(`${current.pathname}${current.search}${current.hash}`, { scroll: false });
  };
  const selectCity = (value: string) => {
    const nextCity = value !== 'Вся Россия' && city === value && !region ? 'Вся Россия' : value;
    navigateGeo(nextCity, '');
    setCity(nextCity);
    setRegion('');
  };
  const selectAllGeography = () => { navigateGeo('Вся Россия', ''); setCity('Вся Россия'); setRegion(''); };
  const selectRegion = (value: string) => {
    const nextRegion = region === value ? '' : value;
    navigateGeo('Вся Россия', nextRegion);
    setRegion(nextRegion);
    setCity('Вся Россия');
  };
  const renderGeoChip = (item: Facet) => {
    if (!item.name) return null;
    const isRegion = item.geoKind === 'region';
    const selected = isRegion
      ? region === item.name
      : item.name === 'Вся Россия'
        ? city === 'Вся Россия' && !region
        : city === item.name;
    const className = `${styles.heroCityChip} ${selected ? styles.heroCityChipActive : ''}`;
    const label = <><span className={styles.heroCityName}>{item.name}</span><b className={styles.heroCityCount}>{item.count}</b></>;
    if (selected) return <span key={`${isRegion ? 'region' : 'city'}:${item.name}`} className={className} aria-current="page">{label}</span>;
    const href = isRegion ? publicGeoPath(theme, 'Вся Россия', item.name) : item.name === 'Вся Россия' ? publicGeoPath(theme, 'Вся Россия', '') : publicGeoPath(theme, item.name, '');
    return <Link
      key={`${isRegion ? 'region' : 'city'}:${item.name}`}
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        if (isRegion) selectRegion(item.name!);
        else if (item.name === 'Вся Россия') selectAllGeography();
        else selectCity(item.name!);
      }}
    >{label}</Link>;
  };
  const generatedLabel = pageData?.generatedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(new Date(pageData.generatedAt)) : 'не указано';
  const priceDomainMax = Math.max(500, (pageData || data)?.facets.priceRange.max ?? 10_000);

  const setDateFilter = (value: DateFilter) => {
    setDate(value);
    setDateFrom('');
    setDateTo('');
    if (value !== 'custom') setCustomDate('');
  };
  const selectGeoSearchItem = (item: Facet) => {
    if (item.name === 'Вся Россия') selectAllGeography();
    else if (item.geoKind === 'region') selectRegion(item.name || '');
    else selectCity(item.name || 'Вся Россия');
  };
  const setCustomDateFilter = (value: string) => {
    if (!isCustomDate(value, seasonal)) return;
    setCustomDate(value);
    setDateFrom('');
    setDateTo('');
    setDate('custom');
  };
  const setDateRangeFilter = (from: string, to: string) => {
    setDate('all');
    setCustomDate('');
    setDateFrom(from);
    setDateTo(to);
  };
  const resetFilters = () => {
    const current = new URL(window.location.href);
    if (isThemePath(current.pathname, landingPath)) {
      for (const key of ['city', 'region', 'date', 'dateFrom', 'dateTo', 'price', 'priceFrom', 'priceTo', 'format', 'ageLimit', 'available', 'q', 'sort', 'lowStock']) current.searchParams.delete(key);
      current.pathname = publicGeoPath(theme, 'Вся Россия', '');
      router.push(`${current.pathname}${current.search}${current.hash}`, { scroll: false });
    }
    setCity('Вся Россия');
    setRegion('');
    setQuery('');
    setDateFilter('all');
    setPrice('all');
    setPriceFrom(null);
    setPriceTo(null);
    setFormat('Все форматы');
    setAgeLimit('');
    setAvailableOnly(false);
    setSort('date');
    setViewMode('list');
  };
  return (
    <div className={`${styles.page} ${fontInter.variable} ${fontUnbounded.variable} ${fontUnboundedLatin.variable} ${festive ? styles.festive : ''} ${isConcerts ? styles.concertsTheme : ''} ${isFamily ? styles.familyTheme : ''}`} data-thematic-landing={theme}>
      <section className={`${styles.band} ${festive ? styles.bandFestive : ''}`}>
          {festive ? <div className={styles.snowPattern} aria-hidden="true">
            <div className={styles.snowflakes}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={styles.snowflakeFall}><svg viewBox="0 0 48 48" className={styles.snowflake}><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M24 3v42M21 8l3 3 3-3M21 40l3-3 3 3M5.8 13.5l36.4 21M9 12.8l.7 4.2 4.2-.7M34.1 31.7l4.2-.7-.7 4.2M5.8 34.5l36.4-21M9 35.2l.7-4.2 4.2.7M34.1 16.3l4.2.7-.7-4.2" /></g></svg></span>)}</div>
          </div> : null}
          <div className={`${styles.wrap} ${styles.bandContent}`}>
          <nav aria-label="Хлебные крошки" className={styles.bandCrumbs}>
            <details className={styles.heroMobileMenu}>
              <summary aria-label="Открыть меню"><span aria-hidden="true" /></summary>
              <nav aria-label="Основная навигация">
                <button type="button" onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  document.getElementById('new-year-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}>Фильтры</button>
                <Link href="/events">Афиша</Link>
                <Link href="/cities">Город</Link>
                <Link href="/podborki">Подборки</Link>
                <Link href="/blog">Блог</Link>
                <Link href="/my-day">Мой день</Link>
                <Link href="/help">Помощь и FAQ</Link>
              </nav>
            </details>
            <Link href="/" className={styles.heroLogo} aria-label="Дайбилет, главная">дай<span>билет</span></Link>
            <span aria-hidden="true">/</span><Link href="/podborki">Подборки</Link><span aria-hidden="true">/</span>
            {region || city !== 'Вся Россия' ? <><Link href={landingPath}>{landingName}</Link><span aria-hidden="true">/</span><span className={styles.bandCrumbCurrent}>{region || city}</span></> : <span className={styles.bandCrumbCurrent} aria-current="page">{landingName}</span>}
            <div className={styles.heroDesktopNav} aria-label="Основная навигация">
              <Link href={city !== 'Вся Россия' || region ? landingPath : '/podborki'} className={styles.returnLink}><span aria-hidden="true">←</span> Вернуться</Link>
            </div>
          </nav>
          <h1 className={styles.title}>{heroTitle}</h1>
          <p className={`${styles.lead} ${styles.leadDesktop}`}>{heroDescription}</p>
          <p className={`${styles.lead} ${styles.leadMobile}`}>{seasonal ? (heroLocality
            ? `Новогодние концерты, спектакли, детские ёлки, экскурсии и праздничные программы ${heroLocality}. Выбирайте даты и подходящие мероприятия.`
            : 'Новогодние концерты, спектакли, детские ёлки, экскурсии и праздничные программы по всей России. Выбирайте города, даты и подходящие мероприятия.') : heroDescription}</p>
          <div className={styles.bandMeta}>
            <span><strong>{(pageData || data)?.total || 0}</strong> {pluralRu((pageData || data)?.total || 0, eventForms)}</span>
            {(() => { const count = Math.max(0, cities.filter((item) => item.name !== 'Вся Россия' && item.count > 0).length); return <span>{count} {pluralRu(count, ['город', 'города', 'городов'])}<span className={styles.heroCityMetaSuffix}> с событиями</span></span>; })()}
            <span>{(pageData || data)?.priceFrom != null ? `от ${new Intl.NumberFormat('ru-RU').format((pageData || data)!.priceFrom!)} рублей` : 'Цена уточняется'}</span>
          </div>
          <div ref={heroCitiesRef} className={styles.heroCities} aria-label="Выбрать город или регион">
            <div className={`${styles.heroCitiesDesktop} ${heroAllCitiesExpanded ? styles.heroCitiesExpanded : ''}`}>
            {(heroAllCitiesExpanded ? orderedGeoOptions : featuredGeoOptions).map(renderGeoChip)}
            {hiddenGeoOptions.length ? <button
                type="button"
                className={`${styles.heroCityChip} ${styles.heroMoreButton}`}
                aria-expanded={heroAllCitiesExpanded}
                onClick={() => setHeroAllCitiesExpanded((expanded) => !expanded)}
            >{heroAllCitiesExpanded ? 'Свернуть ↑' : `${hiddenGeoCountLabel} ↓`}</button> : null}
            </div>
            <div className={`${styles.heroCitiesMobile} ${mobileHeroCitiesExpanded ? styles.heroCitiesExpanded : ''}`}>
              {(mobileHeroCitiesExpanded ? mobileGeoOptions : mobileVisibleGeoOptions).map(renderGeoChip)}
              {mobileHiddenGeoOptions.length ? <button type="button" className={`${styles.heroCityChip} ${styles.heroMoreButton}`} aria-expanded={mobileHeroCitiesExpanded} onClick={() => setMobileHeroCitiesExpanded((expanded) => !expanded)}>
                  {mobileHeroCitiesExpanded ? 'Свернуть ↑' : `${mobileMoreLabel} ↓`}
                </button>
              : null}
            </div>
            <div ref={heroGeoMeasureRef} className={styles.heroGeoMeasure} aria-hidden="true">
              {orderedGeoOptions.map((item) => <span key={`measure:${item.geoKind}:${item.name}`} className={styles.heroCityChip}><span className={styles.heroCityName}>{item.name}</span><b className={styles.heroCityCount}>{item.count}</b></span>)}
              <span className={`${styles.heroCityChip} ${styles.heroMoreButton}`}>{measureMoreLabel}</span>
            </div>
            <div ref={heroMobileGeoMeasureRef} className={`${styles.heroGeoMeasure} ${styles.heroGeoMeasureMobile}`} aria-hidden="true">
              {mobileGeoOptions.map((item) => <span key={`mobile-measure:${item.geoKind}:${item.name}`} className={styles.heroCityChip}><span className={styles.heroCityName}>{item.name}</span><b className={styles.heroCityCount}>{item.count}</b></span>)}
              <span className={`${styles.heroCityChip} ${styles.heroMoreButton}`}>{measureMoreLabel}</span>
            </div>
          </div>
          </div>
        </section>

      <div className={styles.wrap}>
        <div className={styles.layout}>
        <section ref={filtersRef} id="new-year-filters" className={styles.filters} aria-label="Фильтры мероприятий">
          <div id="new-year-filter-controls" className={styles.filtersContent}>
            <div className={styles.filterMain}>
              <GeoSearchDropdown options={geoOptions} city={city} region={region} onSelect={selectGeoSearchItem} />
              <label className={styles.search}>
                <span className="sr-only">Поиск по названию, площадке или городу</span>
                <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input className={styles.searchInput} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: ёлка, спектакль, город…" />
              </label>
              <div className={styles.desktopToolbarControls}>
                <div className={`${styles.segment} ${styles.segmentSort}`} role="group" aria-label="Сортировка">
                  <button type="button" className={sort === 'date' ? styles.segmentActive : ''} onClick={() => setSort('date')}>По дате</button>
                  <button type="button" className={sort === 'price' ? styles.segmentActive : ''} onClick={() => setSort('price')}>Дешевле</button>
                  <button type="button" className={sort === 'price-desc' ? styles.segmentActive : ''} onClick={() => setSort('price-desc')}>Дороже</button>
                </div>
                <div className={`${styles.segment} ${styles.segmentDensity}`} role="group" aria-label="Вид мероприятий">
                  <button type="button" className={viewMode === 'list' ? styles.segmentActive : ''} onClick={() => setViewMode('list')} aria-label="Показать списком" title="Список" aria-pressed={viewMode === 'list'}>▤</button>
                  <button type="button" className={viewMode === 'cards' ? styles.segmentActive : ''} onClick={() => setViewMode('cards')} aria-label="Показать карточками" title="Карточки" aria-pressed={viewMode === 'cards'}>▥</button>
                </div>
              </div>
              <div className={`${styles.priceControlsMobile} ${styles.segment} ${styles.segmentSort}`} role="group" aria-label="Сортировка">
                <button type="button" className={sort === 'date' ? styles.segmentActive : ''} onClick={() => setSort('date')}>По дате</button>
                <button type="button" className={sort === 'price' ? styles.segmentActive : ''} onClick={() => setSort('price')}>Дешевле</button>
                <button type="button" className={sort === 'price-desc' ? styles.segmentActive : ''} onClick={() => setSort('price-desc')}>Дороже</button>
              </div>
              <div className={`${styles.priceControlsMobile} ${styles.segment} ${styles.segmentDensity}`} role="group" aria-label="Вид мероприятий">
                <button type="button" className={viewMode === 'list' ? styles.segmentActive : ''} onClick={() => setViewMode('list')} aria-label="Показать списком" title="Список" aria-pressed={viewMode === 'list'}>▤</button>
                <button type="button" className={viewMode === 'cards' ? styles.segmentActive : ''} onClick={() => setViewMode('cards')} aria-label="Показать карточками" title="Карточки" aria-pressed={viewMode === 'cards'}>▥</button>
              </div>
            </div>
            <div className={styles.desktopFilterPanel} aria-label="Фильтры мероприятий">
              <div className={styles.datePriceRow}>
                <div className={styles.dateFilterRow} role="group" aria-label="Популярные даты">
                  {datePresets.map((preset) => {
                    const active = preset.value ? date === preset.value && !dateFrom && !dateTo : date === 'all' && dateFrom === preset.from && dateTo === preset.to;
                    return <button type="button" key={preset.label} className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`} aria-pressed={active} onClick={() => preset.value ? setDateFilter(preset.value) : setDateRangeFilter(preset.from || '', preset.to || '')}>{preset.label}</button>;
                  })}
                  <DatePickerChip date={date} customDate={customDate} onChange={setCustomDateFilter} seasonal={seasonal} />
                </div>
                <PriceRangeFields min={priceFrom} max={priceTo} domainMax={priceDomainMax} onChange={(from, to) => {
                  setPrice('all');
                  setPriceFrom(from);
                  setPriceTo(to);
                }} />
              </div>
              <div className={`${styles.formatChipField} ${allFormatsExpanded ? styles.formatChipFieldExpanded : ''}`} role="group" aria-label={isConcerts ? 'Жанр' : isFamily ? 'Формат' : 'Формат'} ref={formatChipFieldRef}>
                  <button type="button" className={`${styles.filterChip} ${format === 'Все форматы' ? styles.filterChipActive : ''}`} onClick={() => setFormat('Все форматы')}>{allFormatsLabel}</button>
                  {primaryFormats.map((item) => {
                    const value = item.name!;
                    return <button type="button" key={`desktop-format:${value}`} className={`${styles.filterChip} ${format === value ? styles.filterChipActive : ''}`} aria-pressed={format === value} onClick={() => setFormat(value)}>{value}<span>{item.count}</span></button>;
                  })}
                  {otherFormats.length ? <button type="button" className={`${styles.formatMore} ${allFormatsExpanded ? styles.formatMoreExpanded : ''}`} aria-expanded={allFormatsExpanded} onClick={() => setAllFormatsExpanded((value) => !value)}>{allFormatsExpanded ? 'Свернуть ↑' : `Ещё ${otherFormats.length} ▾`}</button> : null}
                  <div className={styles.formatMeasure} aria-hidden="true" ref={formatMeasureRef}>
                    <button type="button" className={styles.filterChip} data-measure-all>Все форматы</button>
                    {popularFormats.map((item) => <button type="button" className={styles.filterChip} key={`measure:${item.name}`} data-measure-format>{item.name}<span>{item.count}</span></button>)}
                    <button type="button" className={styles.formatMore} data-measure-more>{`Ещё ${popularFormats.length} ▾`}</button>
                  </div>
              </div>
              {isFamily ? <div className={styles.ageFilterRow} role="group" aria-label="Возраст">
                <span className={styles.ageFilterLabel}>Возраст</span>
                {[{ value: '', label: 'Любой' }, ...((pageData || data)?.facets.ages || []).map((item) => ({ value: item.value || item.name || '', label: item.value || item.name || '' }))].map((item) => <button type="button" key={item.value || 'any-age'} className={`${styles.filterChip} ${ageLimit === item.value ? styles.filterChipActive : ''}`} aria-pressed={ageLimit === item.value} onClick={() => setAgeLimit(item.value)}>{item.label}</button>)}
              </div> : null}
              {!seasonal ? <label className={styles.availableFilter}><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> <span>Только с местами</span></label> : null}
            </div>
            <div className={styles.mobileDropdowns}>
              <label className={styles.mobileFilterField}>
                <span>Город</span>
                <select id="new-year-mobile-city" value={region ? `region:${region}` : city} onChange={(event) => {
                  const selected = geoOptions.find((item) => (item.geoKind === 'region' ? `region:${item.name}` : item.name) === event.target.value);
                  if (selected) selectGeoSearchItem(selected);
                }}>
                  {geoOptions.map((item) => <option key={`${item.geoKind}:${item.name}`} value={item.geoKind === 'region' ? `region:${item.name}` : item.name}>{item.name} · {item.count}</option>)}
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Дата</span>
                <DateFilterDropdown date={date} customDate={customDate} facets={(pageData || data)?.facets.dates} onDateChange={setDateFilter} onCustomDateChange={setCustomDateFilter} options={dateOptions} seasonal={seasonal} />
              </label>
              {isFamily ? <label className={styles.mobileFilterField}>
                <span>Возраст</span>
                <select value={ageLimit} onChange={(event) => setAgeLimit(event.target.value)}>
                  <option value="">Любой возраст</option>
                  {((pageData || data)?.facets.ages || []).map((item) => { const value = item.value || item.name || ''; return <option key={value} value={value}>{value}</option>; })}
                </select>
              </label> : null}
              {!seasonal ? <label className={styles.mobileFilterField}>
                <span>Наличие</span>
                <select value={availableOnly ? 'available' : 'all'} onChange={(event) => setAvailableOnly(event.target.value === 'available')}>
                  <option value="all">Не важно</option><option value="available">Есть места</option>
                </select>
              </label> : null}
              <label className={styles.mobileFilterField}>
                <span>Формат</span>
                <select value={format} onChange={(event) => setFormat(event.target.value)}>
                  {formats.map((item) => { const value = item.name || 'Все форматы'; return <option key={value} value={value} disabled={item.count === 0 && format !== value}>{value === 'Все форматы' ? allFormatsLabel : value}</option>; })}
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Цена</span>
                <select value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}>
                  {PRICE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>
        {showFloatingFilters ? <button type="button" className={styles.floatingFiltersButton} onClick={() => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span aria-hidden="true">☷</span> Фильтры{activeFilterCount ? <b>{activeFilterCount}</b> : null}
        </button> : null}

        <div className={styles.content}>
          <div className={styles.toolbar}>
          <div className={styles.count}>{loading && !pageData ? 'Обновляем выборку…' : loadError || errorMessage ? 'Выборка не обновлена' : <>Найдено <strong>{pageData?.total || 0}</strong> {pluralRu(pageData?.total || 0, eventForms)} (показано <strong>{pageData?.items.length || 0}</strong>)</>}</div>
            {hasFilters ? <button type="button" className={styles.reset} onClick={resetFilters}>Сбросить фильтры</button> : null}
          </div>

          {hasFilters ? <div className={styles.activeBar}>
            <span className={styles.activeDot} />{activeFilterSummary !== 'Все мероприятия' ? <span className={styles.activeText}>{activeFilterSummary}</span> : null}
            {geographySummary ? <button type="button" className={styles.activeCity} onClick={selectAllGeography} aria-label={`Сбросить фильтр: ${geographySummary}`}>{geographySummary}</button> : null}
          </div> : null}

          {errorMessage ? <div role="alert" className={styles.empty}><div className={styles.emptyTitle}>Не удалось загрузить афишу</div><div className={styles.emptyText}>{errorMessage}</div><button type="button" className={styles.reset} onClick={() => window.location.reload()}>Попробовать снова</button></div> : null}
          {loadError ? <div role="alert" className={styles.empty}><div className={styles.emptyTitle}>Не удалось обновить список</div><div className={styles.emptyText}>Для выбранных фильтров не загрузились свежие результаты. Предыдущие карточки скрыты, чтобы не показывать события из другой выборки.</div><button type="button" className={styles.reset} onClick={() => { setLoadError(null); setRetryToken((value) => value + 1); }}>Повторить</button></div> : null}
          {pageData?.items.length ? <>
          {viewMode === 'list' ? <div className={styles.tableHeader} aria-hidden="true"><span>Дата и время</span><span>Мероприятие</span><span>Площадка</span><span>Цена</span><span>Наличие мест</span><span /></div> : null}
          <div className={`${styles.list} ${viewMode === 'cards' ? styles.cardsView : ''} ${styles.mobileRows}`} aria-busy={loading || loadingMore}>
            {pageData.items.map((event) => {
              const slot = event.upcomingSlots?.[0];
              const priceLabel = typeof event.priceFrom === 'number' ? event.priceFrom === 0 ? 'Бесплатно' : `от ${new Intl.NumberFormat('ru-RU').format(event.priceFrom)} ₽` : 'Цена уточняется';
              const slots = event.upcomingSlots || [];
              const timeZone = resolveSessionTimeZone(event);
              const slotDate = slot ? formatShortDate(slot, timeZone) : null;
              return <article key={event.groupKey || event.eventPageSlug || event.id} className={styles.row} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`Подробнее: ${event.title}`} onClick={(clickEvent) => {
                if ((clickEvent.target as HTMLElement).closest('a, button, details, summary')) return;
                setSelectedEvent(event);
              }} onKeyDown={(keyEvent) => {
                if (keyEvent.target !== keyEvent.currentTarget || (keyEvent.key !== 'Enter' && keyEvent.key !== ' ')) return;
                keyEvent.preventDefault();
                setSelectedEvent(event);
              }}>
                <div className={styles.rowDate}>{slotDate ? <><strong>{slotDate.day}</strong>{slotDate.rest ? <small>{slotDate.rest}</small> : null}{slotDate.time ? <small>{slotDate.time}</small> : null}<span className={styles.rowDateCompact}>{slotDate.compact}{slotDate.time ? <> <span aria-hidden="true">·</span> <time dateTime={slot?.startsAt || undefined}>{slotDate.time}</time></> : null}</span></> : 'Дата уточняется'}</div>
                <div className={styles.rowMain}>
                  <div className={styles.rowTitle} title={event.title}>{event.title}</div>
                <div className={styles.rowMeta}>{city === 'Вся Россия' && event.city ? <span className={styles.rowCity}>{event.city}</span> : null}{city !== 'Вся Россия' && event.city ? <span className={styles.rowCityMobile}>{event.city}</span> : null}{eventBadges(event, theme).map((badge) => <span key={badge.id} className={`${styles.tag} ${badge.className}`}>{badge.label}</span>)}{!seasonal && event.ageLimit ? <span className={`${styles.tag} ${styles.tagAge}`}>{event.ageLimit}</span> : null}<span className={`${styles.rowVenue} ${styles.rowVenueInline}`}>{event.venue || 'Площадка уточняется'}</span></div>
                  {slots.length > 1 ? <details className={styles.schedule}><summary><span className={styles.scheduleDesktopLabel}>Расписание · </span><span className={styles.scheduleCompactLabel}>{slots.length} {pluralRu(slots.length, PLURAL_SESSION_FORMS)}</span></summary><ul className={styles.scheduleList}>{slots.map((item, index) => { const itemUrls = previewSlotPurchaseUrls(event, item); return <li className={styles.scheduleItem} key={item.id || `${event.id}:${item.startsAt}:${index}`}><span>{formatSlot(item, timeZone)}</span>{itemUrls.map((itemUrl, urlIndex) => <PreviewPurchaseButton key={`${itemUrl}:${urlIndex}`} event={{ ...event, widgetUrl: null, purchaseUrl: itemUrl, upcomingSlots: [{ ...item, purchaseUrl: itemUrl, purchaseUrls: undefined }] }} className={styles.scheduleBuy} label="Билет на этот сеанс" />)}{!itemUrls.length ? <span className={styles.drawerScheduleUnavailable}>Ссылка покупки недоступна</span> : null}</li>; })}</ul></details> : null}
                </div>
                <div className={styles.rowVenueColumn}>{event.venue || 'Площадка не указана'}</div>
                <div className={styles.rowPrice}>{priceLabel}{typeof event.priceFrom === 'number' && event.priceFrom === 0 ? <small className={styles.freePrice}>вход свободный</small> : <small>за билет</small>}</div>
                <div className={`${styles.rowSeats} ${typeof event.vacant === 'number' && event.vacant <= 8 ? styles.rowSeatsLow : ''}`}>{typeof event.vacant === 'number' ? `${event.vacant} ${pluralRu(event.vacant, PLURAL_SEAT_FORMS)}` : ''}</div>
                <div className={styles.rowAction}><PreviewPurchaseButton event={event} className={styles.buyButton} /></div>
              </article>;
            })}
          </div></> : loading && !errorMessage && !loadError ? <div className={styles.empty}><div className={styles.emptyTitle}>Обновляем список</div><div className={styles.emptyText}>Применяем выбранные фильтры.</div></div> : !errorMessage && !loadError ? <div className={styles.empty}><div className={styles.emptyTitle}>Под фильтры ничего не подошло</div><div className={styles.emptyText}>Сбросьте часть условий или выберите другой город.</div></div> : null}

          {pageData?.hasMore ? <div className={`${styles.moreArea} ${mobileAutoLoad ? styles.mobileAutoLoad : ''}`}>
            <button type="button" className={styles.moreButton} onClick={() => void loadMore()} disabled={loadingMore || loading}>{loadingMore ? 'Загружаем…' : `Показать ещё ${Math.min(pageData.limit, pageData.total - pageData.items.length)}`}</button>
            <div ref={loadMoreSentinelRef} className={styles.loadMoreSentinel} aria-hidden="true" />
          </div> : null}
          {loadMoreError ? <div role="alert" className={styles.empty}><div className={styles.emptyTitle}>Следующая часть списка не загрузилась</div><div className={styles.emptyText}>{loadMoreError}</div><button type="button" className={styles.reset} onClick={() => void loadMore()} disabled={loadingMore}>Повторить</button></div> : null}
          {loadingMore ? <p className={styles.loading} role="status">Загружаем следующие мероприятия…</p> : null}
        </div>
        </div>
        </div>

        {selectedEvent ? (() => {
          const selectedSlots = selectedEvent.upcomingSlots || [];
          const selectedPrice = typeof selectedEvent.priceFrom === 'number'
            ? selectedEvent.priceFrom === 0 ? 'Бесплатно' : `от ${new Intl.NumberFormat('ru-RU').format(selectedEvent.priceFrom)} ₽`
            : 'Цена уточняется';
          const selectedHref = selectedEvent.eventPageSlug || selectedEvent.slug;
          const selectedDescription = shortEventDescription(selectedEvent.description);
          return <div className={styles.drawer} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedEvent(null); }}>
            <section className={styles.drawerPanel} role="dialog" aria-modal="true" aria-labelledby="selected-event-title">
              <header className={styles.drawerHead}>
                <div className={styles.drawerHeading}>
                  <div className={styles.drawerKicker}>{selectedEvent.city || 'Город уточняется'} · {seasonal ? resolvePreviewFormat(selectedEvent) : resolveThematicFormats(selectedEvent, theme)[0]}</div>
                  <h2 id="selected-event-title" className={styles.drawerTitle}>{selectedEvent.title}</h2>
                </div>
                <button type="button" className={styles.drawerClose} onClick={() => setSelectedEvent(null)} aria-label="Закрыть подробности">×</button>
              </header>
              <div className={styles.drawerBody}>
                {selectedDescription ? <p className={styles.drawerDescription}>{selectedDescription}</p> : null}
                <dl className={styles.drawerFacts}>
                  <dt>Город</dt><dd>{selectedEvent.city || 'Уточняется'}</dd>
                  <dt>Площадка</dt><dd>{selectedEvent.venue || 'Уточняется'}</dd>
                  <dt>Ближайший сеанс</dt><dd>{selectedSlots[0] ? formatSlot(selectedSlots[0], resolveSessionTimeZone(selectedEvent)) : 'Дата уточняется'}</dd>
                  <dt>Цена</dt><dd>{selectedPrice}</dd>
                  {typeof selectedEvent.vacant === 'number' ? <><dt>Доступность</dt><dd>{selectedEvent.vacant === 0 ? 'Наличие уточняется у оператора' : `${selectedEvent.vacant} ${pluralRu(selectedEvent.vacant, PLURAL_SEAT_FORMS)} по данным каталога`}</dd></> : null}
                </dl>
                <div className={styles.drawerScheduleTitle}>Расписание · {selectedSlots.length} {selectedSlots.length === 1 ? 'сеанс' : selectedSlots.length < 5 ? 'сеанса' : 'сеансов'}</div>
                <ul className={styles.drawerSchedule}>
                  {selectedSlots.map((item, index) => {
                    const urls = previewSlotPurchaseUrls(selectedEvent, item);
                    return <li key={item.id || `${selectedEvent.id}:${item.startsAt}:${index}`}>
                      <span>{formatSlot(item, resolveSessionTimeZone(selectedEvent))}</span>
                      {urls.map((url, urlIndex) => <PreviewPurchaseButton key={`${url}:${urlIndex}`} event={{ ...selectedEvent, widgetUrl: null, purchaseUrl: url, upcomingSlots: [{ ...item, purchaseUrl: url, purchaseUrls: undefined }] }} className={styles.drawerScheduleBuy} label="Билет на этот сеанс" />)}
                      {!urls.length ? <span className={styles.drawerScheduleUnavailable}>Ссылка покупки недоступна</span> : null}
                    </li>;
                  })}
                </ul>
                {selectedHref ? <Link className={styles.eventPageLink} href={`/events/${encodeURIComponent(selectedHref)}`}>Открыть страницу мероприятия</Link> : null}
              </div>
              <footer className={styles.drawerFoot}>
                <div className={styles.drawerPrice}>{selectedPrice}<small>по данным каталога</small></div>
                <PreviewPurchaseButton event={selectedEvent} className={styles.buyButton} />
              </footer>
            </section>
          </div>;
        })() : null}

        {seasonal ? <section className={`${styles.wrap} ${styles.guide}`} aria-labelledby="new-year-guide-title">
          {seoContentParagraphs.length ? <>
            <h2 id="new-year-guide-title">{seoContentHeading}</h2>
            <div className={styles.editorialCopy}>{seoContentParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          </> : null}
          {guideSections.map((section) => <section className={styles.guideSection} key={section.heading}>
            <h3>{section.heading}</h3>
            <p>{section.text}</p>
          </section>)}
          {guideLinks.length ? <nav className={styles.guideLinks} aria-label={city === 'Вся Россия' ? 'Новогодние подборки городов' : `Места и страницы города ${city}`}>
            {guideLinks.map((item) => <Link href={`https://daibilet.ru${item.href}`} key={item.href} target="_blank" rel="noreferrer">
              <strong>{item.title}</strong><span>{item.note}</span>
            </Link>)}
          </nav> : null}
          {city === 'Вся Россия' && !region && regions.length ? <section className={styles.regionExplorer} aria-labelledby="new-year-regions-title">
            <h2 id="new-year-regions-title">Новогодние события по областям и краям</h2>
            <p>Выберите регион, чтобы увидеть афишу его городов. Перечень и счётчики обновляются вместе с доступными событиями каталога.</p>
            <div className={styles.regionChips}>{regions.filter((item) => item.name && item.count > 0).map((item) => <button key={item.name} type="button" className={styles.regionChip} onClick={() => selectRegion(item.name!)}>
              <span>{item.name}</span><b>{item.count}</b>
            </button>)}</div>
          </section> : null}
          {faqItems.length ? <>
            <h2 className={styles.faqTitle}>Вопросы о прогулках по городу</h2>
            <div className={styles.faq}>
              {faqItems.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
            </div>
          </> : null}
        </section> : null}

        {seasonal ? <footer className={`${styles.wrap} ${styles.footerNote}`}>
          <span>Предпросмотр на данных каталога от {generatedLabel} · записей: {data?.sourceTotal || 0}</span>
          <span>В список входят новогодние программы с доступными сеансами начиная с 1 декабря 2026 года · праздничный период: 23 декабря - 14 января</span>
        </footer> : null}
    </div>
  );
}
