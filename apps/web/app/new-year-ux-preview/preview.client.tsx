'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CheckoutModalButton } from '@/components/CheckoutModal.client';
import { TcWidgetButton, normalizeTcPurchaseUrl } from '@/components/TcWidget.client';
import { getTeplohodWidgetIdsFromSession, resolveTeplohodCheckoutUrl } from '@/components/TeplohodWidget.client';
import { extractTcEventIdFromSession } from '@/lib/event-purchase';
import { trackSelectTickets } from '@/lib/catalog-analytics';
import { resolveCityCases } from '@/lib/city-declension';
import { PLURAL_EVENT_FORMS, pluralRu } from '@/lib/format';
import { citySlug as cityToSlug } from '@/lib/routes';
import { resolveSeoListingText, splitSeoListingParagraphs } from '@/data/seo-listing-texts';
import type { PreviewEvent } from './preview-data';
import { resolvePreviewFormat } from './preview-format';
import { getNewYearRegionGuide, NEW_YEAR_CITY_GUIDES, NEW_YEAR_NATIONAL_GUIDE } from './new-year-guide-content';
import styles from './preview.module.css';

type DateFilter = 'all' | 'dec31' | 'jan1' | 'jan1to8' | 'weekend' | 'holidays' | 'custom';
type PriceFilter = 'all' | 'free' | 'under1000' | 'under2000' | 'over2000';
type PreviewFilters = { city: string; region: string; date: DateFilter; customDate: string; price: PriceFilter; format: string; q: string; sort: 'date' | 'price' | 'price-desc'; lowStock: boolean };
type Facet = { name?: string; value?: string; count: number; region?: string; filterable?: boolean };
const FIRST_SEASON_DATE = '2026-12-01';
const PLURAL_SESSION_FORMS = ['сеанс', 'сеанса', 'сеансов'] as const;
type PreviewData = {
  items: PreviewEvent[];
  total: number;
  sourceTotal: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  generatedAt: string | null;
  priceFrom: number | null;
  facets: { cities: Facet[]; regions: Facet[]; dates: Facet[]; prices: Facet[]; formats: Facet[]; lowStock: number };
};

const DATE_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Любая дата' },
  { value: 'dec31', label: '31 декабря' },
  { value: 'jan1', label: '1 января' },
  { value: 'jan1to8', label: '1–8 января' },
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
  { value: 'free', label: 'Бесплатно' },
  { value: 'under1000', label: 'до 1 000 ₽' },
  { value: 'under2000', label: 'до 2 000 ₽' },
  { value: 'over2000', label: 'от 2 000 ₽' },
];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSlot(slot: NonNullable<PreviewEvent['upcomingSlots']>[number]): string {
  const date = parseDate(slot.startsAt);
  if (!date) return [slot.dateLabel, slot.timeLabel].filter(Boolean).join(' · ') || 'Дата уточняется';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace(' г.', '');
}

function formatShortDate(slot: NonNullable<PreviewEvent['upcomingSlots']>[number]): { day: string; rest: string } {
  const date = parseDate(slot.startsAt);
  if (!date) return { day: slot.dateLabel || '—', rest: slot.timeLabel || '' };
  return {
    day: new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric' }).format(date),
    rest: new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date),
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
  const typeBadge = [
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
    ? <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>
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

export function NewYearUxPreview({ initialData, errorMessage }: { initialData: PreviewData | null; errorMessage: string | null }) {
  const searchParams = useSearchParams();
  const festive = searchParams.get('festive') !== '0';
  const [data, setData] = useState<PreviewData | null>(initialData);
  const [region, setRegion] = useState(() => searchParams.get('region') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || 'Вся Россия');
  const [customDate, setCustomDate] = useState(() => isCustomDate(searchParams.get('date')) ? searchParams.get('date')! : '');
  const [date, setDate] = useState<DateFilter>(() => {
    const value = searchParams.get('date');
    if (DATE_OPTIONS.some((item) => item.value === value)) return value as DateFilter;
    return isCustomDate(value) ? 'custom' : 'all';
  });
  const [price, setPrice] = useState<PriceFilter>(() => {
    const value = searchParams.get('price');
    return PRICE_OPTIONS.some((item) => item.value === value) ? value as PriceFilter : 'all';
  });
  const [format, setFormat] = useState(() => searchParams.get('format') || 'Все форматы');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [sort, setSort] = useState<PreviewFilters['sort']>(() => {
    const value = searchParams.get('sort');
    return value === 'price' || value === 'price-desc' ? value : 'date';
  });
  const [lowStock, setLowStock] = useState(() => searchParams.get('lowStock') === '1');
  const [compact, setCompact] = useState(false);
  const [citiesExpanded, setCitiesExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PreviewEvent | null>(null);
  const firstFilterEffect = useRef(true);
  const firstUrlSync = useRef(true);

  const filters = useMemo<PreviewFilters>(() => ({ city, region, date, customDate, price, format, q: query, sort, lowStock }), [city, region, date, customDate, price, format, query, sort, lowStock]);
  const filterQuery = useMemo(() => serializeFilters(filters), [filters]);

  useEffect(() => {
    if (firstFilterEffect.current) {
      firstFilterEffect.current = false;
      if (!filterQuery) return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/new-year-ux-preview${filterQuery ? `?${filterQuery}` : ''}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('preview request failed');
        setData(await response.json() as PreviewData);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setLoadError('Не удалось обновить выборку. Попробуйте ещё раз.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 180 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filterQuery, query]);

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
    new URLSearchParams(filterQuery).forEach((value, key) => url.searchParams.set(key, value));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [filterQuery]);

  const loadMore = useCallback(async () => {
    if (!data?.hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams(filterQuery);
      params.set('offset', String(data.items.length));
      const response = await fetch(`/api/new-year-ux-preview?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('pagination request failed');
      const next = await response.json() as PreviewData;
      setData((current) => current ? { ...next, items: [...current.items, ...next.items] } : next);
    } catch {
      setLoadError('Не удалось загрузить следующие события. Нажмите «Показать ещё».');
    } finally {
      setLoadingMore(false);
    }
  }, [data, filterQuery, loading, loadingMore]);

  const cities = data?.facets.cities || [];
  const regions = data?.facets.regions || [];
  const formats = data?.facets.formats || [];
  const allCityOptions = cities
    .filter((item) => item.name && item.name !== 'Вся Россия' && (item.filterable !== false || item.name === city))
    .sort((a, b) => b.count - a.count || (a.name || '').localeCompare(b.name || '', 'ru'));
  const orderedCities = [cities.find((item) => item.name === 'Вся Россия'), ...allCityOptions]
    .filter((item, index, list) => item && list.findIndex((candidate) => candidate?.name === item.name) === index) as Facet[];
  const geoOptions = [
    ...orderedCities,
    ...regions.map((item) => ({ ...item, region: item.name })),
  ];
  const visibleCityChips = citiesExpanded ? geoOptions : geoOptions.slice(0, 8);
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
  const liveCityHighlights = (data?.items || []).slice(0, 3).map((event) => event.venue ? `«${event.title}» на площадке «${event.venue}»` : `«${event.title}»`).filter(Boolean);
  const dynamicCityParagraph = city !== 'Вся Россия' && !cityGuide
    ? `В новогодней афише ${city} сейчас ${data?.total || 0} ${pluralRu(data?.total || 0, PLURAL_EVENT_FORMS)}. Среди опубликованных форматов: ${liveCityFormats.length ? liveCityFormats.map((item) => `${item.name!.toLocaleLowerCase('ru')} (${item.count})`).join(', ') : 'программы с доступными сеансами'}.${liveCityHighlights.length ? ` В текущей выдаче есть ${liveCityHighlights.join('; ')}.` : ''} Для небольших афиш это уже конкретная основа поездки; если предложений станет больше, примеры будут обновляться по каталогу. Даты, адреса и доступные сеансы сверяйте в карточках событий.`
    : null;
  const seoContentHeading = cityGuide?.heading || (region && city === 'Вся Россия' ? `Новогодние события: ${region}` : city === 'Вся Россия' ? NEW_YEAR_NATIONAL_GUIDE.heading : cityEditorial?.heading || `Новогодняя афиша ${placeLabel}`) || 'Новогодние мероприятия';
  const seoContentParagraphs = cityGuide
    ? [cityGuide.intro]
    : region && city === 'Вся Россия'
      ? [getNewYearRegionGuide(region)]
    : city === 'Вся Россия'
      ? [NEW_YEAR_NATIONAL_GUIDE.intro]
      : dynamicCityParagraph
        ? [dynamicCityParagraph]
        : cityEditorial ? splitSeoListingParagraphs(cityEditorial.body) : [];
  const guideSections = cityGuide?.sections || [];
  const guideLinks = cityGuide?.recommendations || (city === 'Вся Россия' ? NEW_YEAR_NATIONAL_GUIDE.cities : []);
  const faqItems = cityGuide?.faq || [];
  const selectCity = (value: string) => {
    setCity((current) => value !== 'Вся Россия' && current === value && !region ? 'Вся Россия' : value);
    setRegion('');
  };
  const selectAllGeography = () => { setCity('Вся Россия'); setRegion(''); };
  const selectRegion = (value: string) => {
    setRegion((current) => current === value ? '' : value);
    setCity('Вся Россия');
  };
  const generatedLabel = data?.generatedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(new Date(data.generatedAt)) : 'не указано';

  const setDateFilter = (value: DateFilter) => {
    setDate(value);
    if (value !== 'custom') setCustomDate('');
  };
  const setCustomDateFilter = (value: string) => {
    if (!isCustomDate(value)) return;
    setCustomDate(value);
    setDate('custom');
  };
  const resetFilters = () => { setCity('Вся Россия'); setRegion(''); setQuery(''); setDateFilter('all'); setPrice('all'); setFormat('Все форматы'); setLowStock(false); setSort('date'); setCompact(false); };
  const copyFiltersLink = async () => {
    const url = new URL(window.location.href);
    for (const key of ['city', 'region', 'date', 'price', 'format', 'q', 'sort', 'lowStock']) url.searchParams.delete(key);
    new URLSearchParams(filterQuery).forEach((value, key) => url.searchParams.set(key, value));
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
    <main className={`${styles.page} ${festive ? styles.festive : ''}`} data-newyear-preview>
      <section className={`${styles.band} ${festive ? styles.bandFestive : ''}`}>
          {festive ? <div className={styles.snowPattern} aria-hidden="true">
            <div className={styles.snowflakes}>{Array.from({ length: 12 }, (_, index) => <svg key={index} viewBox="0 0 48 48" className={styles.snowflake}><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M24 3v42M21 8l3 3 3-3M21 40l3-3 3 3M5.8 13.5l36.4 21M9 12.8l.7 4.2 4.2-.7M34.1 31.7l4.2-.7-.7 4.2M5.8 34.5l36.4-21M9 35.2l.7-4.2 4.2.7M34.1 16.3l4.2.7-.7-4.2" /></g><circle cx="24" cy="3" r="3.5" fill="#F5D977" /></svg>)}</div>
          </div> : null}
          <div className={`${styles.wrap} ${styles.bandContent}`}>
          <nav aria-label="Хлебные крошки" className={styles.bandCrumbs}>
            <Link href="/">Главная</Link><span>/</span><Link href="/podborki">Подборки</Link><span>/</span><Link href="/novyj-god">Новый год</Link>{region || city !== 'Вся Россия' ? <><span>/</span><span className={styles.bandCrumbCurrent}>{region || city}</span></> : null}
          </nav>
          <h1 className={styles.title}>Новый год 2027 в {cityPrepositional || 'России'}:<br />мероприятия, афиша и билеты</h1>
          <p className={styles.lead}>Ёлки, спектакли, концерты, экскурсии и праздничные программы.<br />Выберите город, дату и цену, чтобы сравнить расписание.</p>
          <div className={styles.bandMeta}>
            <span><strong>{data?.total || 0}</strong> мероприятий</span>
            {city === 'Вся Россия' ? <span>{Math.max(0, cities.filter((item) => item.name !== 'Вся Россия' && item.count > 0).length)} городов с событиями</span> : null}
            <span>{data?.priceFrom != null ? `от ${new Intl.NumberFormat('ru-RU').format(data.priceFrom)} ₽` : 'Цена уточняется'}</span>
          </div>
          <div className={styles.presets} aria-label="Быстрый выбор">
            <button type="button" className={`${styles.preset} ${date === 'dec31' ? styles.presetActive : ''}`} onClick={() => setDateFilter(date === 'dec31' ? 'all' : 'dec31')}>31 декабря</button>
            <button type="button" className={`${styles.preset} ${date === 'jan1' ? styles.presetActive : ''}`} onClick={() => setDateFilter(date === 'jan1' ? 'all' : 'jan1')}>1 января</button>
            <button type="button" className={`${styles.preset} ${date === 'jan1to8' ? styles.presetActive : ''}`} onClick={() => setDateFilter(date === 'jan1to8' ? 'all' : 'jan1to8')}>1–8 января</button>
            <button type="button" className={`${styles.preset} ${date === 'weekend' ? styles.presetActive : ''}`} onClick={() => setDateFilter(date === 'weekend' ? 'all' : 'weekend')}>Выходные</button>
          </div>
          </div>
        </section>

      <div className={styles.wrap}>
        <p className={styles.intro}>Выберите, как провести новогодние дни: сходить на ёлку или спектакль, отправиться на прогулку или праздничный концерт.</p>
        <div className={styles.layout}>
        <section className={styles.filters} aria-label="Фильтры мероприятий">
          <button type="button" className={styles.mobileFilterToggle} aria-expanded={filtersExpanded} aria-controls="new-year-filter-controls" onClick={() => setFiltersExpanded(!filtersExpanded)}>
            <span>Фильтры{activeFilterCount ? <b className={styles.mobileFilterCount}>{activeFilterCount}</b> : null}</span>
            <span className={styles.mobileFilterHint}>{activeFilterCount ? 'Настроить выбор' : 'Город, дата, цена и формат'}</span>
            <span className={`${styles.mobileFilterChevron} ${filtersExpanded ? styles.mobileFilterChevronOpen : ''}`} aria-hidden="true" />
          </button>
          <div id="new-year-filter-controls" className={`${styles.wrap} ${styles.filtersContent} ${filtersExpanded ? '' : styles.filtersContentCollapsed}`}>
            <div className={styles.filterMain}>
              <label className={styles.search}>
                <span className="sr-only">Поиск по названию, площадке или городу</span>
                <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input className={styles.searchInput} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: ёлка, спектакль, город…" />
              </label>
              <div className={`${styles.segment} ${styles.segmentSort}`} role="group" aria-label="Сортировка">
                <button type="button" className={sort === 'date' ? styles.segmentActive : ''} onClick={() => setSort('date')}>Дата</button>
                <button type="button" className={sort === 'price' ? styles.segmentActive : ''} onClick={() => setSort('price')}>Дешевле</button>
                <button type="button" className={sort === 'price-desc' ? styles.segmentActive : ''} onClick={() => setSort('price-desc')}>Дороже</button>
              </div>
              <div className={`${styles.segment} ${styles.segmentDensity}`} role="group" aria-label="Плотность списка">
                <button type="button" className={compact ? styles.segmentActive : ''} onClick={() => setCompact(true)} aria-pressed={compact}>▤</button>
                <button type="button" className={!compact ? styles.segmentActive : ''} onClick={() => setCompact(false)} aria-pressed={!compact}>▥</button>
              </div>
              <button type="button" className={styles.linkButton} onClick={() => void copyFiltersLink()} aria-label="Скопировать ссылку на выбранные фильтры">{copiedLink ? 'Ссылка скопирована' : 'Скопировать и поделиться'}</button>
            </div>
            <div className={styles.mobileDropdowns}>
              <label className={styles.mobileFilterField}>
                <span>Город или регион</span>
                <select value={region ? `region:${region}` : `city:${city}`} onChange={(event) => {
                  const [kind, ...parts] = event.target.value.split(':');
                  const value = parts.join(':');
                  if (kind === 'region') selectRegion(value);
                  else selectCity(value);
                }}>
                  <option value="city:Вся Россия">Вся Россия · {cities.find((item) => item.name === 'Вся Россия')?.count || 0}</option>
                  <optgroup label="Города">
                    {orderedCities.filter((item): item is Facet & { name: string } => Boolean(item.name) && item.name !== 'Вся Россия').map((item) => <option key={`city:${item.name}`} value={`city:${item.name}`} disabled={item.count === 0 && city !== item.name}>{item.name} · {item.count}</option>)}
                  </optgroup>
                  <optgroup label="Области и края">
                    {regions.map((item) => <option key={`region:${item.name}`} value={`region:${item.name}`} disabled={item.count === 0 && region !== item.name}>{item.name} · {item.count}</option>)}
                  </optgroup>
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Дата</span>
                <select value={date} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
                  {DATE_OPTIONS.map((item) => { const count = getFacetCount(data?.facets.dates, item.value); return <option key={item.value} value={item.value} disabled={count === 0 && date !== item.value}>{item.label} · {count}</option>; })}
                  {date === 'custom' && customDate ? <option value="custom">{formatCustomDate(customDate)} · {data?.total || 0}</option> : null}
                </select>
              </label>
              <div className={styles.mobileFilterField}><span>Своя дата</span><DatePickerChip date={date} customDate={customDate} onChange={setCustomDateFilter} /></div>
              <label className={styles.mobileFilterField}>
                <span>Цена</span>
                <select value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}>
                  {PRICE_OPTIONS.map((item) => { const count = getFacetCount(data?.facets.prices, item.value); return <option key={item.value} value={item.value} disabled={count === 0 && price !== item.value}>{item.label} · {count}</option>; })}
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Формат</span>
                <select value={format} onChange={(event) => setFormat(event.target.value)}>
                  {formats.map((item) => { const value = item.name || 'Все форматы'; return <option key={value} value={value} disabled={item.count === 0 && format !== value}>{value} · {item.count}</option>; })}
                </select>
              </label>
              <label className={styles.mobileFilterField}>
                <span>Наличие</span>
                <select value={lowStock ? 'low' : 'any'} onChange={(event) => setLowStock(event.target.value === 'low')}>
                  <option value="any">Любое наличие</option>
                  <option value="low" disabled={!data?.facets.lowStock && !lowStock}>Мало мест · {data?.facets.lowStock || 0}</option>
                </select>
              </label>
            </div>
            <div className={styles.chipRows}>
              <div className={styles.chipRow} aria-label="Фильтр по городам и регионам">
                <span className={`${styles.chipLabel} ${styles.chipLabelCity}`}>Город</span>
                {visibleCityChips.map((item) => {
                  const isRegion = Boolean(item.region);
                  const selected = isRegion ? region === item.name : item.name === 'Вся Россия' ? city === 'Вся Россия' && !region : city === item.name;
                  const onSelect = isRegion
                    ? () => item.name && selectRegion(item.name)
                    : item.name === 'Вся Россия'
                      ? selectAllGeography
                      : () => item.name && selectCity(item.name);
                  return <button key={`${isRegion ? 'region' : 'city'}:${item.name}`} type="button" className={`${styles.chip} ${selected ? styles.chipActive : ''} ${item.count === 0 ? styles.chipDisabled : ''}`} onClick={onSelect} aria-pressed={selected} disabled={item.count === 0 && !selected}>{item.name}<b className={styles.chipCount}>{item.count}</b></button>;
                })}
                {geoOptions.length > 8 ? <button type="button" className={`${styles.chip} ${styles.moreChip}`} onClick={() => setCitiesExpanded(!citiesExpanded)}>{citiesExpanded ? 'свернуть ↑' : `ещё ${geoOptions.length - 8} ↓`}</button> : null}
              </div>
              <div className={styles.chipRow} aria-label="Фильтр по дате">
                <span className={styles.chipLabel}>Дата</span>
                {DATE_OPTIONS.map((item) => { const count = getFacetCount(data?.facets.dates, item.value); return <button key={item.value} type="button" className={`${styles.chip} ${date === item.value ? styles.chipActive : ''} ${count === 0 && item.value !== 'all' ? styles.chipDisabled : ''}`} onClick={() => setDateFilter(item.value)} aria-pressed={date === item.value}>{item.label}<b className={styles.chipCount}>{count}</b></button>; })}
                <DatePickerChip date={date} customDate={customDate} onChange={setCustomDateFilter} />
              </div>
              <div className={styles.chipRow} aria-label="Фильтр по цене">
                <span className={styles.chipLabel}>Цена</span>
                {PRICE_OPTIONS.map((item) => { const count = getFacetCount(data?.facets.prices, item.value); return <button key={item.value} type="button" className={`${styles.chip} ${price === item.value ? styles.chipActive : ''} ${count === 0 && item.value !== 'all' ? styles.chipDisabled : ''}`} onClick={() => setPrice(item.value)} aria-pressed={price === item.value}>{item.label}<b className={styles.chipCount}>{count}</b></button>; })}
              </div>
              <div className={styles.chipRow} aria-label="Фильтр по формату">
                <span className={styles.chipLabel}>Формат</span>
                {formats.map((item) => { const value = item.name || 'Все форматы'; return <button key={value} type="button" className={`${styles.chip} ${format === value ? styles.chipActive : ''} ${item.count === 0 && value !== 'Все форматы' ? styles.chipDisabled : ''}`} onClick={() => setFormat(value)} aria-pressed={format === value}>{value}<b className={styles.chipCount}>{item.count}</b></button>; })}
              </div>
              <div className={styles.chipRow} aria-label="Фильтр по наличию мест">
                <span className={styles.chipLabel}>Места</span>
                <button type="button" className={`${styles.chip} ${lowStock ? styles.chipActive : ''} ${data?.facets.lowStock === 0 ? styles.chipDisabled : ''}`} onClick={() => setLowStock(!lowStock)} aria-pressed={lowStock} disabled={!data?.facets.lowStock && !lowStock}>Мало мест<b className={styles.chipCount}>{data?.facets.lowStock || 0}</b></button>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.content}>
        <div className={styles.wrap}>
          <div className={styles.toolbar}>
            <div className={styles.count}>{loading ? 'Обновляем выборку…' : <>Найдено <strong>{data?.total || 0}</strong> событий · показано <strong>{data?.items.length || 0}</strong>{city === 'Вся Россия' ? ` · ${Math.max(0, cities.filter((item) => item.name !== 'Вся Россия' && item.count > 0).length)} городов` : ''}{data?.priceFrom != null ? ` · от ${new Intl.NumberFormat('ru-RU').format(data.priceFrom)} ₽` : ''}</>}</div>
            {hasFilters ? <button type="button" className={styles.reset} onClick={resetFilters}>Сбросить фильтры</button> : null}
          </div>

          {hasFilters ? <div className={styles.activeBar}>
            <span className={styles.activeDot} /><span className={styles.activeText}>{activeFilterSummary}</span>
            <span className={styles.activeCity}>{city === 'Вся Россия' ? 'Все города' : city}</span>
          </div> : null}

          {errorMessage || loadError ? <div role="status" className={styles.empty}><div className={styles.emptyTitle}>Не удалось обновить список</div><div className={styles.emptyText}>{loadError || errorMessage}</div></div> : null}
          {data?.items.length ? <div className={styles.list} aria-busy={loading || loadingMore}>
            {data.items.map((event) => {
              const slot = event.upcomingSlots?.[0];
              const href = event.eventPageSlug || event.slug;
              const priceLabel = typeof event.priceFrom === 'number' ? event.priceFrom === 0 ? 'Бесплатно' : `от ${new Intl.NumberFormat('ru-RU').format(event.priceFrom)} ₽` : 'Цена уточняется';
              const slots = event.upcomingSlots || [];
              return <article key={event.eventPageSlug || event.groupKey || event.id} className={`${styles.row} ${compact ? styles.rowCompact : ''}`} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`Подробнее: ${event.title}`} onClick={(clickEvent) => {
                if ((clickEvent.target as HTMLElement).closest('a, button, details, summary')) return;
                setSelectedEvent(event);
              }} onKeyDown={(keyEvent) => {
                if (keyEvent.target !== keyEvent.currentTarget || (keyEvent.key !== 'Enter' && keyEvent.key !== ' ')) return;
                keyEvent.preventDefault();
                setSelectedEvent(event);
              }}>
                <div className={styles.rowDate}>{slot ? <><strong>{formatShortDate(slot).day}</strong><small>{formatShortDate(slot).rest}</small></> : 'Дата уточняется'}</div>
                <div className={styles.rowMain}>
                  <div className={styles.rowTitle} title={event.title}>{event.title}</div>
                  <div className={styles.rowMeta}>{city === 'Вся Россия' && event.city ? <span className={styles.rowCity}>{event.city}</span> : null}{eventBadges(event).map((badge) => <span key={badge.id} className={`${styles.tag} ${badge.className}`}>{badge.label}</span>)}<span>{event.venue || 'Площадка уточняется'}</span></div>
                  {slots.length > 1 ? <details className={styles.schedule}><summary>Расписание · {slots.length} {pluralRu(slots.length, PLURAL_SESSION_FORMS)}</summary><ul className={styles.scheduleList}>{slots.map((item, index) => { const itemUrls = [...new Set([item.purchaseUrl, ...(item.purchaseUrls || []), event.widgetUrl, event.purchaseUrl].map(safeExternalUrl).filter((url): url is string => Boolean(url)))]; return <li className={styles.scheduleItem} key={item.id || `${event.id}:${item.startsAt}:${index}`}><span>{formatSlot(item)}</span>{itemUrls.map((itemUrl, urlIndex) => <a key={`${itemUrl}:${urlIndex}`} href={itemUrl} target="_blank" rel="noopener noreferrer" className={styles.scheduleBuy}>{itemUrls.length > 1 ? `Билет на сеанс ${urlIndex + 1}` : 'Билет на этот сеанс'}</a>)}</li>; })}</ul></details> : null}
                </div>
                <div className={styles.rowPrice}>{priceLabel}{typeof event.priceFrom === 'number' && event.priceFrom === 0 ? <small className={styles.freePrice}>вход свободный</small> : <small>за билет</small>}</div>
                <div className={`${styles.rowSeats} ${typeof event.vacant === 'number' && event.vacant <= 8 ? styles.rowSeatsLow : ''}`}>{typeof event.vacant === 'number' ? `${event.vacant} мест` : ''}</div>
                <div className={styles.rowAction}><PreviewPurchaseButton event={event} className={styles.buyButton} /></div>
              </article>;
            })}
          </div> : <div className={styles.empty}><div className={styles.emptyTitle}>Под фильтры ничего не подошло</div><div className={styles.emptyText}>Сбросьте часть условий или выберите другой город.</div></div>}

          {data?.hasMore ? <div className={styles.moreArea}>
            <button type="button" className={styles.moreButton} onClick={() => void loadMore()} disabled={loadingMore || loading}>{loadingMore ? 'Загружаем…' : `Показать ещё ${Math.min(data.limit, data.total - data.items.length)}`}</button>
          </div> : null}
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
                  <dt>Ближайший сеанс</dt><dd>{selectedSlots[0] ? formatSlot(selectedSlots[0]) : 'Дата уточняется'}</dd>
                  <dt>Цена</dt><dd>{selectedPrice}</dd>
                  {typeof selectedEvent.vacant === 'number' ? <><dt>Доступность</dt><dd>{selectedEvent.vacant === 0 ? 'Наличие уточняется у оператора' : `${selectedEvent.vacant} мест по данным каталога`}</dd></> : null}
                </dl>
                <div className={styles.drawerScheduleTitle}>Расписание · {selectedSlots.length} {selectedSlots.length === 1 ? 'сеанс' : selectedSlots.length < 5 ? 'сеанса' : 'сеансов'}</div>
                <ul className={styles.drawerSchedule}>
                  {selectedSlots.map((item, index) => {
                    const urls = [...new Set([item.purchaseUrl, ...(item.purchaseUrls || [])].map(safeExternalUrl).filter((url): url is string => Boolean(url)))];
                    return <li key={item.id || `${selectedEvent.id}:${item.startsAt}:${index}`}>
                      <span>{formatSlot(item)}</span>
                      {urls.map((url, urlIndex) => <a key={`${url}:${urlIndex}`} href={url} target="_blank" rel="noopener noreferrer">{urls.length > 1 ? `Билет на сеанс ${urlIndex + 1}` : 'Купить билет на этот сеанс'}</a>)}
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
    </main>
  );
}
