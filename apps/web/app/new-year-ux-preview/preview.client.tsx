'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fontInter, fontUnbounded } from '@/lib/fonts';
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
import { resolvePreviewFormat } from './preview-format';
import { getNewYearRegionGuide, NEW_YEAR_CITY_GUIDES, NEW_YEAR_NATIONAL_GUIDE } from './new-year-guide-content';
import styles from './preview.module.css';

type DateFilter = 'all' | 'dec24to31' | 'dec31' | 'jan1' | 'jan1to14' | 'weekend' | 'holidays' | 'custom';
type PriceFilter = 'all' | 'free' | 'under1000' | 'under2000' | 'over2000' | 'over5000' | 'over10000';
type PreviewFilters = { city: string; region: string; date: DateFilter; customDate: string; price: PriceFilter; format: string; q: string; sort: 'date' | 'price' | 'price-desc'; lowStock: boolean };
type Facet = { name?: string; value?: string; count: number; region?: string; filterable?: boolean; geoKind?: 'city' | 'region' };
const FIRST_SEASON_DATE = '2026-12-01';
const NEW_YEAR_EVENT_FORMS = ['мероприятие', 'мероприятия', 'мероприятий'] as const;
const PLURAL_SESSION_FORMS = ['сеанс', 'сеанса', 'сеансов'] as const;
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
  facets: { cities: Facet[]; regions: Facet[]; dates: Facet[]; prices: Facet[]; formats: Facet[]; lowStock: number };
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

function isCustomDate(value?: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < FIRST_SEASON_DATE) return false;
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

function eventBadges(event: PreviewEvent): EventBadge[] {
  const subcategory = taxonomyTitle(event.catalogSubcategory);
  const catalogCategory = taxonomyTitle(event.catalogCategory);
  const labels = [subcategory, ...(event.tagLabels || []), ...(event.subcategories || []), ...(event.tags || [])].filter((label): label is string => Boolean(label));
  const text = [event.title, event.category, catalogCategory, ...labels].join(' ').toLocaleLowerCase('ru');
  const isStandUp = /stand\s*[- ]?up|стендап/.test(text);
  const isExcursion = /экскурс/.test(`${event.category || ''} ${catalogCategory} ${subcategory}`.toLocaleLowerCase('ru'));
  const typeBadge = isStandUp
    ? { id: 'stand-up', label: 'Шоу', className: styles.tagShow }
    : isExcursion
      ? { id: 'tour', label: 'Экскурсия', className: styles.tagTour }
      : [
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

function hasSlotSpecificPurchaseUrl(slot: NonNullable<PreviewEvent['upcomingSlots']>[number]): boolean {
  return [slot.purchaseUrl, ...(slot.purchaseUrls || [])].some((url) => Boolean(safeExternalUrl(url)));
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
  if (filters.date !== 'all') params.set('date', filters.date === 'custom' ? filters.customDate : filters.date);
  if (filters.price !== 'all') params.set('price', filters.price);
  if (filters.format !== 'Все форматы') params.set('format', filters.format);
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.sort !== 'date') params.set('sort', filters.sort);
  if (filters.lowStock) params.set('lowStock', '1');
  return params.toString();
}

function getFacetCount(facets: Facet[] | undefined, value: string): number {
  return facets?.find((facet) => (facet.value || facet.name) === value)?.count || 0;
}

function formatCustomDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function DatePickerChip({ date, customDate, onChange }: { date: DateFilter; customDate: string; onChange: (value: string) => void }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else { picker.focus(); picker.click(); }
  };
  return <span className={`${styles.datePickerWrap} ${date === 'custom' ? styles.datePickerChipActive : ''}`}>
    <button type="button" className={`${styles.chip} ${styles.datePickerChip}`} onClick={openPicker} aria-label="Выбрать дату мероприятия">
      {date === 'custom' && customDate ? formatCustomDate(customDate) : 'Выбрать дату'}
    </button>
    <input ref={pickerRef} className={styles.datePickerInput} type="date" min={FIRST_SEASON_DATE} aria-label="Дата мероприятия" value={customDate} onChange={(event) => onChange(event.target.value)} />
  </span>;
}

function DateFilterDropdown({
  date,
  customDate,
  facets,
  onDateChange,
  onCustomDateChange,
}: {
  date: DateFilter;
  customDate: string;
  facets: Facet[] | undefined;
  onDateChange: (value: DateFilter) => void;
  onCustomDateChange: (value: string) => void;
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
      {DATE_OPTIONS.map((item) => <option key={`dropdown-date:${item.value}`} value={item.value} disabled={getFacetCount(facets, item.value) === 0 && date !== item.value}>{item.label}</option>)}
      <option value="custom">{customDate ? formatCustomDate(customDate) : 'Выбрать дату…'}</option>
    </select>
    <input ref={pickerRef} className={styles.datePickerInput} type="date" min={FIRST_SEASON_DATE} aria-label="Выбрать дату мероприятия" value={customDate} onChange={(event) => onCustomDateChange(event.target.value)} />
  </span>;
}

function isCanonicalNewYearPath(pathname: string): boolean {
  return pathname === '/novyj-god' || pathname.startsWith('/novyj-god/');
}

function resolveGeoPath(pathname: string, facets?: PreviewData['facets']): { city: string; region: string } {
  const slug = normalizeKnownCitySlug(pathname.replace(/\/$/u, '').split('/').at(-1));
  if (!slug || !facets || pathname === '/novyj-god') return { city: 'Вся Россия', region: '' };
  const city = facets.cities.find((item) => item.name && item.name !== 'Вся Россия' && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === slug);
  if (city?.name) return { city: city.name, region: '' };
  const region = facets.regions.find((item) => item.name && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === slug);
  return region?.name ? { city: 'Вся Россия', region: region.name } : { city: 'Вся Россия', region: '' };
}

function publicGeoPath(city: string, region: string): string {
  if (city !== 'Вся Россия') return landingCategoryHref('new-year', cityToSlug({ name: city }));
  if (region) return landingCategoryHref('new-year', cityToSlug({ name: region }));
  return landingCategoryHref('new-year');
}

export function NewYearUxPreview({
  initialData,
  initialCity = null,
  initialRegion = null,
  errorMessage,
}: {
  initialData: PreviewData | null;
  initialCity?: string | null;
  initialRegion?: string | null;
  errorMessage: string | null;
}) {
  const router = useRouter();
  const [festive, setFestive] = useState(true);
  const [data, setData] = useState<PreviewData | null>(initialData);
  const [loadedFilterQuery, setLoadedFilterQuery] = useState(() =>
    initialCity || initialRegion
      ? serializeFilters({ city: initialCity || 'Вся Россия', region: initialRegion || '', date: 'all', customDate: '', price: 'all', format: 'Все форматы', q: '', sort: 'date', lowStock: false })
      : '',
  );
  const [region, setRegion] = useState(() => initialRegion || '');
  const [city, setCity] = useState(() => initialCity || 'Вся Россия');
  const [customDate, setCustomDate] = useState('');
  const [date, setDate] = useState<DateFilter>('all');
  const [price, setPrice] = useState<PriceFilter>('all');
  const [format, setFormat] = useState('Все форматы');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PreviewFilters['sort']>('date');
  const [lowStock, setLowStock] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [citiesExpanded, setCitiesExpanded] = useState(false);
  const [heroVisibleGeoCount, setHeroVisibleGeoCount] = useState(5);
  const heroCitiesRef = useRef<HTMLDivElement>(null);
  const heroGeoMeasureRef = useRef<HTMLDivElement>(null);
  const heroMoreButtonRef = useRef<HTMLButtonElement>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileAutoLoad, setMobileAutoLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PreviewEvent | null>(null);
  const firstUrlSync = useRef(true);
  const filterRequestId = useRef(0);
  const loadMoreController = useRef<AbortController | null>(null);
  const loadMoreRequestId = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const filters = useMemo<PreviewFilters>(() => ({ city, region, date, customDate, price, format, q: query, sort, lowStock }), [city, region, date, customDate, price, format, query, sort, lowStock]);
  const filterQuery = useMemo(() => serializeFilters(filters), [filters]);
  const pageData = loadedFilterQuery === filterQuery ? data : null;

  useEffect(() => {
    const url = new URL(window.location.href);
    const isLandingUrl = isCanonicalNewYearPath(url.pathname);
    if (!isLandingUrl) {
      setCity(url.searchParams.get('city') || 'Вся Россия');
      setRegion(url.searchParams.get('region') || '');
    }
    setFestive(url.searchParams.get('festive') !== '0');
    const nextDate = url.searchParams.get('date') || 'all';
    setDate(DATE_OPTIONS.some((item) => item.value === nextDate) ? nextDate as DateFilter : isCustomDate(nextDate) ? 'custom' : 'all');
    setCustomDate(isCustomDate(nextDate) ? nextDate : '');
    const nextPrice = url.searchParams.get('price') || 'all';
    setPrice(PRICE_OPTIONS.some((item) => item.value === nextPrice) ? nextPrice as PriceFilter : 'all');
    setFormat(url.searchParams.get('format') || 'Все форматы');
    setQuery(url.searchParams.get('q') || '');
    const nextSort = url.searchParams.get('sort');
    setSort(nextSort === 'price' || nextSort === 'price-desc' ? nextSort : 'date');
    setLowStock(url.searchParams.get('lowStock') === '1');
  }, []);

  useEffect(() => {
    if (!citiesExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setCitiesExpanded(false);
      heroMoreButtonRef.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [citiesExpanded]);

  useEffect(() => {
    if (!initialCity && !initialRegion) return;
    setCity(initialCity || 'Вся Россия');
    setRegion(initialRegion || '');
    setData(initialData);
    setLoadedFilterQuery(serializeFilters({ city: initialCity || 'Вся Россия', region: initialRegion || '', date: 'all', customDate: '', price: 'all', format: 'Все форматы', q: '', sort: 'date', lowStock: false }));
  }, [initialCity, initialRegion, initialData]);

  useEffect(() => {
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
        const response = await fetch(`/api/new-year-ux-preview${filterQuery ? `?${filterQuery}` : ''}`, { signal: controller.signal, cache: 'no-store' });
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
  }, [filterQuery, query, loadedFilterQuery, retryToken]);

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
    if (firstUrlSync.current) { firstUrlSync.current = false; return; }
    const url = new URL(window.location.href);
    for (const key of ['city', 'region', 'date', 'price', 'format', 'q', 'sort', 'lowStock']) url.searchParams.delete(key);
    const isLandingUrl = isCanonicalNewYearPath(url.pathname);
    if (isLandingUrl) url.pathname = publicGeoPath(city, region);
    new URLSearchParams(filterQuery).forEach((value, key) => {
      if (isLandingUrl && (key === 'city' || key === 'region')) return;
      url.searchParams.set(key, value);
    });
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [filterQuery, city, region]);

  useEffect(() => {
    const syncLocation = () => {
      const url = new URL(window.location.href);
      const geo = isCanonicalNewYearPath(url.pathname)
        ? resolveGeoPath(url.pathname, data?.facets)
        : { city: url.searchParams.get('city') || 'Вся Россия', region: url.searchParams.get('region') || '' };
      setCity(geo.city);
      setRegion(geo.region);
      const nextDate = url.searchParams.get('date') || 'all';
      setFestive(url.searchParams.get('festive') !== '0');
      setDate(DATE_OPTIONS.some((item) => item.value === nextDate) ? nextDate as DateFilter : isCustomDate(nextDate) ? 'custom' : 'all');
      setCustomDate(isCustomDate(nextDate) ? nextDate : '');
      const nextPrice = url.searchParams.get('price') || 'all';
      setPrice(PRICE_OPTIONS.some((item) => item.value === nextPrice) ? nextPrice as PriceFilter : 'all');
      setFormat(url.searchParams.get('format') || 'Все форматы');
      setQuery(url.searchParams.get('q') || '');
      const nextSort = url.searchParams.get('sort');
      setSort(nextSort === 'price' || nextSort === 'price-desc' ? nextSort : 'date');
      setLowStock(url.searchParams.get('lowStock') === '1');
    };
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, [data?.facets]);

  const loadMore = useCallback(async () => {
    if (!pageData?.hasMore || loadingMore || loading) return;
    const controller = new AbortController();
    const requestId = ++loadMoreRequestId.current;
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const params = new URLSearchParams(filterQuery);
      params.set('offset', String(pageData.nextOffset ?? pageData.items.length));
      const response = await fetch(`/api/new-year-ux-preview?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
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
  }, [pageData, filterQuery, loadedFilterQuery, loading, loadingMore]);

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

  const cities = data?.facets.cities || [];
  const regions = data?.facets.regions || [];
  const formats = pageData?.facets.formats || [];
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
    ? ['Москва', 'Санкт-Петербург', 'Казань', 'Калининград']
    : [];
  const preferredCityOptions: Facet[] = featuredPriority.flatMap((name) => {
    const option = geoOptions.find((item) => item.name === name);
    return option ? [option] : [];
  });
  const orderedGeoOptions: Facet[] = [
    ...(allGeoOption ? [allGeoOption] : []),
    ...(normalizedCurrentGeoOption && normalizedCurrentGeoOption.name !== 'Вся Россия' ? [normalizedCurrentGeoOption] : []),
    ...preferredCityOptions,
    ...geoOptions.filter((item) => item.name !== 'Вся Россия' && item.name !== normalizedCurrentGeoOption?.name),
  ].filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index);
  const featuredGeoOptions = orderedGeoOptions.slice(0, heroVisibleGeoCount);
  const hiddenGeoOptions = orderedGeoOptions.slice(heroVisibleGeoCount);
  useEffect(() => {
    const container = heroCitiesRef.current;
    const measure = heroGeoMeasureRef.current;
    if (!container || !measure || citiesExpanded) return;
    const fitInTwoRows = () => {
      const availableWidth = container.clientWidth;
      const chips = Array.from(measure.children).slice(0, orderedGeoOptions.length) as HTMLElement[];
      const more = measure.children[orderedGeoOptions.length] as HTMLElement | undefined;
      const gap = Number.parseFloat(getComputedStyle(measure).columnGap) || 0;
      const rowsFor = (count: number, withMore: boolean) => {
        const widths = chips.slice(0, count).map((item) => item.getBoundingClientRect().width);
        if (withMore && more) widths.push(more.getBoundingClientRect().width);
        let rows = 1;
        let rowWidth = 0;
        for (const width of widths) {
          if (rowWidth && rowWidth + gap + width > availableWidth) {
            rows++;
            rowWidth = width;
          } else {
            rowWidth += (rowWidth ? gap : 0) + width;
          }
        }
        return rows;
      };
      let visible = orderedGeoOptions.length;
      if (rowsFor(visible, false) > 2) {
        visible = 0;
        for (let count = orderedGeoOptions.length - 1; count >= 0; count--) {
          if (rowsFor(count, true) <= 2) { visible = count; break; }
        }
      }
      setHeroVisibleGeoCount((current) => current === visible ? current : visible);
    };
    fitInTwoRows();
    const observer = new ResizeObserver(fitInTwoRows);
    observer.observe(container);
    return () => observer.disconnect();
  }, [orderedGeoOptions.map((item) => `${item.name}:${item.count}`).join('|'), citiesExpanded]);
  const currentDateLabel = date === 'custom' && customDate ? formatCustomDate(customDate) : DATE_OPTIONS.find((item) => item.value === date)?.label;
  const currentPriceLabel = PRICE_OPTIONS.find((item) => item.value === price)?.label;
  const hasFilters = Boolean((city !== 'Вся Россия' || region) || query.trim() || date !== 'all' || price !== 'all' || format !== 'Все форматы' || lowStock);
  const activeFilterCount = [city !== 'Вся Россия' || Boolean(region), date !== 'all', price !== 'all', format !== 'Все форматы', Boolean(query.trim()), lowStock].filter(Boolean).length;
  const geographySummary = [city !== 'Вся Россия' ? city : '', region].filter(Boolean).join(', ');
  const activeFilterSummary = [query.trim() ? `«${query.trim()}»` : '', geographySummary, date !== 'all' ? currentDateLabel : '', price !== 'all' ? currentPriceLabel : '', format !== 'Все форматы' ? format : '', lowStock ? 'мало мест' : ''].filter(Boolean).join(' · ') || 'Все мероприятия';
  const cityPrepositional = city === 'Вся Россия' ? null : resolveCityCases(city).prepositional;
  const placeLabel = city !== 'Вся Россия' && region
    ? `в ${cityPrepositional || city}, регион «${region}»`
    : city !== 'Вся Россия'
      ? `в ${cityPrepositional || city}`
      : region
        ? `в населённых пунктах региона «${region}»`
        : 'в городах России';
  const cityGuide = city === 'Вся Россия' ? null : NEW_YEAR_CITY_GUIDES[city] || null;
  const cityEditorial = useMemo(() => city === 'Вся Россия' ? null : resolveSeoListingText('new-year', cityToSlug({ name: city })), [city]);
  const liveCityFormats = formats.filter((item) => item.name && item.name !== 'Все форматы' && item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const liveCityHighlights = (pageData?.items || []).slice(0, 3).map((event) => event.title).filter(Boolean);
  const dynamicCityParagraph = pageData && city !== 'Вся Россия' && !cityGuide && pageData.total > 0
    ? `В новогодней афише ${city} сейчас ${pageData.total} ${pluralRu(pageData.total, NEW_YEAR_EVENT_FORMS)}. В каталоге представлены форматы: ${liveCityFormats.length ? liveCityFormats.map((item) => `${item.name!.toLocaleLowerCase('ru')} (${item.count})`).join(', ') : 'праздничные программы'}.${liveCityHighlights.length ? ` Среди ближайших вариантов: ${liveCityHighlights.map((title) => `«${title}»`).join('; ')}.` : ''}`
    : null;
  const seoContentHeading = cityGuide?.heading || (region && city === 'Вся Россия' ? `Новогодние события: ${region}` : city === 'Вся Россия' ? NEW_YEAR_NATIONAL_GUIDE.heading : cityEditorial?.heading || `Новогодняя афиша ${placeLabel}`) || 'Новогодние мероприятия';
  const seoContentParagraphs = cityGuide
    ? [cityGuide.intro]
    : region && city === 'Вся Россия'
      ? [getNewYearRegionGuide(region)]
    : city === 'Вся Россия'
      ? [NEW_YEAR_NATIONAL_GUIDE.intro]
      : cityEditorial
        ? splitSeoListingParagraphs(cityEditorial.body)
        : dynamicCityParagraph ? [dynamicCityParagraph] : [];
  const guideSections = cityGuide?.sections || [];
  const regionCityNames = new Set((pageData?.facets.cities || []).filter((item) => item.region === region && item.name).map((item) => item.name!));
  const regionGuideLinks = NEW_YEAR_NATIONAL_GUIDE.cities.filter((item) => regionCityNames.has(item.title));
  const guideLinks = cityGuide?.recommendations || (city === 'Вся Россия' ? region ? regionGuideLinks : NEW_YEAR_NATIONAL_GUIDE.cities : []);
  const faqItems = cityGuide?.faq || [];
  const navigateGeo = (nextCity: string, nextRegion: string) => {
    const current = new URL(window.location.href);
    if (!isCanonicalNewYearPath(current.pathname)) return;
    current.pathname = publicGeoPath(nextCity, nextRegion);
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
    const href = isRegion ? publicGeoPath('Вся Россия', item.name) : item.name === 'Вся Россия' ? publicGeoPath('Вся Россия', '') : publicGeoPath(item.name, '');
    return <Link
      key={`${isRegion ? 'region' : 'city'}:${item.name}`}
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        setCitiesExpanded(false);
        if (isRegion) selectRegion(item.name!);
        else if (item.name === 'Вся Россия') selectAllGeography();
        else selectCity(item.name!);
      }}
    >{label}</Link>;
  };
  const generatedLabel = pageData?.generatedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(new Date(pageData.generatedAt)) : 'не указано';

  const setDateFilter = (value: DateFilter) => {
    setDate(value);
    if (value !== 'custom') setCustomDate('');
  };
  const setCustomDateFilter = (value: string) => {
    if (!isCustomDate(value)) return;
    setCustomDate(value);
    setDate('custom');
  };
  const resetFilters = () => {
    const current = new URL(window.location.href);
    if (isCanonicalNewYearPath(current.pathname)) {
      for (const key of ['city', 'region', 'date', 'price', 'format', 'q', 'sort', 'lowStock']) current.searchParams.delete(key);
      current.pathname = publicGeoPath('Вся Россия', '');
      router.push(`${current.pathname}${current.search}${current.hash}`, { scroll: false });
    }
    setCity('Вся Россия');
    setRegion('');
    setQuery('');
    setDateFilter('all');
    setPrice('all');
    setFormat('Все форматы');
    setLowStock(false);
    setSort('date');
    setViewMode('list');
  };
  const copyFiltersLink = async () => {
    const url = new URL(window.location.href);
    for (const key of ['city', 'region', 'date', 'price', 'format', 'q', 'sort', 'lowStock']) url.searchParams.delete(key);
    const isLandingUrl = isCanonicalNewYearPath(url.pathname);
    if (isLandingUrl) url.pathname = publicGeoPath(city, region);
    new URLSearchParams(filterQuery).forEach((value, key) => {
      if (isLandingUrl && (key === 'city' || key === 'region')) return;
      url.searchParams.set(key, value);
    });
    if (!festive) url.searchParams.set('festive', '0');
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setLoadError('Не удалось скопировать ссылку из браузера.');
    }
  };

  return (
    <div className={`${styles.page} ${fontInter.variable} ${fontUnbounded.variable} ${festive ? styles.festive : ''}`} data-newyear-preview>
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
                  setFiltersExpanded(true);
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
            {region || city !== 'Вся Россия' ? <><Link href="/novyj-god">Новый год</Link><span aria-hidden="true">/</span><span className={styles.bandCrumbCurrent}>{region || city}</span></> : <span className={styles.bandCrumbCurrent} aria-current="page">Новый год</span>}
            <div className={styles.heroDesktopNav} aria-label="Основная навигация">
              <Link href="/events">Афиша</Link>
              <Link href="/cities">Город</Link>
              <Link href="/podborki">Подборки</Link>
              <Link href="/blog">Блог</Link>
            </div>
          </nav>
          <h1 className={styles.title}>Новый год 2027 в {region ? resolveCityCases(region).prepositional || `регионе «${region}»` : cityPrepositional || 'России'}:<br className={styles.titleBreak} /> мероприятия, афиша и билеты</h1>
          <p className={`${styles.lead} ${styles.leadDesktop}`}>Новогодние праздники — отличный повод выбраться из дома, провести время с близкими или отправиться в небольшое путешествие. На этой странице собраны праздничные концерты, спектакли, детские ёлки, экскурсии и развлекательные программы в разных городах России. Выбирайте интересующие даты, сравнивайте мероприятия и находите подходящий вариант для всей семьи или компании друзей.</p>
          <p className={`${styles.lead} ${styles.leadMobile}`}>Новогодние концерты, спектакли, детские ёлки, экскурсии и праздничные программы по всей России. Выбирайте города, даты и подходящие мероприятия.</p>
          <div className={styles.bandMeta}>
            <span><strong>{data?.total || 0}</strong> {pluralRu(data?.total || 0, NEW_YEAR_EVENT_FORMS)}</span>
            {(() => { const count = Math.max(0, cities.filter((item) => item.name !== 'Вся Россия' && item.count > 0).length); return <span>{count} {pluralRu(count, ['город', 'города', 'городов'])} с событиями</span>; })()}
            <span>{data?.priceFrom != null ? `от ${new Intl.NumberFormat('ru-RU').format(data.priceFrom)} рублей` : 'Цена уточняется'}</span>
          </div>
          <div ref={heroCitiesRef} className={styles.heroCities} aria-label="Выбрать город или регион">
            {featuredGeoOptions.map(renderGeoChip)}
            {citiesExpanded ? hiddenGeoOptions.map(renderGeoChip) : null}
            {hiddenGeoOptions.length ? <button
                type="button"
                ref={heroMoreButtonRef}
                className={`${styles.heroCityChip} ${styles.heroMoreButton}`}
                aria-expanded={citiesExpanded}
                onClick={() => setCitiesExpanded((value) => !value)}
            >{citiesExpanded ? 'Свернуть ↑' : `Ещё ${hiddenGeoOptions.length} ↓`}</button> : null}
            <div ref={heroGeoMeasureRef} className={styles.heroGeoMeasure} aria-hidden="true">
              {orderedGeoOptions.map((item) => <span key={`measure:${item.geoKind}:${item.name}`} className={styles.heroCityChip}><span>{item.name}</span><b>{item.count}</b></span>)}
              <span className={`${styles.heroCityChip} ${styles.heroMoreButton}`}>Ещё {orderedGeoOptions.length} ↓</span>
            </div>
          </div>
          </div>
        </section>

      <div className={styles.wrap}>
        <div className={styles.layout}>
        <section id="new-year-filters" className={styles.filters} aria-label="Фильтры мероприятий">
          <button type="button" className={styles.mobileFilterToggle} aria-expanded={filtersExpanded} aria-controls="new-year-filter-controls" onClick={() => setFiltersExpanded(!filtersExpanded)}>
            <span>Фильтры{activeFilterCount ? <b className={styles.mobileFilterCount}>{activeFilterCount}</b> : null}</span>
            <span className={`${styles.mobileFilterChevron} ${filtersExpanded ? styles.mobileFilterChevronOpen : ''}`} aria-hidden="true" />
          </button>
          <div id="new-year-filter-controls" className={`${styles.filtersContent} ${filtersExpanded ? '' : styles.filtersContentCollapsed}`}>
            <div className={styles.filterMain}>
              <label className={styles.search}>
                <span className="sr-only">Поиск по названию, площадке или городу</span>
                <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input className={styles.searchInput} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: ёлка, спектакль, город…" />
              </label>
              <div className={`${styles.segment} ${styles.segmentSort}`} role="group" aria-label="Сортировка">
                <button type="button" className={sort === 'date' ? styles.segmentActive : ''} onClick={() => setSort('date')}>По дате</button>
                <button type="button" className={sort === 'price' ? styles.segmentActive : ''} onClick={() => setSort('price')}>Дешевле</button>
                <button type="button" className={sort === 'price-desc' ? styles.segmentActive : ''} onClick={() => setSort('price-desc')}>Дороже</button>
              </div>
              <div className={`${styles.segment} ${styles.segmentDensity}`} role="group" aria-label="Вид мероприятий">
                <button type="button" className={viewMode === 'list' ? styles.segmentActive : ''} onClick={() => setViewMode('list')} aria-label="Показать списком" title="Список" aria-pressed={viewMode === 'list'}>▤</button>
                <button type="button" className={viewMode === 'cards' ? styles.segmentActive : ''} onClick={() => setViewMode('cards')} aria-label="Показать карточками" title="Карточки" aria-pressed={viewMode === 'cards'}>▥</button>
              </div>
              <button type="button" className={styles.linkButton} onClick={() => void copyFiltersLink()} aria-label="Скопировать ссылку на выбранные фильтры">{copiedLink ? 'Ссылка скопирована' : 'Скопировать и поделиться'}</button>
            </div>
            <div className={styles.desktopDropdowns} aria-label="Фильтры мероприятий">
              <div className={styles.desktopFilterField}>
                <DateFilterDropdown date={date} customDate={customDate} facets={data?.facets.dates} onDateChange={setDateFilter} onCustomDateChange={setCustomDateFilter} />
              </div>
              <label className={styles.desktopFilterField}>
                <span className="sr-only">Формат</span>
                <select aria-label="Формат" value={format} onChange={(event) => setFormat(event.target.value)}>
                  {formats.map((item) => { const value = item.name || 'Все форматы'; return <option key={`desktop-format:${value}`} value={value}>{value}</option>; })}
                </select>
              </label>
              <label className={styles.desktopFilterField}>
                <span className="sr-only">Цена</span>
                <select aria-label="Цена" value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}>
                  {PRICE_OPTIONS.map((item) => <option key={`desktop-price:${item.value}`} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className={styles.desktopFilterField}>
                <span className="sr-only">Наличие мест</span>
                <select aria-label="Наличие мест" value={lowStock ? 'low' : 'any'} onChange={(event) => setLowStock(event.target.value === 'low')}>
                  <option value="any">Наличие мест</option>
                  <option value="low" disabled={!data?.facets.lowStock && !lowStock}>Мало мест</option>
                </select>
              </label>
            </div>
            <div className={styles.mobileDropdowns}>
              <label className={styles.mobileFilterField}>
                <span>Дата</span>
                <DateFilterDropdown date={date} customDate={customDate} facets={data?.facets.dates} onDateChange={setDateFilter} onCustomDateChange={setCustomDateFilter} />
              </label>
              <label className={styles.mobileFilterField}>
                <span>Формат</span>
                <select value={format} onChange={(event) => setFormat(event.target.value)}>
                  {formats.map((item) => { const value = item.name || 'Все форматы'; return <option key={value} value={value} disabled={item.count === 0 && format !== value}>{value}</option>; })}
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Цена</span>
                <select value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}>
                  {PRICE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Наличие мест</span>
                <select value={lowStock ? 'low' : 'any'} onChange={(event) => setLowStock(event.target.value === 'low')}>
                  <option value="any">Наличие мест</option>
                  <option value="low" disabled={!data?.facets.lowStock && !lowStock}>Мало мест</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.count}>{loading && !pageData ? 'Обновляем выборку…' : loadError || errorMessage ? 'Выборка не обновлена' : <>Найдено <strong>{pageData?.total || 0}</strong> {pluralRu(pageData?.total || 0, NEW_YEAR_EVENT_FORMS)} (показано <strong>{pageData?.items.length || 0}</strong>)</>}</div>
            {hasFilters ? <button type="button" className={styles.reset} onClick={resetFilters}>Сбросить фильтры</button> : null}
          </div>

          {hasFilters ? <div className={styles.activeBar}>
            <span className={styles.activeDot} /><span className={styles.activeText}>{activeFilterSummary}</span>
            <span className={styles.activeCity}>{city === 'Вся Россия' ? 'Все города' : city}</span>
          </div> : null}

          {errorMessage ? <div role="alert" className={styles.empty}><div className={styles.emptyTitle}>Не удалось загрузить новогоднюю афишу</div><div className={styles.emptyText}>{errorMessage}</div><button type="button" className={styles.reset} onClick={() => window.location.reload()}>Попробовать снова</button></div> : null}
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
                  <div className={styles.rowMeta}>{city === 'Вся Россия' && event.city ? <span className={styles.rowCity}>{event.city}</span> : null}{city !== 'Вся Россия' && event.city ? <span className={styles.rowCityMobile}>{event.city}</span> : null}{eventBadges(event).map((badge) => <span key={badge.id} className={`${styles.tag} ${badge.className}`}>{badge.label}</span>)}<span className={`${styles.rowVenue} ${styles.rowVenueInline}`}>{event.venue || 'Площадка уточняется'}</span></div>
                  {slots.length > 1 ? <details className={styles.schedule}><summary><span className={styles.scheduleDesktopLabel}>Расписание · </span><span className={styles.scheduleCompactLabel}>{slots.length} {pluralRu(slots.length, PLURAL_SESSION_FORMS)}</span></summary><ul className={styles.scheduleList}>{slots.map((item, index) => { const itemUrls = previewSlotPurchaseUrls(event, item); return <li className={styles.scheduleItem} key={item.id || `${event.id}:${item.startsAt}:${index}`}><span>{formatSlot(item, timeZone)}</span>{itemUrls.map((itemUrl, urlIndex) => <PreviewPurchaseButton key={`${itemUrl}:${urlIndex}`} event={{ ...event, widgetUrl: null, purchaseUrl: itemUrl, upcomingSlots: [{ ...item, purchaseUrl: itemUrl, purchaseUrls: undefined }] }} className={styles.scheduleBuy} label={itemUrls.length > 1 ? `Билет на сеанс ${urlIndex + 1}` : hasSlotSpecificPurchaseUrl(item) ? 'Билет на этот сеанс' : 'Открыть билеты'} />)}{!itemUrls.length ? <span className={styles.drawerScheduleUnavailable}>Ссылка покупки недоступна</span> : null}</li>; })}</ul></details> : null}
                </div>
                <div className={styles.rowVenueColumn}>{event.venue || 'Площадка не указана'}</div>
                <div className={styles.rowPrice}>{priceLabel}{typeof event.priceFrom === 'number' && event.priceFrom === 0 ? <small className={styles.freePrice}>вход свободный</small> : <small>за билет</small>}</div>
                <div className={`${styles.rowSeats} ${typeof event.vacant === 'number' && event.vacant <= 8 ? styles.rowSeatsLow : ''}`}>{typeof event.vacant === 'number' ? `${event.vacant} мест` : ''}</div>
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
                  <div className={styles.drawerKicker}>{selectedEvent.city || 'Город уточняется'} · {resolvePreviewFormat(selectedEvent)}</div>
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
                  {typeof selectedEvent.vacant === 'number' ? <><dt>Доступность</dt><dd>{selectedEvent.vacant === 0 ? 'Наличие уточняется у оператора' : `${selectedEvent.vacant} мест по данным каталога`}</dd></> : null}
                </dl>
                <div className={styles.drawerScheduleTitle}>Расписание · {selectedSlots.length} {selectedSlots.length === 1 ? 'сеанс' : selectedSlots.length < 5 ? 'сеанса' : 'сеансов'}</div>
                <ul className={styles.drawerSchedule}>
                  {selectedSlots.map((item, index) => {
                    const urls = previewSlotPurchaseUrls(selectedEvent, item);
                    return <li key={item.id || `${selectedEvent.id}:${item.startsAt}:${index}`}>
                      <span>{formatSlot(item, resolveSessionTimeZone(selectedEvent))}</span>
                      {urls.map((url, urlIndex) => <PreviewPurchaseButton key={`${url}:${urlIndex}`} event={{ ...selectedEvent, widgetUrl: null, purchaseUrl: url, upcomingSlots: [{ ...item, purchaseUrl: url, purchaseUrls: undefined }] }} className={styles.drawerScheduleBuy} label={urls.length > 1 ? `Билет на сеанс ${urlIndex + 1}` : hasSlotSpecificPurchaseUrl(item) ? 'Купить билет на этот сеанс' : 'Открыть билеты'} />)}
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

        <section className={`${styles.wrap} ${styles.guide}`} aria-labelledby="new-year-guide-title">
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
        </section>

        <footer className={`${styles.wrap} ${styles.footerNote}`}>
          <span>Предпросмотр на данных каталога от {generatedLabel} · записей: {data?.sourceTotal || 0}</span>
          <span>В список входят новогодние программы с доступными сеансами начиная с 1 декабря 2026 года · праздничный период: 23 декабря - 14 января</span>
        </footer>
    </div>
  );
}
