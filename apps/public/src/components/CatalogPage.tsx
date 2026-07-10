import * as React from 'react';
import type { PublicCatalogDto } from '@daibilet/contracts';
import { Grid3X3, List, Search, SlidersHorizontal, Table2, Tag, X } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { EventCardHorizontal } from '@/components/EventCardHorizontal';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber, publicData } from '@/data';
import { API_BASE_URL } from '@/lib/api-base';
import { collectCatalogLabels } from '@/lib/catalog-labels';
import { eventHref } from '@/routes';
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
type CatalogResponse = Pick<PublicCatalogDto, 'total' | 'offset' | 'limit'> & {
  items: PublicSession[];
  facets?: Partial<PublicCatalogDto['facets']>;
};
type ActiveCatalogFilter = { key: string; label: string; onClear: () => void };

const CATALOG_PAGE_LIMIT = 60;
const MIN_DISPLAY_PRICE_RUB = 100;

export function CatalogPage({ initialSearch }: { initialSearch?: string } = {}) {
  const initialParams = React.useMemo(() => new URLSearchParams(initialSearch ?? getBrowserSearch()), [initialSearch]);
  const [catalogSessions, setCatalogSessions] = React.useState<PublicSession[]>(() => publicData.sessions.slice(0, CATALOG_PAGE_LIMIT));
  const [catalogTotal, setCatalogTotal] = React.useState(() => publicData.stats.events || publicData.sessions.length);
  const [catalogOffset, setCatalogOffset] = React.useState(0);
  const [catalogFacets, setCatalogFacets] = React.useState<Partial<CatalogFacets> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasLoadedCatalog, setHasLoadedCatalog] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState(() => initialParams.get('q') || '');
  const [city, setCity] = React.useState(() => initialParams.get('city') || 'all');
  const [category, setCategory] = React.useState(() => initialParams.get('category') || 'all');
  const [landing, setLanding] = React.useState(() => initialParams.get('landing') || 'all');
  const [date, setDate] = React.useState<DateFilter>(() => parseDateFilter(initialParams.get('date')));
  const [maxPrice, setMaxPrice] = React.useState(() => parseMaxPriceFilter(initialParams.get('maxPrice')));
  const [sort, setSort] = React.useState<SortMode>(() => parseSortMode(initialParams.get('sort')));
  const [mode, setModeState] = React.useState<ViewMode>(() => {
    const fromUrl = initialParams.get('view');
    if (fromUrl) return parseViewMode(fromUrl);
    return readStoredViewMode() || 'cards';
  });
  const setMode = React.useCallback((value: ViewMode) => {
    setModeState(value);
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
    } catch {
      // ignore storage errors
    }
  }, []);

  React.useEffect(() => {
    document.title = 'Каталог событий, экскурсий и билетов | Дайбилет';
    upsertMeta('description', 'Полный каталог событий Дайбилет: фильтры по городу, дате, категории, цене, площадке и подборкам.');
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: String(CATALOG_PAGE_LIMIT), offset: String(catalogOffset), sort });
    if (query.trim()) params.set('q', query.trim());
    if (city !== 'all') params.set('city', city);
    if (category !== 'all') params.set('category', category);
    if (landing !== 'all') params.set('landing', landing);
    if (date !== 'all') params.set('date', date);
    if (maxPrice !== 'all') params.set('maxPrice', maxPrice);

    const debounce = window.setTimeout(() => setIsLoading(true), 120);
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    fetch(`${API_BASE_URL}/api/public/events?${params.toString()}`, {
      cache: 'no-store',
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
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        window.clearTimeout(debounce);
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      window.clearTimeout(debounce);
      window.clearTimeout(timeout);
    };
  }, [catalogOffset, category, city, date, landing, maxPrice, query, sort]);

  React.useEffect(() => {
    syncCatalogUrl({ query, city, category, landing, date, maxPrice, sort, mode });
  }, [category, city, date, landing, maxPrice, mode, query, sort]);

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
  const subcategories = React.useMemo<Array<[string, number]>>(
    () =>
      (facets.subcategories?.length ? facets.subcategories : fallbackFacets.subcategories)
        .slice(0, 16)
        .map((item) => [item.name, item.events]),
    [facets.subcategories, fallbackFacets.subcategories],
  );
  const landings = React.useMemo<LandingFacet[]>(() => {
    const source = facets.landings?.length ? facets.landings : publicData.landings.filter((item) => item.events > 0);
    return source.slice(0, 18);
  }, [facets.landings]);
  const priceSteps = facets.priceSteps?.length ? facets.priceSteps : fallbackFacets.priceSteps;
  const visibleSessions = sourceSessions;
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
    setCatalogOffset(0);
  };
  const setMaxPriceFilter = (value: string) => {
    setMaxPrice(value);
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
    setMaxPrice('all');
    setSort('time');
    setCatalogOffset(0);
  };
  const activeFilters: ActiveCatalogFilter[] = [
    ...(query.trim() ? [{ key: 'query', label: `Поиск: ${query.trim()}`, onClear: () => setQueryFilter('') }] : []),
    ...(city !== 'all' ? [{ key: 'city', label: city, onClear: () => setCityFilter('all') }] : []),
    ...(category !== 'all' ? [{ key: 'category', label: category, onClear: () => setCategoryFilter('all') }] : []),
    ...(landing !== 'all'
      ? [{ key: 'landing', label: landings.find((item) => item.slug === landing)?.title || landing, onClear: () => setLandingFilter('all') }]
      : []),
    ...(date !== 'all' ? [{ key: 'date', label: dateLabel(date), onClear: () => setDateFilter('all') }] : []),
    ...(maxPrice !== 'all' ? [{ key: 'maxPrice', label: `до ${formatNumber(Number(maxPrice))} ₽`, onClear: () => setMaxPriceFilter('all') }] : []),
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header
        cityLabel={selectedCity?.name || 'Все города'}
        searchQuery={query}
        searchCity={city !== 'all' ? city : undefined}
        onSection={(section) => navigateFromCatalog(section)}
        onDestination={setCityFilter}
      />
      <main>
        <CatalogHero total={catalogTotal || publicData.stats.events || sourceSessions.length} />

        <section className="container-page -mt-8 pb-12 pt-0">
          <CatalogFilters
            query={query}
            setQuery={setQueryFilter}
            city={city}
            setCity={setCityFilter}
            cities={cities}
            category={category}
            setCategory={setCategoryFilter}
            categories={categories}
            landing={landing}
            setLanding={setLandingFilter}
            landings={landings}
            date={date}
            setDate={setDateFilter}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPriceFilter}
            priceSteps={priceSteps}
            reset={reset}
          />

          <div className="mt-5 min-w-0">
            <CatalogToolbar
              count={catalogTotal || visibleSessions.length}
              shown={visibleSessions.length}
              isLoading={isLoading}
              loadError={loadError}
              sort={sort}
              setSort={setSortFilter}
              mode={mode}
              setMode={setMode}
              activeFilters={activeFilters}
              reset={reset}
            />

            <QuickTags tags={subcategories} category={category} setCategory={setCategoryFilter} />

            <CatalogView sessions={visibleSessions} mode={mode} />
            <CatalogPagination
              total={catalogTotal}
              shown={visibleSessions.length}
              isLoading={isLoading}
              onLoadMore={() => setCatalogOffset(visibleSessions.length)}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CatalogHero({ total }: { total: number }) {
  return (
    <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
      <div className="container-page pb-16 pt-12 sm:pb-20 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2 text-sm text-primary-100/78">
          <a href="/" className="hover:text-white">Главная</a>
          <span>/</span>
          <span className="text-white">Каталог</span>
        </div>
        <div className="mt-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/86">
            <SlidersHorizontal className="h-4 w-4" />
            Каталог событий
          </div>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">События, экскурсии, музеи и билеты</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88 sm:text-lg">
            {total > 0 ? `${pluralEvents(total)} в каталоге Дайбилет: выбирайте город, дату, формат отдыха и сразу переходите к покупке у билетного партнера.` : 'Каталог Дайбилет: выбирайте город, дату, формат отдыха и сразу переходите к покупке у билетного партнера.'}
          </p>
        </div>
      </div>
    </section>
  );
}

function CatalogFilters({
  query,
  setQuery,
  city,
  setCity,
  cities,
  category,
  setCategory,
  categories,
  landing,
  setLanding,
  landings,
  date,
  setDate,
  maxPrice,
  setMaxPrice,
  priceSteps,
  reset,
}: {
  query: string;
  setQuery: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  cities: Array<{ name: string; events: number }>;
  category: string;
  setCategory: (value: string) => void;
  categories: Array<[string, number]>;
  landing: string;
  setLanding: (value: string) => void;
  landings: LandingFacet[];
  date: DateFilter;
  setDate: (value: DateFilter) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  priceSteps: number[];
  reset: () => void;
}) {
  const hasActiveFilters =
    Boolean(query.trim()) ||
    city !== 'all' ||
    category !== 'all' ||
    landing !== 'all' ||
    date !== 'all' ||
    maxPrice !== 'all';

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
      <label className="relative block">
        <span className="sr-only">Поиск</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название, место или событие"
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-10 text-sm text-slate-900 outline-none transition focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Очистить поиск"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SelectFilter label="Город" value={city} onChange={setCity}>
          <option value="all">Все города</option>
          {cities.map((item) => (
            <option key={item.name} value={item.name}>{item.name} · {item.events}</option>
          ))}
        </SelectFilter>

        <SelectFilter label="Категория" value={category} onChange={setCategory}>
          <option value="all">Все категории</option>
          {categories.map(([name, count]) => (
            <option key={name} value={name}>{name} · {count}</option>
          ))}
        </SelectFilter>

        <SelectFilter label="Подборка" value={landing} onChange={setLanding}>
          <option value="all">Все подборки</option>
          {landings.map((item) => (
            <option key={item.slug} value={item.slug}>{item.title} · {item.events}</option>
          ))}
        </SelectFilter>

        <SelectFilter label="Цена до" value={maxPrice} onChange={setMaxPrice}>
          <option value="all">Любая цена</option>
          {priceSteps.map((price) => (
            <option key={price} value={String(price)}>до {formatNumber(price)} ₽</option>
          ))}
        </SelectFilter>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Когда</p>
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'Любая дата'],
              ['today', 'Сегодня'],
              ['tomorrow', 'Завтра'],
              ['weekend', 'Выходные'],
              ['evening', 'Вечером'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDate(value as DateFilter)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  date === value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-primary-700 sm:mt-6"
          >
            <X className="h-3.5 w-3.5" />
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SelectFilter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
      >
        {children}
      </select>
    </label>
  );
}

function CatalogToolbar({
  count,
  shown,
  isLoading,
  loadError,
  sort,
  setSort,
  mode,
  setMode,
  activeFilters,
  reset,
}: {
  count: number;
  shown: number;
  isLoading: boolean;
  loadError: string | null;
  sort: SortMode;
  setSort: (value: SortMode) => void;
  mode: ViewMode;
  setMode: (value: ViewMode) => void;
  activeFilters: ActiveCatalogFilter[];
  reset: () => void;
}) {
  return (
    <section className="mb-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">{pluralEvents(count)}</h2>
          {isLoading ? <p className="mt-1 text-xs font-semibold text-primary-700">Обновляем выдачу...</p> : null}
          {loadError ? <p className="mt-1 text-xs font-semibold text-amber-700">API каталога не ответил: показываем локальный набор.</p> : null}
          <p className="mt-1 text-sm text-slate-500">Показано {formatNumber(shown)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-11 rounded-xl bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            <option value="time">Сначала ближайшие</option>
            <option value="price">Сначала дешевле</option>
            <option value="popular">По числу сеансов</option>
          </select>
          <div className="inline-flex overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <button
              type="button"
              title="Карточки"
              aria-label="Карточки"
              onClick={() => setMode('cards')}
              className={`inline-flex h-11 w-11 items-center justify-center ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Список"
              aria-label="Список"
              onClick={() => setMode('list')}
              className={`inline-flex h-11 w-11 items-center justify-center border-l border-slate-200 ${mode === 'list' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Таблица"
              aria-label="Таблица"
              onClick={() => setMode('table')}
              className={`inline-flex h-11 w-11 items-center justify-center border-l border-slate-200 ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Table2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {activeFilters.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.onClear}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
            >
              {filter.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <button type="button" onClick={reset} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Сбросить все</button>
        </div>
      ) : null}
    </section>
  );
}

function QuickTags({ tags, category, setCategory }: { tags: Array<[string, number]>; category: string; setCategory: (value: string) => void }) {
  if (!tags.length) return null;
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tags.map(([tag, count]) => (
        <button key={tag} type="button" onClick={() => setCategory(category === tag ? 'all' : tag)} className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition ${category === tag ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-100 hover:bg-primary-50 hover:text-primary-700'}`}>
          <Tag className="h-3.5 w-3.5" />
          {tag}
          <span className={category === tag ? 'text-white/70' : 'text-slate-400'}>{formatNumber(count)}</span>
        </button>
      ))}
    </div>
  );
}

function CatalogView({ mode, sessions }: { mode: ViewMode; sessions: PublicSession[] }) {
  if (mode === 'list') return <CatalogList sessions={sessions} />;
  if (mode === 'table') return <CatalogTable sessions={sessions} />;
  return <CatalogGrid sessions={sessions} />;
}

function CatalogGrid({ sessions }: { sessions: PublicSession[] }) {
  if (!sessions.length) return <EmptyCatalog />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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

function CatalogTable({ sessions }: { sessions: PublicSession[] }) {
  if (!sessions.length) return <EmptyCatalog />;
  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Дата</th>
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Город</th>
            <th className="px-4 py-3 font-semibold">Площадка</th>
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-top">
                <div className="font-medium text-slate-900">{session.dateLabel}</div>
                <div className="text-xs text-slate-500">{session.timeLabel}</div>
                {(session.sessionCount || 0) > 1 ? (
                  <div className="mt-1 text-xs font-semibold text-primary-700">{formatNumber(session.sessionCount)} сеансов</div>
                ) : null}
              </td>
              <td className="min-w-[300px] px-4 py-3 align-top">
                <a href={eventHref(session)} className="font-medium text-slate-950 hover:text-primary-700">
                  {session.title}
                </a>
                <div className="mt-1 text-xs text-slate-500">{collectCatalogLabels(session).join(' · ')}</div>
              </td>
              <td className="px-4 py-3 align-top">
                {session.citySlug ? (
                  <a href={`/cities/${session.citySlug}`} className="font-medium text-slate-700 hover:text-primary-700">
                    {session.destinationType === 'region' ? session.destination : session.city}
                  </a>
                ) : session.destinationType === 'region' ? (
                  session.destination
                ) : (
                  session.city
                )}
                {session.destinationType === 'region' && session.city ? (
                  <div className="mt-1 text-xs text-slate-500">{session.city}</div>
                ) : null}
              </td>
              <td className="max-w-[240px] px-4 py-3 align-top text-slate-600">
                {session.venueSlug ? (
                  <a href={`/venues/${session.venueSlug}`} className="hover:text-primary-700">
                    {session.venue}
                  </a>
                ) : (
                  session.venue
                )}
              </td>
              <td className="px-4 py-3 align-top text-slate-600">{session.category}</td>
              <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-950">{formatMoney(session.priceFrom)}</td>
              <td className="px-4 py-3 align-top">
                <a
                  href={eventHref(session)}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Открыть
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:bg-slate-300"
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
  return item.events >= 2;
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
  if (value === 'price' || value === 'popular') return value;
  return 'time';
}

function readStoredViewMode(): ViewMode | null {
  if (typeof window === 'undefined') return null;
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
  if (!Number.isFinite(price) || price < MIN_DISPLAY_PRICE_RUB) return 'all';
  return String(Math.round(price));
}

function syncCatalogUrl(filters: {
  query: string;
  city: string;
  category: string;
  landing: string;
  date: DateFilter;
  maxPrice: string;
  sort: SortMode;
  mode: ViewMode;
}) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query) params.set('q', query);
  if (filters.city !== 'all') params.set('city', filters.city);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.landing !== 'all') params.set('landing', filters.landing);
  if (filters.date !== 'all') params.set('date', filters.date);
  if (filters.maxPrice !== 'all') params.set('maxPrice', filters.maxPrice);
  if (filters.sort !== 'time') params.set('sort', filters.sort);
  if (filters.mode !== 'cards') params.set('view', filters.mode);

  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash || ''}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ''}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}

function getBrowserSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function pluralEvents(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} событий`;
  if (mod10 === 1) return `${formatNumber(count)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} события`;
  return `${formatNumber(count)} событий`;
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
