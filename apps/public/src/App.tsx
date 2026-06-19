import * as React from 'react';
import {
  ArrowRight,
  CalendarDays,
  Headphones,
  Landmark,
  MapPin,
  Search,
  Ship,
  Star,
  Ticket,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';

import { BuyerOrdersPage } from '@/components/BuyerOrdersPage';
import { CatalogPage } from '@/components/CatalogPage';
import { CityPage } from '@/components/CityPage';
import { EventCard } from '@/components/EventCard';
import { EventPage } from '@/components/EventPage';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LandingPage } from '@/components/LandingPage';
import { VenuePage } from '@/components/VenuePage';
import { formatMoney, formatNumber, publicData } from '@/data';
import type { PublicDestination, PublicLanding, PublicSession } from '@/types';

type PublicView = 'home' | 'events' | 'landings' | 'destinations';

const categoryMeta = [
  { title: 'Экскурсии', description: 'Пешие, автобусные и водные маршруты', filter: 'Экскурсии', icon: MapPin },
  { title: 'Музеи и арт', description: 'Выставки, музеи и арт-пространства', filter: 'Музеи', icon: Landmark },
  { title: 'Мероприятия', description: 'Концерты, театр, шоу и стендап', filter: 'Мероприятия', icon: Ticket },
  { title: 'Активный отдых', description: 'Спорт, активности и необычные форматы', filter: 'Активный отдых', icon: TrendingUp },
];
const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';

export function App({ dataVersion = 0 }: { dataVersion?: number }) {
  if (window.location.pathname === '/cities' || window.location.pathname === '/cities/') return <CitiesCatalogPage />;
  if (window.location.pathname === '/my-orders' || window.location.pathname === '/my-orders/') return <BuyerOrdersPage />;
  if (window.location.pathname === '/blog' || window.location.pathname === '/blog/') return <StaticInfoPage kind="blog" />;
  if (window.location.pathname === '/privacy' || window.location.pathname === '/privacy/') return <StaticInfoPage kind="privacy" />;
  if (window.location.pathname === '/legal' || window.location.pathname === '/legal/') return <StaticInfoPage kind="legal" />;
  if (window.location.pathname === '/offer' || window.location.pathname === '/offer/') return <StaticInfoPage kind="offer" />;

  const venuePageMatch = window.location.pathname.match(/^\/venues\/([^/]+)\/?$/);
  if (venuePageMatch) return <VenuePage slug={decodeURIComponent(venuePageMatch[1])} />;

  const cityPageMatch = window.location.pathname.match(/^\/cities\/([^/]+)\/?$/);
  if (cityPageMatch) return <CityPage slug={decodeURIComponent(cityPageMatch[1])} />;

  const landingPageMatch = window.location.pathname.match(/^\/landings\/([^/]+)\/?$/);
  if (landingPageMatch) return <LandingPage slug={decodeURIComponent(landingPageMatch[1])} />;

  if (window.location.pathname === '/events' || window.location.pathname === '/events/') return <CatalogPage />;

  const eventPageMatch = window.location.pathname.match(/^\/events\/([^/]+)\/?$/);
  if (eventPageMatch) return <EventPage slug={decodeURIComponent(eventPageMatch[1])} />;

  const [view, setView] = React.useState<PublicView>('home');
  const [query, setQuery] = React.useState('');
  const [destination, setDestination] = React.useState('all');
  const [landing, setLanding] = React.useState('all');
  const [category, setCategory] = React.useState('all');

  const selectedDestination = destination === 'all' ? null : publicData.destinations.find((item) => item.name === destination);
  const selectedCityName = selectedDestination?.type === 'city' ? selectedDestination.name : null;

  const filteredSessions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return publicData.sessions.filter((event) => {
      if (destination !== 'all' && event.destination !== destination && event.city !== destination) return false;
      if (landing !== 'all' && !event.landingSlugs.includes(landing)) return false;
      if (category !== 'all' && event.category !== category && !event.tags.some((tag) => tag.toLowerCase().includes(category.toLowerCase()))) return false;

      if (normalizedQuery) {
        const haystack = [event.title, event.city, event.venue, event.category, ...event.tags].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [category, dataVersion, destination, landing, query]);

  const popularEvents = React.useMemo(
    () => uniqueByImage(filteredSessions.filter((event) => event.imageUrl), 8).concat(uniqueByImage(filteredSessions, 8)).slice(0, 8),
    [filteredSessions],
  );

  const nearestEvents = React.useMemo(
    () =>
      uniqueByImage(
        [...filteredSessions]
          .filter((event) => event.startsAt)
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
        8,
      ),
    [filteredSessions],
  );

  const topDestinations = React.useMemo(() => [...publicData.destinations].sort((a, b) => b.events - a.events).slice(0, 5), [dataVersion]);
  const popularTags = React.useMemo(() => buildPopularTags(publicData.sessions, 18), [dataVersion]);

  const showSection = (section: string) => {
    if (section === 'top') {
      setView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (section === 'events') {
      window.location.href = '/events';
      return;
    }
    if (section === 'cities') {
      window.location.href = '/cities';
      return;
    }
    if (section === 'blog') {
      window.location.href = '/blog';
      return;
    }
    if (section === 'orders') {
      window.location.href = '/my-orders';
      return;
    }
    if (section === 'landings') setView('landings');
    if (section === 'destinations') setView('destinations');

    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const resetFilters = () => {
    setDestination('all');
    setLanding('all');
    setCategory('all');
    setQuery('');
    setView('home');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header
        cityLabel={selectedDestination?.name || 'Все города'}
        search={query}
        onSearch={setQuery}
        onSection={showSection}
        onDestination={setDestination}
      />

      <main>
        <HomeHero
          visibleCount={filteredSessions.length}
          totalEvents={publicData.stats.events}
          totalCities={publicData.destinations.filter((item) => item.type === 'city').length}
          totalVenues={publicData.stats.venues}
          destination={destination}
          setDestination={setDestination}
          topDestinations={topDestinations}
          onOpenEvents={() => showSection('events')}
          onReset={resetFilters}
        />

        {(view === 'home' || view === 'events') && (
          <>
            <EventsSection
              title={selectedCityName ? `Популярные события в ${cityToPrepositional(selectedCityName)}` : 'Популярные события'}
              subtitle={selectedCityName ? 'Лучшие экскурсии и мероприятия в выбранном городе' : 'Лучшие экскурсии и мероприятия по рейтингу и наполненности карточек'}
              events={popularEvents}
              topDestinations={topDestinations}
              destination={destination}
              onDestination={setDestination}
              onReset={resetFilters}
            />

            <EventsSection
              title={selectedCityName ? `Ближайшие события в ${cityToPrepositional(selectedCityName)}` : 'Ближайшие события'}
              subtitle={selectedCityName ? 'Начнутся скоро в выбранном городе' : 'Скоро начинаются, удобно купить без долгого поиска'}
              events={nearestEvents}
              topDestinations={topDestinations}
              destination={destination}
              onDestination={setDestination}
              onReset={resetFilters}
              muted
            />
          </>
        )}

        {(view === 'home' || view === 'landings') && (
          <PromoSection
            landings={publicData.landings}
            onLanding={(slug) => {
              setLanding(slug);
              showSection('events');
            }}
          />
        )}

        {(view === 'home' || view === 'destinations') && (
          <CitiesSection
            destinations={publicData.destinations}
            onDestination={(name) => {
              setDestination(name);
              showSection('events');
            }}
          />
        )}

        <CategoriesSection
          tags={popularTags}
          onCategory={(value) => {
            setCategory(value);
            setView('events');
            showSection('events');
          }}
          onTag={(value) => {
            setQuery(value);
            setView('events');
            showSection('events');
          }}
        />

        <SocialProof />
        <BottomCta onOpenEvents={() => showSection('events')} />
      </main>
      <Footer />
    </div>
  );
}

function CitiesCatalogPage() {
  const [query, setQuery] = React.useState('');
  const [type, setType] = React.useState<'all' | 'city' | 'region'>('all');
  const [destinations, setDestinations] = React.useState<PublicDestination[]>(() => publicData.destinations);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`${API_BASE_URL}/api/public/home`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { destinations?: PublicDestination[] };
      })
      .then((payload) => {
        if (Array.isArray(payload.destinations)) setDestinations(payload.destinations);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const cities = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return destinations
      .filter((item) => type === 'all' || item.type === type)
      .filter((item) => !normalized || item.name.toLowerCase().includes(normalized))
      .sort((a, b) => b.events - a.events || b.venues - a.venues || itemSortName(a).localeCompare(itemSortName(b), 'ru'));
  }, [destinations, query, type]);
  const totalEvents = cities.reduce((sum, item) => sum + item.events, 0);
  const totalVenues = cities.reduce((sum, item) => sum + item.venues, 0);

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'orders') window.location.href = '/my-orders';
    else if (section === 'landings') window.location.href = '/#landings';
    else if (section === 'blog') window.location.href = '/blog';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else window.location.href = `/#${section}`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" search={query} onSearch={setQuery} onSection={goSection} />
      <main>
        <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
          <div className="container-page py-14 sm:py-16">
            <div className="flex flex-wrap items-center gap-2 text-sm text-primary-100/78">
              <a href="/" className="hover:text-white">Главная</a>
              <span>/</span>
              <span className="text-white">Города</span>
            </div>
            <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/86">
                  <MapPin className="h-4 w-4" />
                  Каталог городов
                </div>
                <h1 className="mt-4 max-w-4xl text-4xl font-extrabold sm:text-5xl">Города и регионы Дайбилет</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88 sm:text-lg">
                  Выберите город, чтобы открыть страницу с событиями, площадками, подборками и быстрым каталогом по датам.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CityCatalogStat label="городов" value={formatNumber(destinations.filter((item) => item.type === 'city').length)} />
                <CityCatalogStat label="событий" value={formatNumber(totalEvents)} />
                <CityCatalogStat label="площадок" value={formatNumber(totalVenues)} />
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-8">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="flex h-11 min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-primary-300">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти город или область"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'Все'],
                ['city', 'Города'],
                ['region', 'Регионы'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value as typeof type)}
                  className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${type === value ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cities.map((city) => (
              <a key={`${city.type}:${city.name}`} href={city.slug ? `/cities/${city.slug}` : `/events?city=${encodeURIComponent(city.name)}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/35">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-slate-950">{city.name}</div>
                    <div className="mt-1 text-xs font-semibold uppercase text-slate-400">{city.type === 'region' ? 'регион' : 'город'}</div>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-slate-300" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="font-bold text-slate-950">{formatNumber(city.events)}</div>
                    <div className="text-slate-500">событий</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="font-bold text-slate-950">{formatNumber(city.venues)}</div>
                    <div className="text-slate-500">площадок</div>
                  </div>
                </div>
                {city.categories.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {city.categories.slice(0, 3).map((category) => (
                      <span key={category.name} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                        {category.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </a>
            ))}
          </div>

          {isLoading && !cities.length ? <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">Загружаем города...</div> : null}
          {!isLoading && !cities.length ? <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">Ничего не найдено.</div> : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CityCatalogStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/10 p-4 text-center backdrop-blur-sm">
      <div className="text-2xl font-extrabold text-white">{value}</div>
      <div className="text-xs font-medium text-white/62">{label}</div>
    </div>
  );
}

function itemSortName(item: PublicDestination) {
  return item.name;
}

function StaticInfoPage({ kind }: { kind: 'blog' | 'privacy' | 'legal' | 'offer' }) {
  const meta = {
    blog: {
      title: 'Статьи',
      paragraphs: [
        'Скоро здесь появятся городские гиды, подборки по датам, маршруты, советы перед покупкой и ссылки на события из каталога.',
        'Пока все актуальные предложения собраны в каталоге, городских страницах и тематических подборках.',
      ],
    },
    privacy: {
      title: 'Политика конфиденциальности',
      paragraphs: [
        'Дайбилет хранит только данные, которые помогают найти заказ, проверить статус билета и обработать обращение покупателя. Оплата, кассовые чеки и платежные данные остаются на стороне билетной системы.',
        'Если пользователь обращается за помощью, мы можем использовать номер заказа, контакт, название события, дату сеанса и статус билета. Для удаления или уточнения данных можно написать на hello@daibilet.ru.',
      ],
    },
    legal: {
      title: 'Правовая информация',
      paragraphs: [
        'Дайбилет работает как информационный агрегатор событий и помогает перейти к покупке у билетного партнера. Финансовый контур, прием оплаты, оформление чеков, правила возврата и итоговые условия покупки определяются билетной системой или организатором.',
        'Мы стремимся поддерживать актуальность каталога, но расписание, наличие мест, тарифы и возрастные ограничения нужно проверять в виджете или интерфейсе партнера перед оплатой.',
      ],
    },
    offer: {
      title: 'Оферта для партнеров',
      paragraphs: [
        'Для подключения событий к Дайбилет можно написать на hello@daibilet.ru. На первом этапе мы работаем через импорт каталога и виджеты покупки билетных систем.',
        'Партнерский кабинет и расширенные инструменты поставщика будут добавлены после запуска основного каталога и первых продаж.',
      ],
    },
  }[kind];

  const goSection = (section: string) => {
    if (section === 'top') window.location.href = '/';
    else if (section === 'events') window.location.href = '/events';
    else if (section === 'orders') window.location.href = '/my-orders';
    else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
    else if (section === 'blog') window.location.href = '/blog';
    else window.location.href = `/#${section}`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" search="" onSearch={() => undefined} onSection={goSection} />
      <main className="container-page py-16">
        <a href="/" className="text-sm font-semibold text-primary-700 hover:text-primary-800">Главная</a>
        <h1 className="mt-4 text-4xl font-extrabold text-slate-950">{meta.title}</h1>
        <div className="mt-4 grid max-w-3xl gap-4 text-base leading-7 text-slate-600">
          {meta.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function HomeHero({
  visibleCount,
  totalEvents,
  totalCities,
  totalVenues,
  destination,
  setDestination,
  topDestinations,
  onOpenEvents,
  onReset,
}: {
  visibleCount: number;
  totalEvents: number;
  totalCities: number;
  totalVenues: number;
  destination: string;
  setDestination: (value: string) => void;
  topDestinations: PublicDestination[];
  onOpenEvents: () => void;
  onReset: () => void;
}) {
  const displayEvents = totalEvents || visibleCount;
  const isCatalogLoading = displayEvents === 0 && totalCities === 0 && totalVenues === 0;
  return (
    <section className="relative overflow-visible bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="container-page relative py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Билеты на экскурсии, музеи{' '}
            <span className="block text-primary-300">и мероприятия</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-300">
            {isCatalogLoading
              ? 'Загружаем каталог городов, событий и площадок. Покупка завершится в виджете билетной системы.'
              : `${formatCount(displayEvents, ['событие', 'события', 'событий'])} и ${formatCount(totalVenues, ['площадка', 'площадки', 'площадок'])} в ${formatCount(totalCities, ['городе', 'городах', 'городах'])}. Выбирайте город, тему и формат, а покупку завершайте в виджете билетной системы.`}
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <HeroCitySearch destination={destination} setDestination={setDestination} onSubmit={onOpenEvents} />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {destination !== 'all' && (
              <button
                type="button"
                onClick={onReset}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/85 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
              >
                Все города
              </button>
            )}
            {topDestinations.map((item) => (
              <button
                key={`${item.type}:${item.name}`}
                type="button"
                onClick={() => setDestination(item.name)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-all ${
                  destination === item.name
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCitySearch({
  destination,
  setDestination,
  onSubmit,
}: {
  destination: string;
  setDestination: (value: string) => void;
  onSubmit: () => void;
}) {
  const [query, setQuery] = React.useState(destination === 'all' ? '' : destination);
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setQuery(destination === 'all' ? '' : destination);
  }, [destination]);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filteredCities = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const cities = publicData.destinations.filter((item) => item.type === 'city');
    if (!normalized) return cities.sort((a, b) => b.events - a.events).slice(0, 5);
    return cities.filter((city) => city.name.toLowerCase().includes(normalized)).slice(0, 8);
  }, [query]);

  const submit = () => {
    const normalized = query.trim().toLowerCase();
    const exact = publicData.destinations.find((item) => item.name.toLowerCase() === normalized);
    if (exact) setDestination(exact.name);
    onSubmit();
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-lg sm:rounded-l-xl sm:rounded-r-none">
          <MapPin className="h-5 w-5 flex-shrink-0 text-primary-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Выберите город или введите название"
            className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        {isOpen && filteredCities.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-64 overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
            {filteredCities.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => {
                  setQuery(city.name);
                  setDestination(city.name);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-primary-50"
              >
                <span className="font-medium text-slate-700">{city.name}</span>
                <span className="text-xs text-slate-400">{pluralEvents(city.events)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={submit}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98] sm:rounded-l-none sm:rounded-r-xl"
      >
        <Search className="h-5 w-5" />
        <span>Найти</span>
      </button>
    </div>
  );
}

function EventsSection({
  title,
  subtitle,
  events,
  topDestinations,
  destination,
  onDestination,
  onReset,
  muted = false,
}: {
  title: string;
  subtitle: string;
  events: PublicSession[];
  topDestinations: PublicDestination[];
  destination: string;
  onDestination: (value: string) => void;
  onReset: () => void;
  muted?: boolean;
}) {
  return (
    <section id="events" className={`py-12 sm:py-16 ${muted ? 'bg-slate-50' : ''}`}>
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
            <p className="mt-1 text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {destination !== 'all' && (
              <button
                type="button"
                onClick={onReset}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Сбросить
              </button>
            )}
            <button
              type="button"
              onClick={() => onDestination('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                destination === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              Все города
            </button>
            {topDestinations.map((city) => (
              <button
                key={`${city.type}:${city.name}`}
                type="button"
                onClick={() => onDestination(city.name)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  destination === city.name
                    ? 'bg-primary-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {events.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-3 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {events.map((event) => (
              <EventCard key={`${title}:${event.id}`} event={event} compact />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-slate-500">В этой выборке пока нет событий. Попробуйте другой город или тему.</p>
        )}

        <div className="mt-6 flex justify-center">
          <a href="/events" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            Все события <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function PromoSection({ landings, onLanding }: { landings: PublicLanding[]; onLanding: (slug: string) => void }) {
  const featured = landings.filter((landing) => landing.events > 0).slice(0, 6);
  if (!featured.length) return null;

  return (
    <section id="landings" className="py-12 sm:py-16">
      <div className="container-page">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Сезонные предложения</h2>
        <p className="mt-1 text-slate-500">Лучшие события и экскурсии сезона, собранные в быстрые подборки</p>
        <div className="mt-6 grid grid-cols-1 gap-3 min-[361px]:grid-cols-2 md:grid-cols-3">
          {featured.map((landing, index) => (
            <button
              key={landing.slug}
              type="button"
              onClick={() => onLanding(landing.slug)}
              className={`group relative overflow-hidden rounded-xl p-5 text-left text-white shadow-lg transition-transform hover:scale-[1.02] sm:p-6 ${promoGradient(index)}`}
            >
              {index % 3 === 0 ? <Ship className="mb-3 h-8 w-8 opacity-80" /> : index % 3 === 1 ? <CalendarDays className="mb-3 h-8 w-8 opacity-80" /> : <UtensilsCrossed className="mb-3 h-8 w-8 opacity-80" />}
              <h3 className="text-lg font-bold">{landing.title}</h3>
              <p className="mt-1 text-sm text-white/80">{landing.subtitle}</p>
              <div className="mt-4 text-sm font-semibold">{pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}</div>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function CitiesSection({
  destinations,
  onDestination,
}: {
  destinations: PublicDestination[];
  onDestination: (name: string) => void;
}) {
  const cities = destinations.filter((item) => item.type === 'city').slice(0, Math.ceil(destinations.length / 2));
  if (!cities.length) return null;

  return (
    <section id="destinations" className="py-16 sm:py-20">
      <div className="container-page">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Города</h2>
            <p className="mt-1 text-slate-500">Выберите город, покажем лучшие события и площадки</p>
          </div>
          <a href="/cities" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Все города →
          </a>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {cities.map((city) => (
            <CityCard key={city.name} city={city} onClick={() => onDestination(city.name)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CityCard({ city, onClick }: { city: PublicDestination; onClick: () => void }) {
  const content = (
    <div className="card group relative flex h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-primary-800 to-primary-950 transition-transform hover:scale-[1.02]">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="relative p-5">
        <h3 className="text-xl font-bold text-white">{city.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            {pluralEvents(city.events)}
          </span>
          {city.venues > 0 ? <span className="text-sm text-white/60">{formatNumber(city.venues)} площадок</span> : null}
        </div>
      </div>
    </div>
  );

  if (city.slug) {
    return <a href={`/cities/${city.slug}`}>{content}</a>;
  }

  return (
    <button type="button" onClick={onClick} className="text-left">
      {content}
    </button>
  );
}

function CategoriesSection({
  tags,
  onCategory,
  onTag,
}: {
  tags: Array<{ name: string; events: number }>;
  onCategory: (value: string) => void;
  onTag: (value: string) => void;
}) {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <h2 className="text-3xl font-bold text-slate-900">Что посмотреть</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categoryMeta.map(({ title, description, filter, icon: Icon }) => (
            <button
              key={title}
              type="button"
              onClick={() => onCategory(filter)}
              className="card flex items-center gap-4 p-6 text-left transition-transform hover:scale-[1.02]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-slate-400" />
            </button>
          ))}
        </div>

        {tags.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-700">Популярные темы</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => onTag(tag.name)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-primary-300 hover:text-primary-700 hover:shadow-md"
                >
                  {tag.name}
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                    {formatNumber(tag.events)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SocialProof() {
  const totalEvents = publicData.stats.events;
  const totalVenues = publicData.stats.venues;
  const totalCities = publicData.stats.destinations;

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-6 min-[361px]:grid-cols-2 sm:gap-8 md:grid-cols-3 lg:grid-cols-4">
          <ProofItem icon={Ticket} value={`${formatNumber(totalEvents)}+`} label="событий и сеансов в каталоге" color="primary" />
          <ProofItem icon={Landmark} value={`${formatNumber(totalVenues)}+`} label="площадок и музеев" color="emerald" />
          <ProofItem icon={MapPin} value={formatNumber(totalCities)} label="городов и регионов" color="amber" />
          <ProofItem icon={Star} value="4.8" label="целевой рейтинг витрины" color="purple" />
        </div>
      </div>
    </section>
  );
}

function ProofItem({ icon: Icon, value, label, color }: { icon: typeof Ticket; value: string; label: string; color: 'primary' | 'emerald' | 'amber' | 'purple' }) {
  const styles = {
    primary: 'bg-primary-100 text-primary-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="text-center">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${styles[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function BottomCta({ onOpenEvents }: { onOpenEvents: () => void }) {
  return (
    <section id="partner" className="bg-gradient-to-r from-primary-600 to-primary-800 py-14 sm:py-18">
      <div className="container-page">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Нужна помощь с выбором?</h2>
            <p className="mt-2 max-w-lg text-base text-white/70">
              Собираем события из билетных систем, показываем понятную витрину и ведем к покупке в виджете поставщика.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onOpenEvents}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
            >
              <Ticket className="h-5 w-5" />
              Смотреть каталог
            </button>
            <a
              href="mailto:hello@daibilet.ru"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/50 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              <Headphones className="h-5 w-5" />
              Написать нам
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function uniqueByImage(events: PublicSession[], max: number): PublicSession[] {
  const seenTitles = new Set<string>();
  const seenImages = new Set<string>();
  const result: PublicSession[] = [];

  for (const event of events) {
    const title = event.title.trim().toLowerCase();
    const image = (event.imageUrl || '').trim();
    if (title && seenTitles.has(title)) continue;
    if (image && seenImages.has(image)) continue;

    if (title) seenTitles.add(title);
    if (image) seenImages.add(image);
    result.push(event);
    if (result.length >= max) break;
  }

  return result;
}

function buildPopularTags(events: PublicSession[], limit: number): Array<{ name: string; events: number }> {
  const counts = new Map<string, number>();

  for (const event of events) {
    for (const tag of event.tags) {
      if (!tag || tag.length > 32) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, events]) => ({ name, events }));
}

function pluralEvents(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} событий`;
  if (mod10 === 1) return `${formatNumber(count)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} события`;
  return `${formatNumber(count)} событий`;
}

function formatCount(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${formatNumber(count)} ${form}`;
}

function cityToPrepositional(city: string): string {
  const normalized = city.trim();
  const dictionary: Record<string, string> = {
    Москва: 'Москве',
    'Санкт-Петербург': 'Санкт-Петербурге',
    Казань: 'Казани',
    Сочи: 'Сочи',
    Калининград: 'Калининграде',
  };

  return dictionary[normalized] || normalized;
}

function promoGradient(index: number): string {
  const variants = [
    'bg-gradient-to-br from-primary-700 to-primary-950',
    'bg-gradient-to-br from-emerald-600 to-slate-900',
    'bg-gradient-to-br from-amber-500 to-orange-700',
    'bg-gradient-to-br from-sky-600 to-indigo-900',
    'bg-gradient-to-br from-rose-600 to-slate-900',
    'bg-gradient-to-br from-violet-600 to-primary-950',
  ];

  return variants[index % variants.length];
}
