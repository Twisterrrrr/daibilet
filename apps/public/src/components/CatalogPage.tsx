import * as React from 'react';
import { Grid3X3, ListFilter, Search, SlidersHorizontal, Tag, X } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber, publicData } from '@/data';
import { eventHref } from '@/routes';
import type { PublicLanding, PublicSession } from '@/types';

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening';
type SortMode = 'time' | 'price' | 'popular';
type ViewMode = 'cards' | 'table';
type CatalogFacetItem = { name: string; events: number };
type LandingFacet = Pick<PublicLanding, 'slug' | 'title' | 'events'>;
type CatalogFacets = {
  cities: CatalogFacetItem[];
  categories: CatalogFacetItem[];
  tags: CatalogFacetItem[];
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

const CATALOG_PAGE_LIMIT = 180;
const MIN_DISPLAY_PRICE_RUB = 100;
const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

export function CatalogPage() {
  const [catalogSessions, setCatalogSessions] = React.useState<PublicSession[]>(() => publicData.sessions);
  const [catalogTotal, setCatalogTotal] = React.useState(() => publicData.sessions.length);
  const [catalogFacets, setCatalogFacets] = React.useState<Partial<CatalogFacets> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasLoadedCatalog, setHasLoadedCatalog] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [city, setCity] = React.useState(() => new URLSearchParams(window.location.search).get('city') || 'all');
  const [category, setCategory] = React.useState(() => new URLSearchParams(window.location.search).get('category') || 'all');
  const [landing, setLanding] = React.useState(() => new URLSearchParams(window.location.search).get('landing') || 'all');
  const [date, setDate] = React.useState<DateFilter>('all');
  const [maxPrice, setMaxPrice] = React.useState('all');
  const [sort, setSort] = React.useState<SortMode>('time');
  const [mode, setMode] = React.useState<ViewMode>('cards');

  React.useEffect(() => {
    document.title = 'Каталог событий, экскурсий и билетов | Дайбилет';
    upsertMeta('description', 'Полный каталог событий Дайбилет: фильтры по городу, дате, категории, цене, площадке и подборкам.');
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: String(CATALOG_PAGE_LIMIT), sort });
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
        setCatalogSessions(Array.isArray(payload.items) ? payload.items : []);
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
  }, [category, city, date, landing, maxPrice, query, sort]);

  const sourceSessions = hasLoadedCatalog ? catalogSessions : publicData.sessions;
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
  const tags = React.useMemo<Array<[string, number]>>(
    () => (facets.tags?.length ? facets.tags : fallbackFacets.tags).slice(0, 16).map((item) => [item.name, item.events]),
    [facets.tags, fallbackFacets.tags],
  );
  const landings = React.useMemo<LandingFacet[]>(() => {
    const source = facets.landings?.length ? facets.landings : publicData.landings.filter((item) => item.events > 0);
    return source.slice(0, 18);
  }, [facets.landings]);
  const priceSteps = facets.priceSteps?.length ? facets.priceSteps : fallbackFacets.priceSteps;
  const visibleSessions = sourceSessions;
  const selectedCity = cities.find((item) => item.name === city);

  const reset = () => {
    setQuery('');
    setCity('all');
    setCategory('all');
    setLanding('all');
    setDate('all');
    setMaxPrice('all');
    setSort('time');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header
        cityLabel={selectedCity?.name || 'Все города'}
        search={query}
        onSearch={setQuery}
        onSection={(section) => navigateFromCatalog(section)}
        onDestination={setCity}
      />
      <main>
        <CatalogHero total={catalogTotal || publicData.stats.events || sourceSessions.length} />

        <section className="container-page -mt-8 pb-12 pt-0">
          <CatalogFilters
            query={query}
            setQuery={setQuery}
            city={city}
            setCity={setCity}
            cities={cities}
            category={category}
            setCategory={setCategory}
            categories={categories}
            landing={landing}
            setLanding={setLanding}
            landings={landings}
            date={date}
            setDate={setDate}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
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
              setSort={setSort}
              mode={mode}
              setMode={setMode}
              activeLabels={activeFilterLabels({ city, category, landing, date, maxPrice, query }, landings)}
              reset={reset}
            />

            <QuickTags tags={tags} category={category} setCategory={setCategory} />

            {mode === 'cards' ? <CatalogGrid sessions={visibleSessions} /> : <CatalogTable sessions={visibleSessions} />}
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
  return (
    <section className="rounded-2xl bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.13)] sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.45fr)_repeat(4,minmax(150px,1fr))]">
        <label className="relative block lg:col-span-1">
          <span className="sr-only">Поиск</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Название, место, тег"
            className="h-12 w-full rounded-xl bg-slate-50 px-10 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-primary-200"
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

        <div className="flex flex-wrap items-center gap-2 lg:col-span-5">
          {[
            ['all', 'Любая дата'],
            ['today', 'Сегодня'],
            ['tomorrow', 'Завтра'],
            ['weekend', 'Выходные'],
            ['evening', 'Вечером'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDate(value as DateFilter)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${date === value ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
          <button type="button" onClick={reset} className="ml-auto inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-primary-700">
            <X className="h-3.5 w-3.5" />
            Сбросить
          </button>
        </div>
      </div>
    </section>
  );
}

function SelectFilter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-primary-200">
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
  activeLabels,
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
  activeLabels: string[];
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
            <button type="button" onClick={() => setMode('cards')} className={`inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Grid3X3 className="h-4 w-4" />
              Карточки
            </button>
            <button type="button" onClick={() => setMode('table')} className={`inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ListFilter className="h-4 w-4" />
              Таблица
            </button>
          </div>
        </div>
      </div>

      {activeLabels.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeLabels.map((label) => (
            <span key={label} className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">{label}</span>
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

function CatalogGrid({ sessions }: { sessions: PublicSession[] }) {
  if (!sessions.length) return <EmptyCatalog />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.slice(0, 120).map((session) => (
        <EventCard key={session.id} event={session} compact />
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
          {sessions.slice(0, 180).map((session) => (
            <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-top">
                <div className="font-medium text-slate-900">{session.dateLabel}</div>
                <div className="text-xs text-slate-500">{session.timeLabel}</div>
                {(session.sessionCount || 0) > 1 ? <div className="mt-1 text-xs font-semibold text-primary-700">{formatNumber(session.sessionCount)} сеансов</div> : null}
              </td>
              <td className="min-w-[300px] px-4 py-3 align-top">
                <a href={eventHref(session)} className="font-medium text-slate-950 hover:text-primary-700">{session.title}</a>
                <div className="mt-1 text-xs text-slate-500">{session.tags.slice(0, 2).join(' · ')}</div>
              </td>
              <td className="px-4 py-3 align-top">
                {session.citySlug ? (
                  <a href={`/cities/${session.citySlug}`} className="font-medium text-slate-700 hover:text-primary-700">
                    {session.destinationType === 'region' ? session.destination : session.city}
                  </a>
                ) : (
                  session.destinationType === 'region' ? session.destination : session.city
                )}
                {session.destinationType === 'region' && session.city ? <div className="mt-1 text-xs text-slate-500">{session.city}</div> : null}
              </td>
              <td className="max-w-[240px] px-4 py-3 align-top text-slate-600">
                {session.venueSlug ? <a href={`/venues/${session.venueSlug}`} className="hover:text-primary-700">{session.venue}</a> : session.venue}
              </td>
              <td className="px-4 py-3 align-top text-slate-600">{session.category}</td>
              <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-950">{formatMoney(session.priceFrom)}</td>
              <td className="px-4 py-3 align-top">
                <a href={eventHref(session)} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">Открыть</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    tags: countBy(sessions.flatMap((session) => session.tags || []))
      .filter(([tag]) => tag.length <= 32)
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
  const max = prices.at(-1) || 0;
  const candidates = [500, 1000, 1500, 2000, 3000, 5000].filter((price) => price <= max);
  return candidates.length ? candidates : [1000, 2000, 3000];
}

function isCatalogCityFacet(item: CatalogFacetItem) {
  const name = String(item.name || '').trim().toLowerCase();
  if (!name || name === 'не указан') return false;
  return item.events >= 2;
}

function activeFilterLabels(filters: { city: string; category: string; landing: string; date: DateFilter; maxPrice: string; query: string }, landings: LandingFacet[]) {
  const labels: string[] = [];
  if (filters.query.trim()) labels.push(`Поиск: ${filters.query.trim()}`);
  if (filters.city !== 'all') labels.push(filters.city);
  if (filters.category !== 'all') labels.push(filters.category);
  if (filters.landing !== 'all') labels.push(landings.find((item) => item.slug === filters.landing)?.title || filters.landing);
  if (filters.date !== 'all') labels.push(dateLabel(filters.date));
  if (filters.maxPrice !== 'all') labels.push(`до ${formatNumber(Number(filters.maxPrice))} ₽`);
  return labels;
}

function dateLabel(value: DateFilter) {
  if (value === 'today') return 'Сегодня';
  if (value === 'tomorrow') return 'Завтра';
  if (value === 'weekend') return 'Выходные';
  if (value === 'evening') return 'Вечером';
  return 'Любая дата';
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
