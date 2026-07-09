import * as React from 'react';
import { ArrowUpDown, ChevronDown, Grid3X3, List, Search, SlidersHorizontal, Star, Table2, X } from 'lucide-react';

import { CatalogAdvancedFiltersPanel } from '@/components/CatalogAdvancedFiltersPanel';
import { EventCard } from '@/components/EventCard';
import { EventCardHorizontal } from '@/components/EventCardHorizontal';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber, publicData } from '@/data';
import { API_BASE_URL } from '@/lib/api-base';
import { collectCatalogLabels } from '@/lib/catalog-labels';
import { applyCatalogPreset, catalogPresetMatches, CATALOG_PRESETS } from '@/lib/catalog-presets';
import { AGE_FILTER_OPTIONS } from '@/components/CatalogAdvancedFiltersPanel';
import { eventHref } from '@/routes';
import { formatShowcaseSessionDate, resolvePseudoRating } from '@/lib/event-card-meta';
import { resolveEventCardDestinationLabel } from '@/lib/event-location';
import { arrangeCatalogSessions } from '@/lib/session-cover-image';
import { readCachedCatalogPage, writeCachedCatalogPage } from '@/lib/catalog-page-cache';
import type { PublicLanding, PublicSession } from '@/types';

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening';
type SortMode = 'time' | 'price' | 'popular';
type ViewMode = 'cards' | 'list' | 'table';
const VIEW_MODE_STORAGE_KEY = 'catalog:viewMode';
type CatalogFacetItem = { name: string; events: number };
type LandingFacet = Pick<PublicLanding, 'slug' | 'title' | 'events'>;
type CatalogFacets = {
  cities: CatalogFacetItem[];
  categories: CatalogFacetItem[];
  subcategories: CatalogFacetItem[];
  tags?: CatalogFacetItem[];
  landings: LandingFacet[];
  priceSteps: number[];
};
type CatalogResponse = {
  total: number;
  offset: number;
  limit: number;
  items: PublicSession[];
  facets?: Partial<CatalogFacets>;
};
type ActiveCatalogFilter = { key: string; label: string; onClear: () => void };

const DATE_OPTIONS: Array<[DateFilter, string]> = [
  ['all', 'Любая дата'],
  ['today', 'Сегодня'],
  ['tomorrow', 'Завтра'],
  ['weekend', 'Выходные'],
  ['evening', 'Вечером'],
];

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ['popular', 'Популярное'],
  ['time', 'Скоро'],
  ['price', 'Дешевле'],
];

const CATEGORY_EMOJI: Record<string, string> = {
  Экскурсии: '🚶',
  Музеи: '🏛',
  Мероприятия: '🎭',
  'Активный отдых': '⚡',
  Выставки: '🖼',
  Театры: '🎪',
  Концерты: '🎵',
  Детям: '🧒',
};

function categoryEmoji(name: string): string {
  return CATEGORY_EMOJI[name] || '🎫';
}

const CATALOG_PAGE_LIMIT = 60;
const MIN_DISPLAY_PRICE_RUB = 100;

function isDefaultCatalogQuery(params: {
  catalogOffset: number;
  query: string;
  city: string;
  category: string;
  landing: string;
  date: DateFilter;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
  ageMax: number;
  sort: SortMode;
}) {
  return (
    params.catalogOffset === 0 &&
    !params.query.trim() &&
    params.city === 'all' &&
    params.category === 'all' &&
    params.landing === 'all' &&
    params.date === 'all' &&
    !params.dateFrom &&
    !params.dateTo &&
    params.minPrice === 'all' &&
    params.maxPrice === 'all' &&
    params.ageMax < 0 &&
    params.sort === 'popular'
  );
}

export function CatalogPage() {
  const initialParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const cachedCatalog = React.useMemo(() => readCachedCatalogPage(), []);
  const [catalogSessions, setCatalogSessions] = React.useState<PublicSession[]>(
    () => cachedCatalog?.items || publicData.sessions.slice(0, CATALOG_PAGE_LIMIT),
  );
  const [catalogTotal, setCatalogTotal] = React.useState(
    () => cachedCatalog?.total || publicData.stats.events || publicData.sessions.length,
  );
  const [catalogOffset, setCatalogOffset] = React.useState(0);
  const [catalogFacets, setCatalogFacets] = React.useState<Partial<CatalogFacets> | null>(() => cachedCatalog?.facets || null);
  const [isLoading, setIsLoading] = React.useState(() => !cachedCatalog && publicData.sessions.length === 0);
  const [hasLoadedCatalog, setHasLoadedCatalog] = React.useState(() => Boolean(cachedCatalog?.items?.length));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState(() => initialParams.get('q') || '');
  const [city, setCity] = React.useState(() => initialParams.get('city') || 'all');
  const [category, setCategory] = React.useState(() => initialParams.get('category') || 'all');
  const [landing, setLanding] = React.useState(() => initialParams.get('landing') || 'all');
  const [date, setDate] = React.useState<DateFilter>(() => parseDateFilter(initialParams.get('date')));
  const [dateFrom, setDateFrom] = React.useState(() => initialParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = React.useState(() => initialParams.get('dateTo') || '');
  const [minPrice, setMinPrice] = React.useState(() => parseMinPriceFilter(initialParams.get('minPrice')));
  const [maxPrice, setMaxPrice] = React.useState(() => parseMaxPriceFilter(initialParams.get('maxPrice')));
  const [ageMax, setAgeMax] = React.useState(() => parseAgeMaxFilter(initialParams.get('ageMax')));
  const [sort, setSort] = React.useState<SortMode>(() => parseSortMode(initialParams.get('sort')));
  const [mode, setModeState] = React.useState<ViewMode>(() => {
    const fromUrl = initialParams.get('view');
    if (fromUrl) return parseViewMode(fromUrl);
    return readStoredViewMode() || 'cards';
  });
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const setMode = React.useCallback((value: ViewMode) => {
    setModeState(value);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
    } catch {
      // ignore storage errors
    }
  }, []);

  React.useEffect(() => {
    document.title = 'События, экскурсии и билеты | Дайбилет';
    upsertMeta('description', 'Полный каталог событий Дайбилет: фильтры по городу, дате, категории, цене, площадке и подборкам.');
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: String(CATALOG_PAGE_LIMIT), offset: String(catalogOffset), sort });
    if (query.trim()) params.set('q', query.trim());
    if (city !== 'all') params.set('city', city);
    if (category !== 'all') params.set('category', category);
    if (landing !== 'all') params.set('landing', landing);
    if (dateFrom) params.set('dateFrom', dateFrom);
    else if (date !== 'all') params.set('date', date);
    if (dateTo) params.set('dateTo', dateTo);
    if (minPrice !== 'all') params.set('minPrice', minPrice);
    if (maxPrice !== 'all') params.set('maxPrice', maxPrice);
    if (ageMax >= 0) params.set('ageMax', String(ageMax));

    const hasVisibleData = catalogSessions.length > 0;
    const debounce = hasVisibleData ? null : window.setTimeout(() => setIsLoading(true), 120);
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    setLoadError(null);

    fetch(`${API_BASE_URL}/api/public/events?${params.toString()}`, {
      cache: 'default',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CatalogResponse>;
      })
      .then((payload) => {
        const items = Array.isArray(payload.items) ? payload.items : [];
        setCatalogSessions((current) => (catalogOffset > 0 ? mergeCatalogSessions(current, items) : items));
        setCatalogTotal(payload.total || payload.items?.length || 0);
        setCatalogFacets(payload.facets || null);
        setHasLoadedCatalog(true);
        setLoadError(null);
        if (
          isDefaultCatalogQuery({
            catalogOffset,
            query,
            city,
            category,
            landing,
            date,
            dateFrom,
            dateTo,
            minPrice,
            maxPrice,
            ageMax,
            sort,
          })
        ) {
          writeCachedCatalogPage(payload);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (debounce != null) window.clearTimeout(debounce);
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      if (debounce != null) window.clearTimeout(debounce);
      window.clearTimeout(timeout);
    };
  }, [ageMax, catalogOffset, category, city, date, dateFrom, dateTo, landing, maxPrice, minPrice, query, sort]);

  React.useEffect(() => {
    syncCatalogUrl({ query, city, category, landing, date, dateFrom, dateTo, minPrice, maxPrice, ageMax, sort, mode });
  }, [ageMax, category, city, date, dateFrom, dateTo, landing, maxPrice, minPrice, mode, query, sort]);

  const sourceSessions = hasLoadedCatalog ? catalogSessions : publicData.sessions.slice(0, CATALOG_PAGE_LIMIT);
  const fallbackFacets = React.useMemo(() => buildCatalogFacets(publicData.sessions), []);
  const facets = catalogFacets || fallbackFacets;
  const rawCities = facets.cities?.length ? facets.cities : fallbackFacets.cities;
  const cities = React.useMemo(() => {
    const visible = rawCities.filter((item) => isCatalogCityFacet(item));
    if (city === 'all' || visible.some((item) => item.name === city)) return visible;
    const selected = rawCities.find((item) => item.name === city);
    return selected ? [selected, ...visible] : visible;
  }, [city, rawCities]);
  const categories = React.useMemo<Array<[string, number]>>(
    () => (facets.categories?.length ? facets.categories : fallbackFacets.categories).map((item) => [item.name, item.events]),
    [facets.categories, fallbackFacets.categories],
  );
  const landings = React.useMemo<LandingFacet[]>(() => {
    const source = facets.landings?.length ? facets.landings : publicData.landings.filter((item) => item.events > 0);
    return source.slice(0, 18);
  }, [facets.landings]);
  const visibleSessions = React.useMemo(
    () => (hasLoadedCatalog ? sourceSessions : arrangeCatalogSessions(sourceSessions, sort)),
    [hasLoadedCatalog, sort, sourceSessions],
  );
  const selectedCity = cities.find((item) => item.name === city);

  const setQueryFilter = (value: string) => {
    setQuery(value);
    setCatalogOffset(0);
  };
  const setCityFilter = (value: string) => {
    setCity(value);
    setCatalogOffset(0);
  };
  const setCategoryFilter = (value: string) => {
    setCategory(value);
    setCatalogOffset(0);
  };
  const setLandingFilter = (value: string) => {
    setLanding(value);
    setCatalogOffset(0);
  };
  const setDateFilter = (value: DateFilter) => {
    setDate(value);
    setDateFrom('');
    setDateTo('');
    setCatalogOffset(0);
  };
  const setDateFromFilter = (value: string) => {
    setDateFrom(value);
    setDate('all');
    setCatalogOffset(0);
  };
  const setDateToFilter = (value: string) => {
    setDateTo(value);
    setDate('all');
    setCatalogOffset(0);
  };
  const setMinPriceFilter = (value: string) => {
    setMinPrice(value);
    setCatalogOffset(0);
  };
  const setMaxPriceFilter = (value: string) => {
    setMaxPrice(value);
    setCatalogOffset(0);
  };
  const setAgeMaxFilter = (value: number) => {
    setAgeMax(value);
    setCatalogOffset(0);
  };
  const setSortFilter = (value: SortMode) => {
    setSort(value);
    setCatalogOffset(0);
  };
  const reset = () => {
    setQuery('');
    setCity('all');
    setCategory('all');
    setLanding('all');
    setDate('all');
    setDateFrom('');
    setDateTo('');
    setMinPrice('all');
    setMaxPrice('all');
    setAgeMax(-1);
    setSort('popular');
    setCatalogOffset(0);
  };

  const applyPreset = (slug: (typeof CATALOG_PRESETS)[number]['slug'], active: boolean) => {
    const patch = applyCatalogPreset(slug, active);
    if ('date' in patch && patch.date) setDateFilter(patch.date);
    else if ('date' in patch) setDateFilter('all');
    if ('dateFrom' in patch) setDateFromFilter(patch.dateFrom || '');
    if ('dateTo' in patch) setDateToFilter(patch.dateTo || '');
    if ('minPrice' in patch && patch.minPrice) setMinPriceFilter(patch.minPrice);
    else if ('minPrice' in patch) setMinPriceFilter('all');
    if ('maxPrice' in patch && patch.maxPrice) setMaxPriceFilter(patch.maxPrice);
    else if ('maxPrice' in patch) setMaxPriceFilter('all');
    if ('sort' in patch && patch.sort) setSortFilter(patch.sort);
    if ('ageMax' in patch && patch.ageMax != null) setAgeMaxFilter(patch.ageMax);
  };

  const advancedCount =
    (dateFrom || dateTo ? 1 : 0) +
    (minPrice !== 'all' || maxPrice !== 'all' ? 1 : 0) +
    (ageMax >= 0 ? 1 : 0) +
    (landing !== 'all' ? 1 : 0);

  const onAdvancedChange = React.useCallback((patch: Partial<{ dateFrom: string; dateTo: string; minPrice: string; maxPrice: string; ageMax: number; landing: string }>) => {
    if ('dateFrom' in patch) setDateFromFilter(patch.dateFrom || '');
    if ('dateTo' in patch) setDateToFilter(patch.dateTo || '');
    if ('minPrice' in patch) setMinPriceFilter(patch.minPrice || 'all');
    if ('maxPrice' in patch) setMaxPriceFilter(patch.maxPrice || 'all');
    if ('ageMax' in patch && patch.ageMax != null) setAgeMaxFilter(patch.ageMax);
    if ('landing' in patch) setLandingFilter(patch.landing || 'all');
  }, []);

  const ageMaxLabel = ageMax >= 0 ? AGE_FILTER_OPTIONS.find((item) => item.value === ageMax)?.label : null;

  const activeFilters: ActiveCatalogFilter[] = [
    ...(query.trim() ? [{ key: 'query', label: `Поиск: ${query.trim()}`, onClear: () => setQueryFilter('') }] : []),
    ...(city !== 'all' ? [{ key: 'city', label: city, onClear: () => setCityFilter('all') }] : []),
    ...(category !== 'all' ? [{ key: 'category', label: category, onClear: () => setCategoryFilter('all') }] : []),
    ...(landing !== 'all'
      ? [{ key: 'landing', label: landings.find((item) => item.slug === landing)?.title || landing, onClear: () => setLandingFilter('all') }]
      : []),
    ...(date !== 'all' ? [{ key: 'date', label: dateLabel(date), onClear: () => setDateFilter('all') }] : []),
    ...(dateFrom || dateTo
      ? [{
          key: 'dateRange',
          label: `${dateFrom || '…'} – ${dateTo || '…'}`,
          onClear: () => {
            setDateFromFilter('');
            setDateToFilter('');
          },
        }]
      : []),
    ...(minPrice !== 'all' ? [{ key: 'minPrice', label: `от ${formatNumber(Number(minPrice))} ₽`, onClear: () => setMinPriceFilter('all') }] : []),
    ...(maxPrice !== 'all'
      ? [{ key: 'maxPrice', label: maxPrice === '0' ? 'Бесплатно' : `до ${formatNumber(Number(maxPrice))} ₽`, onClear: () => setMaxPriceFilter('all') }]
      : []),
    ...(ageMax >= 0 && ageMaxLabel ? [{ key: 'ageMax', label: `до ${ageMaxLabel}`, onClear: () => setAgeMaxFilter(-1) }] : []),
    ...(sort !== 'popular' ? [{ key: 'sort', label: SORT_OPTIONS.find(([value]) => value === sort)?.[1] || sort, onClear: () => setSortFilter('popular') }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        cityLabel={selectedCity?.name || 'Все города'}
        searchQuery={query}
        searchCity={city !== 'all' ? city : undefined}
        onSection={(section) => navigateFromCatalog(section)}
        onDestination={setCityFilter}
      />
      <main className="pb-12">
        <div className="container-page py-6 sm:py-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Каталог событий</h1>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Найдите то, что нравится — экскурсии, музеи и события по всей России
              </p>
            </div>
            <div className="text-sm text-slate-500">
              Найдено{' '}
              <span className="text-lg font-bold text-slate-900">{formatNumber(catalogTotal || visibleSessions.length)}</span>{' '}
              событий
            </div>
          </div>

          {activeFilters.length > 0 ? <ActiveFiltersRow activeFilters={activeFilters} reset={reset} /> : null}

          <CatalogToolbarSticky
            query={query}
            setQuery={setQueryFilter}
            city={city}
            setCity={setCityFilter}
            cities={cities}
            landing={landing}
            setLanding={setLandingFilter}
            landings={landings}
            dateFrom={dateFrom}
            dateTo={dateTo}
            minPrice={minPrice}
            maxPrice={maxPrice}
            ageMax={ageMax}
            onAdvancedChange={onAdvancedChange}
            category={category}
            setCategory={setCategoryFilter}
            categories={categories}
            sort={sort}
            setSort={setSortFilter}
            mode={mode}
            setMode={setMode}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            advancedCount={advancedCount}
            onApplyPreset={applyPreset}
            presetSnapshot={{ date, minPrice, maxPrice, sort }}
            onReset={reset}
          />

          <CatalogResultsMeta
            shown={visibleSessions.length}
            total={catalogTotal || visibleSessions.length}
            isLoading={isLoading}
            loadError={loadError}
            mode={mode}
          />

          <CatalogView sessions={visibleSessions} mode={mode} sort={sort} onSortChange={setSortFilter} />
          <CatalogPagination
            total={catalogTotal}
            shown={visibleSessions.length}
            isLoading={isLoading}
            onLoadMore={() => setCatalogOffset(visibleSessions.length)}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ActiveFiltersRow({ activeFilters, reset }: { activeFilters: ActiveCatalogFilter[]; reset: () => void }) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      role="region"
      aria-label="Активные фильтры"
    >
      <span className="inline-flex items-center gap-1.5 pl-1 pr-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" />
        Активно · {activeFilters.length}
      </span>
      {activeFilters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.onClear}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary/20 hover:bg-primary/20"
        >
          {filter.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={reset}
        className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
      >
        <X className="h-3.5 w-3.5" /> Сбросить фильтры
      </button>
    </div>
  );
}

function CatalogToolbarSticky({
  query,
  setQuery,
  city,
  setCity,
  cities,
  landing,
  landings,
  dateFrom,
  dateTo,
  minPrice,
  maxPrice,
  ageMax,
  onAdvancedChange,
  category,
  setCategory,
  categories,
  sort,
  setSort,
  mode,
  setMode,
  filtersOpen,
  setFiltersOpen,
  advancedCount,
  onApplyPreset,
  presetSnapshot,
  onReset,
}: {
  query: string;
  setQuery: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  cities: Array<{ name: string; events: number }>;
  landing: string;
  setLanding: (value: string) => void;
  landings: LandingFacet[];
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
  ageMax: number;
  onAdvancedChange: (patch: Partial<{ dateFrom: string; dateTo: string; minPrice: string; maxPrice: string; ageMax: number; landing: string }>) => void;
  category: string;
  setCategory: (value: string) => void;
  categories: Array<[string, number]>;
  sort: SortMode;
  setSort: (value: SortMode) => void;
  mode: ViewMode;
  setMode: (value: ViewMode) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean) => void;
  advancedCount: number;
  onApplyPreset: (slug: (typeof CATALOG_PRESETS)[number]['slug'], active: boolean) => void;
  presetSnapshot: { date: DateFilter; minPrice: string; maxPrice: string; sort: SortMode };
  onReset: () => void;
}) {
  return (
    <div className="catalog-toolbar-sticky -mx-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex flex-1 items-center">
            <span className="sr-only">Поиск по событиям</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название, место или артист"
              aria-label="Поиск по событиям"
              className="h-11 w-full rounded-xl bg-slate-50 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            {query ? (
              <button
                type="button"
                aria-label="Очистить поиск"
                onClick={() => setQuery('')}
                className="absolute right-2 grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="relative sm:w-52">
            <label htmlFor="catalog-city" className="sr-only">
              Город
            </label>
            <select
              id="catalog-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-4 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <option value="all">Все города</option>
              {cities.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Сортировка" className="inline-flex rounded-xl bg-slate-100 p-1">
            {SORT_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={sort === value}
                onClick={() => setSort(value)}
                className={`h-9 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  sort === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
              aria-controls="advanced-filters-panel"
              className={`relative inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ${
                filtersOpen || advancedCount > 0
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Фильтры</span>
              {advancedCount > 0 ? (
                <span aria-hidden className="grid min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-xs">
                  {advancedCount}
                </span>
              ) : null}
            </button>

            <div className="hidden overflow-hidden rounded-xl bg-slate-100 p-1 md:flex" role="radiogroup" aria-label="Вид списка">
              <button
                type="button"
                onClick={() => setMode('cards')}
                aria-label="Карточки"
                className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                  mode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('list')}
                aria-label="Список"
                className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                  mode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('table')}
                aria-label="Таблица"
                className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                  mode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filtersOpen ? (
          <CatalogAdvancedFiltersPanel
            filters={{ dateFrom, dateTo, minPrice, maxPrice, ageMax, landing }}
            landings={landings}
            onChange={onAdvancedChange}
            onClose={() => setFiltersOpen(false)}
            onReset={onReset}
          />
        ) : null}

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="horizontal-snap-row flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                category === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="mr-1">✨</span>
              Все
            </button>
            {categories.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(category === name ? 'all' : name)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  category === name ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="mr-1">{categoryEmoji(name)}</span>
                {name}
                <span className={category === name ? 'ml-1 text-white/70' : 'ml-1 text-slate-400'}>{formatNumber(count)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Подборки:</span>
          {CATALOG_PRESETS.map((preset) => {
            const active = catalogPresetMatches(preset.slug, presetSnapshot);
            return (
              <button
                key={preset.slug}
                type="button"
                onClick={() => onApplyPreset(preset.slug, active)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active ? 'bg-primary/10 text-primary-700 ring-1 ring-primary/30' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CatalogResultsMeta({
  shown,
  total,
  isLoading,
  loadError,
  mode,
}: {
  shown: number;
  total: number;
  isLoading: boolean;
  loadError: string | null;
  mode: ViewMode;
}) {
  const modeLabel = mode === 'table' ? 'Таблица' : mode === 'list' ? 'Список' : 'Карточки';
  return (
    <div className="mb-4 mt-6 text-sm text-slate-500">
      {isLoading ? <p className="text-xs font-semibold text-primary-700">Обновляем выдачу...</p> : null}
      {loadError ? <p className="text-xs font-semibold text-amber-700">API каталога не ответил: показываем локальный набор.</p> : null}
      <p>
        Показано {formatNumber(shown)} из {formatNumber(total)} · {modeLabel}
      </p>
    </div>
  );
}

function CatalogView({
  mode,
  sessions,
  sort,
  onSortChange,
}: {
  mode: ViewMode;
  sessions: PublicSession[];
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
}) {
  if (mode === 'list') return <CatalogList sessions={sessions} />;
  if (mode === 'table') return <CatalogTable sessions={sessions} sort={sort} onSortChange={onSortChange} />;
  return <CatalogGrid sessions={sessions} />;
}

function CatalogGrid({ sessions }: { sessions: PublicSession[] }) {
  if (!sessions.length) return <EmptyCatalog />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sessions.map((session) => (
        <EventCard key={session.id} event={session} compact />
      ))}
    </div>
  );
}

function CatalogList({ sessions }: { sessions: PublicSession[] }) {
  if (!sessions.length) return <EmptyCatalog />;
  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <EventCardHorizontal key={session.id} event={session} />
      ))}
    </div>
  );
}

function CatalogTable({
  sessions,
  sort,
  onSortChange,
}: {
  sessions: PublicSession[];
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
}) {
  const [titleSort, setTitleSort] = React.useState<'asc' | 'desc' | null>(null);

  React.useEffect(() => {
    setTitleSort(null);
  }, [sort]);

  const rows = React.useMemo(() => {
    if (!titleSort) return sessions;
    return [...sessions].sort((a, b) => {
      const cmp = a.title.localeCompare(b.title, 'ru');
      return titleSort === 'asc' ? cmp : -cmp;
    });
  }, [sessions, titleSort]);

  const selectApiSort = (value: SortMode) => {
    setTitleSort(null);
    onSortChange(value);
  };

  const toggleTitleSort = () => {
    setTitleSort((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  if (!rows.length) return <EmptyCatalog />;

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <SortableTableHeader label="Событие" active={titleSort !== null} onClick={toggleTitleSort} />
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Город</th>
            <SortableTableHeader label="Дата" active={sort === 'time' && titleSort === null} onClick={() => selectApiSort('time')} />
            <SortableTableHeader label="Цена" active={sort === 'price' && titleSort === null} onClick={() => selectApiSort('price')} />
            <SortableTableHeader label="Рейтинг" active={sort === 'popular' && titleSort === null} onClick={() => selectApiSort('popular')} />
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((session) => {
            const rating = resolvePseudoRating(session.groupKey || session.id);
            const reviewCount = Math.max(session.sessionCount || 1, 1) * 37 + (session.id.charCodeAt(0) % 90);
            const cityLabel = resolveEventCardDestinationLabel(session);
            return (
              <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="min-w-[280px] px-4 py-3 align-top">
                  <a href={eventHref(session)} className="font-semibold text-slate-950 hover:text-primary-700">
                    {session.title}
                  </a>
                  {session.venue ? <div className="mt-1 text-xs text-slate-500">{session.venue}</div> : null}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">{session.category || '—'}</td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {session.citySlug ? (
                    <a href={`/cities/${session.citySlug}`} className="hover:text-primary-700">
                      {cityLabel}
                    </a>
                  ) : (
                    cityLabel || '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">
                  {formatShowcaseSessionDate(session)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-950">{formatMoney(session.priceFrom)}</td>
                <td className="whitespace-nowrap px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-1 text-slate-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({formatNumber(reviewCount)})</span>
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <a
                    href={eventHref(session)}
                    className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Купить
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortableTableHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3 font-semibold">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          active ? 'text-slate-900' : 'text-slate-500'
        }`}
      >
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${active ? 'text-primary-600' : 'opacity-60'}`} />
      </button>
    </th>
  );
}

function CatalogPagination({
  total,
  shown,
  isLoading,
  onLoadMore,
}: {
  total: number;
  shown: number;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  if (shown <= 0 || shown >= total) return null;
  const remaining = Math.max(total - shown, 0);
  return (
    <div className="mt-8 flex flex-col items-center gap-3 text-center">
      <p className="text-sm font-medium text-slate-500">
        Показано {formatNumber(shown)} из {formatNumber(total)}
      </p>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isLoading}
        className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-wait disabled:bg-slate-300"
      >
        {isLoading ? 'Загружаем...' : `Показать еще ${formatNumber(Math.min(CATALOG_PAGE_LIMIT, remaining))}`}
      </button>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <Search className="mx-auto h-8 w-8 text-slate-300" />
        <h3 className="mt-3 text-base font-semibold text-slate-950">По этим фильтрам событий нет</h3>
        <p className="mt-1 text-sm text-slate-500">Попробуйте убрать город, дату, категорию или ограничение цены.</p>
      </div>
    </div>
  );
}

function countBy(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}

function buildCatalogFacets(sessions: PublicSession[]): CatalogFacets {
  const landingCounts = new Map(countBy(sessions.flatMap((session) => session.landingSlugs || [])));
  return {
    cities: countBy(sessions.map((session) => session.destination || session.city)).map(([name, events]) => ({ name, events })),
    categories: countBy(sessions.map((session) => session.category)).map(([name, events]) => ({ name, events })),
    subcategories: countBy(sessions.flatMap((session) => collectCatalogLabels(session, 8)))
      .filter(([name]) => name.length <= 32)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: publicData.landings
      .filter((item) => (landingCounts.get(item.slug) || item.events) > 0)
      .map((item) => ({ slug: item.slug, title: item.title, events: landingCounts.get(item.slug) || item.events })),
    priceSteps: buildPriceSteps(sessions),
  };
}

function buildPriceSteps(sessions: PublicSession[]) {
  const prices = sessions
    .map((session) => session.priceFrom)
    .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB)
    .sort((a, b) => a - b);
  const max = prices[prices.length - 1] || 0;
  const candidates = [500, 1000, 1500, 2000, 3000, 5000].filter((price) => price <= max);
  return candidates.length ? candidates : [1000, 2000, 3000];
}

function mergeCatalogSessions(current: PublicSession[], next: PublicSession[]) {
  const seen = new Set<string>();
  const merged: PublicSession[] = [];
  for (const session of [...current, ...next]) {
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    merged.push(session);
  }
  return merged;
}

function isCatalogCityFacet(item: CatalogFacetItem) {
  const name = String(item.name || '').trim().toLowerCase();
  if (!name || name === 'не указан') return false;
  return item.events >= 1;
}

function dateLabel(value: DateFilter) {
  if (value === 'today') return 'Сегодня';
  if (value === 'tomorrow') return 'Завтра';
  if (value === 'weekend') return 'Выходные';
  if (value === 'evening') return 'Вечером';
  return 'Любая дата';
}

function parseDateFilter(value: string | null): DateFilter {
  if (value === 'today' || value === 'tomorrow' || value === 'weekend' || value === 'evening') return value;
  return 'all';
}

function parseSortMode(value: string | null): SortMode {
  if (value === 'price' || value === 'time') return value;
  return 'popular';
}

function readStoredViewMode(): ViewMode | null {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === 'cards' || stored === 'list' || stored === 'table') return stored;
    if (stored === 'grid') return 'cards';
  } catch {
    // ignore storage errors
  }
  return null;
}

function parseViewMode(value: string | null): ViewMode {
  if (value === 'list') return 'list';
  if (value === 'table') return 'table';
  return 'cards';
}

function parseMaxPriceFilter(value: string | null): string {
  if (!value) return 'all';
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return 'all';
  if (price === 0) return '0';
  if (price < MIN_DISPLAY_PRICE_RUB) return 'all';
  return String(Math.round(price));
}

function parseMinPriceFilter(value: string | null): string {
  if (!value) return 'all';
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return 'all';
  return String(Math.round(price));
}

function parseAgeMaxFilter(value: string | null): number {
  if (!value) return -1;
  const age = Number(value);
  if (!Number.isFinite(age) || age < 0) return -1;
  return Math.round(age);
}

function syncCatalogUrl(filters: {
  query: string;
  city: string;
  category: string;
  landing: string;
  date: DateFilter;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
  ageMax: number;
  sort: SortMode;
  mode: ViewMode;
}) {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query) params.set('q', query);
  if (filters.city !== 'all') params.set('city', filters.city);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.landing !== 'all') params.set('landing', filters.landing);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  else if (filters.date !== 'all') params.set('date', filters.date);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.minPrice !== 'all') params.set('minPrice', filters.minPrice);
  if (filters.maxPrice !== 'all') params.set('maxPrice', filters.maxPrice);
  if (filters.ageMax >= 0) params.set('ageMax', String(filters.ageMax));
  if (filters.sort !== 'popular') params.set('sort', filters.sort);
  if (filters.mode !== 'cards') params.set('view', filters.mode);

  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash || ''}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ''}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}

function navigateFromCatalog(section: string) {
  if (section === 'top') {
    window.location.href = '/';
    return;
  }
  if (section === 'events') {
    window.location.href = '/events';
    return;
  }
  if (section === 'cities' || section === 'destinations') {
    window.location.href = '/cities';
    return;
  }
  if (section === 'blog') {
    window.location.href = '/blog';
    return;
  }
  if (section === 'landings') {
    window.location.href = '/podborki';
    return;
  }
  window.location.href = `/#${section}`;
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
