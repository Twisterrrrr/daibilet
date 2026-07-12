import * as React from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Landmark,
  MapPin,
  Search,
  Ship,
  Ticket,
  UtensilsCrossed,
} from 'lucide-react';

import { AccountPurchasesPage } from '@/components/AccountPurchasesPage';
import { BuyerOrdersPage } from '@/components/BuyerOrdersPage';
import { CitiesCatalogPage } from '@/components/CitiesCatalogPage';
import { CityCard } from '@/components/CityCard';
import { CityPicker } from '@/components/CityPicker';
import { HomeHeroBackground } from '@/components/HomeHeroBackground';
import { LocationsCatalogPage } from '@/components/LocationsCatalogPage';
import { VenuesCatalogPage } from '@/components/VenuesCatalogPage';
import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HelpPage } from '@/components/HelpPage';
import { AboutPage } from '@/components/AboutPage';
import { BlogPage } from '@/components/BlogPage';
import { BlogArticlePage } from '@/components/BlogArticlePage';
import { LegalTrustPage, OfferTrustPage, PrivacyTrustPage, RequisitesTrustPage } from '@/components/trust/TrustPages';
import { LandingsCatalogPage } from '@/components/LandingsCatalogPage';
import { LoginPage } from '@/components/LoginPage';
import { InstitutionCard } from '@/components/InstitutionCard';
import {
  formatMoney,
  formatNumber,
  formatStatCount,
  isMeaningfulStatCount,
  publicData,
  roundStatToTen,
} from '@/data';
import { BLOG_POSTS } from '@/data/blog-posts';
import { cityToPrepositional } from '@/lib/city-declension';
import { filterSessionsWithCoverImage } from '@/lib/session-cover-image';
import { resolveCityCardImage } from '@/lib/city-images';
import { buildHomePageSections } from '@/lib/home-page-sections';
import { pickDefaultHomeNowTab, type HomeNowTabKey } from '@/lib/home-now-section';
import {
  HERO_QUICK_CHIPS,
  HOME_FORMAT_TILES,
  HOME_TRUST_ITEMS,
} from '@/lib/home-scenarios';
import { resolveLegacyLandingRedirect, resolveLandingRouteFromLocation } from '@/lib/landing-routes';
import { landingPageHref } from '@/lib/landing-slugs';
import { venuePageTemplate } from '@/lib/venue-meta';
import { API_BASE_URL } from '@/lib/api-base';
import { readCachedInstitutionVenues, writeCachedInstitutionVenues } from '@/lib/venues-catalog-cache';
import { persistDestination, resolveStoredDestination } from '@/lib/selected-city';
import { cityHref, citySlug, venueHref } from '@/routes';
import type { PublicDestination, PublicLanding, PublicSession, PublicVenue } from '@/types';

const HERO_DATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Любая дата' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'Выходные' },
];

const CatalogPage = React.lazy(() => import('@/components/CatalogPage').then((module) => ({ default: module.CatalogPage })));
const CityPage = React.lazy(() => import('@/components/CityPage').then((module) => ({ default: module.CityPage })));
const EventPage = React.lazy(() => import('@/components/EventPage').then((module) => ({ default: module.EventPage })));
const LandingPage = React.lazy(() => import('@/components/LandingPage').then((module) => ({ default: module.LandingPage })));
const VenuePage = React.lazy(() => import('@/components/VenuePage').then((module) => ({ default: module.VenuePage })));

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white text-slate-900">
          <div className="container-page py-16 text-sm text-slate-500">Загружаем страницу...</div>
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
}

export function App({ dataVersion = 0 }: { dataVersion?: number }) {
  if (window.location.pathname === '/cities' || window.location.pathname === '/cities/') return <CitiesCatalogPage />;
  if (window.location.pathname === '/venues' || window.location.pathname === '/venues/') return <VenuesCatalogPage />;
  if (window.location.pathname === '/locations' || window.location.pathname === '/locations/') {
    return <LocationsCatalogPage />;
  }
  if (window.location.pathname === '/podborki' || window.location.pathname === '/podborki/') {
    return <LandingsCatalogPage dataVersion={dataVersion} />;
  }
  if (window.location.pathname === '/my-orders' || window.location.pathname === '/my-orders/') return <BuyerOrdersPage />;
  if (window.location.pathname === '/login' || window.location.pathname === '/login/') return <LoginPage />;
  if (window.location.pathname === '/account/purchases' || window.location.pathname === '/account/purchases/') {
    return <AccountPurchasesPage />;
  }
  if (window.location.pathname === '/about' || window.location.pathname === '/about/') return <AboutPage />;
  if (window.location.pathname === '/help' || window.location.pathname === '/help/') return <HelpPage />;
  if (window.location.pathname === '/blog' || window.location.pathname === '/blog/') return <BlogPage />;

  const blogArticleMatch = window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogArticleMatch) {
    return <BlogArticlePage slug={decodeURIComponent(blogArticleMatch[1])} />;
  }
  if (window.location.pathname === '/privacy' || window.location.pathname === '/privacy/') return <PrivacyTrustPage />;
  if (window.location.pathname === '/legal' || window.location.pathname === '/legal/') return <LegalTrustPage />;
  if (window.location.pathname === '/offer' || window.location.pathname === '/offer/') return <OfferTrustPage />;
  if (window.location.pathname === '/requisites' || window.location.pathname === '/requisites/') return <RequisitesTrustPage />;

  const venuePageMatch = window.location.pathname.match(/^\/venues\/([^/]+)\/?$/);
  if (venuePageMatch) {
    return (
      <PageSuspense>
        <VenuePage slug={decodeURIComponent(venuePageMatch[1])} />
      </PageSuspense>
    );
  }

  const locationPageMatch = window.location.pathname.match(/^\/locations\/([^/]+)\/?$/);
  if (locationPageMatch) {
    return (
      <PageSuspense>
        <VenuePage slug={decodeURIComponent(locationPageMatch[1])} />
      </PageSuspense>
    );
  }

  const cityPageMatch = window.location.pathname.match(/^\/cities\/([^/]+)\/?$/);
  if (cityPageMatch) {
    return (
      <PageSuspense>
        <CityPage slug={decodeURIComponent(cityPageMatch[1])} />
      </PageSuspense>
    );
  }

  const legacyLandingRedirect = resolveLegacyLandingRedirect(window.location.pathname);
  if (legacyLandingRedirect) {
    window.location.replace(legacyLandingRedirect);
    return null;
  }

  const categoryLandingRoute = resolveLandingRouteFromLocation(window.location.pathname);
  if (categoryLandingRoute) {
    return (
      <PageSuspense>
        <LandingPage
          slug={categoryLandingRoute.landingSlug}
          citySlug={categoryLandingRoute.citySlug}
        />
      </PageSuspense>
    );
  }

  if (window.location.pathname === '/events' || window.location.pathname === '/events/') {
    return (
      <PageSuspense>
        <CatalogPage />
      </PageSuspense>
    );
  }

  const eventPageMatch = window.location.pathname.match(/^\/events\/([^/]+)\/?$/);
  if (eventPageMatch) {
    return (
      <PageSuspense>
        <EventPage slug={decodeURIComponent(eventPageMatch[1])} />
      </PageSuspense>
    );
  }

  const [destination, setDestinationState] = React.useState(() => resolveStoredDestination());
  const [heroQuery, setHeroQuery] = React.useState('');
  const [heroDate, setHeroDate] = React.useState('all');

  const setDestination = React.useCallback((value: string) => {
    const scrollY = window.scrollY;
    setDestinationState(value);
    persistDestination(value);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, []);

  const selectedDestination = destination === 'all' ? null : publicData.destinations.find((item) => item.name === destination);
  const selectedCityName = selectedDestination?.type === 'city' ? selectedDestination.name : null;

  const filteredSessions = React.useMemo(() => {
    return filterSessionsWithCoverImage(
      publicData.sessions.filter((event) => {
        if (destination !== 'all' && event.destination !== destination && event.city !== destination) return false;
        return true;
      }),
    );
  }, [dataVersion, destination]);

  const homePageSections = React.useMemo(
    () => buildHomePageSections(filteredSessions, { cityName: selectedCityName }),
    [filteredSessions, selectedCityName],
  );
  const { editorsPick: homeEditorsPick, homeNowTabs, popular: homePopular } = homePageSections;

  const openCatalog = React.useCallback(
    (extra: Record<string, string> = {}) => {
      const params = new URLSearchParams();
      const query = (extra.q ?? heroQuery).trim();
      if (query) params.set('q', query);
      const city = extra.city ?? (destination !== 'all' ? destination : '');
      if (city && city !== 'all') params.set('city', city);
      if (extra.date && extra.date !== 'all') params.set('date', extra.date);
      else if (heroDate !== 'all') params.set('date', heroDate);
      if (extra.sort && extra.sort !== 'time') params.set('sort', extra.sort);
      if (extra.category && extra.category !== 'all') params.set('category', extra.category);
      const suffix = params.toString();
      window.location.href = suffix ? `/events?${suffix}` : '/events';
    },
    [destination, heroDate, heroQuery],
  );

  const showSection = (section: string) => {
    if (section === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (section === 'events') {
      openCatalog();
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
    if (section === 'landings') {
      window.location.href = '/podborki';
      return;
    }

    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header
        cityLabel={selectedDestination?.name || 'Все города'}
        onSection={showSection}
        onDestination={setDestination}
        searchCity={destination !== 'all' ? destination : undefined}
      />

      <main>
        <HomeHero
          destination={destination}
          selectedCityName={selectedCityName}
          selectedDestination={selectedDestination}
          dataVersion={dataVersion}
          heroQuery={heroQuery}
          heroDate={heroDate}
          setHeroQuery={setHeroQuery}
          setHeroDate={setHeroDate}
          setDestination={setDestination}
          onOpenCatalog={openCatalog}
        />

        {homeEditorsPick.length > 0 ? (
          <EditorsPickSection
            events={homeEditorsPick}
            onOpenCatalog={() => openCatalog({ sort: 'popular' })}
          />
        ) : null}

        <CitiesSection destinations={publicData.destinations} />

        {homeNowTabs.length > 0 ? (
          <HomeNowSection tabs={homeNowTabs} onOpenCatalog={openCatalog} />
        ) : null}

        {homePopular.length > 0 ? (
          <PopularNowSection
            events={homePopular}
            sparseCatalog={filteredSessions.length < 12}
            onOpenCatalog={() => openCatalog({ sort: 'popular' })}
          />
        ) : null}

        <HomeFormatSection />

        <HomeVenuesSection />

        <PromoSection landings={publicData.landings} cityFilter={destination !== 'all' ? destination : undefined} />

        <HomeBlogSection />

        <HomeTrustSection />

        <PartnerCta />
      </main>
      <Footer />
    </div>
  );
}

function StaticInfoPage({ kind }: { kind: 'blog' }) {
  const meta = {
    blog: {
      title: 'Статьи',
      paragraphs: [
        'Скоро здесь появятся городские гиды, подборки по датам, маршруты, советы перед покупкой и ссылки на события из каталога.',
        'Пока все актуальные предложения собраны в каталоге, городских страницах и тематических подборках.',
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
      <Header cityLabel="Все города" onSection={goSection} />
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
  destination,
  selectedCityName,
  selectedDestination,
  dataVersion,
  heroQuery,
  heroDate,
  setHeroQuery,
  setHeroDate,
  setDestination,
  onOpenCatalog,
}: {
  destination: string;
  selectedCityName?: string | null;
  selectedDestination?: PublicDestination | null;
  dataVersion: number;
  heroQuery: string;
  heroDate: string;
  setHeroQuery: (value: string) => void;
  setHeroDate: (value: string) => void;
  setDestination: (value: string) => void;
  onOpenCatalog: (extra?: Record<string, string>) => void;
}) {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      <HomeHeroBackground />
      <div className="container-page relative pb-12 pt-12 sm:pb-16 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center drop-shadow-[0_2px_14px_rgba(15,23,42,0.55)]">
          <HomeHeroStats
            dataVersion={dataVersion}
            selectedCityName={selectedCityName}
            selectedDestination={selectedDestination}
          />
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {selectedCityName ? (
              <>
                Экскурсии и события
                <span className="block bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
                  в {cityToPrepositional(selectedCityName)}
                </span>
              </>
            ) : (
              <>
                Экскурсии, музеи и мероприятия
                <span className="block bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
                  в городах России
                </span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            Найдите, куда сходить сегодня, завтра или на выходных — от речных прогулок и музеев до концертов и
            авторских экскурсий.
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onOpenCatalog();
          }}
          className="mx-auto mt-8 max-w-5xl rounded-2xl bg-white p-2 shadow-2xl shadow-slate-950/30"
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,1fr)_minmax(130px,0.8fr)_minmax(0,1.6fr)_auto]">
            <CityPicker
              value={destination}
              onChange={setDestination}
              allLabel="Куда поедете?"
              variant="hero"
            />
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={heroDate}
                onChange={(event) => setHeroDate(event.target.value)}
                aria-label="Дата"
                className="h-11 w-full appearance-none rounded-xl bg-slate-50 pl-10 pr-8 text-sm font-medium text-slate-800 outline-none hover:bg-slate-100 focus:ring-2 focus:ring-primary/25"
              >
                {HERO_DATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Экскурсия, музей, теплоход, концерт..."
                className="h-11 w-full rounded-xl bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <Search className="h-4 w-4" />
              Найти
            </button>
          </div>
        </form>

        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-center gap-2">
          {HERO_QUICK_CHIPS.map((chip) => (
            <a
              key={chip.label}
              href={chip.href}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {chip.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeHeroStats({
  dataVersion,
  selectedCityName,
  selectedDestination,
}: {
  dataVersion: number;
  selectedCityName?: string | null;
  selectedDestination?: PublicDestination | null;
}) {
  void dataVersion;

  const totalEvents = publicData.stats.events;
  const totalVenues = publicData.stats.venues;
  const cityCount = React.useMemo(
    () => publicData.destinations.filter((item) => item.type === 'city').length || publicData.stats.destinations,
    [dataVersion],
  );

  if (selectedCityName && selectedDestination) {
    const cityEvents = roundStatToTen(selectedDestination.events);
    const cityVenues = roundStatToTen(selectedDestination.venues);
    if (!isMeaningfulStatCount(cityEvents, 1)) return null;
    return (
      <div className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <Ticket className="h-4 w-4 shrink-0" />
          {formatStatCount(cityEvents)} {pluralEventsLabel(cityEvents)} в {cityToPrepositional(selectedCityName)}
        </span>
        {isMeaningfulStatCount(cityVenues, 1) ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            <Landmark className="h-4 w-4 shrink-0" />
            {formatStatCount(cityVenues)} {pluralVenuesLabel(cityVenues)}
          </span>
        ) : null}
      </div>
    );
  }

  const roundedEvents = roundStatToTen(totalEvents);
  const roundedVenues = roundStatToTen(totalVenues);
  const showEvents = isMeaningfulStatCount(roundedEvents, 1);
  const showVenues = isMeaningfulStatCount(roundedVenues, 1);
  const showCities = cityCount >= 3;
  if (!showEvents && !showVenues && !showCities) return null;

  return (
    <div className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-3">
      {showEvents ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <Ticket className="h-4 w-4 shrink-0" />
          {formatStatCount(roundedEvents)} {pluralEventsLabel(roundedEvents)}
        </span>
      ) : null}
      {showVenues ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <Landmark className="h-4 w-4 shrink-0" />
          {formatStatCount(roundedVenues)} {pluralVenuesLabel(roundedVenues)}
        </span>
      ) : null}
      {showCities ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          <MapPin className="h-4 w-4 shrink-0" />
          {formatNumber(cityCount)} {pluralCitiesLabel(cityCount)}
        </span>
      ) : null}
    </div>
  );
}

function pluralEventsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'событий';
  if (mod10 === 1) return 'событие';
  if (mod10 >= 2 && mod10 <= 4) return 'события';
  return 'событий';
}

function pluralCitiesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'городов';
  if (mod10 === 1) return 'город';
  if (mod10 >= 2 && mod10 <= 4) return 'города';
  return 'городов';
}

function pluralVenuesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'площадок';
  if (mod10 === 1) return 'площадка';
  if (mod10 >= 2 && mod10 <= 4) return 'площадки';
  return 'площадок';
}

function EditorsPickSection({
  events,
  onOpenCatalog,
}: {
  events: PublicSession[];
  onOpenCatalog: () => void;
}) {
  if (!events.length) return null;

  return (
    <section id="editors-pick" className="py-10 sm:py-14">
      <div className="container-page min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Выбор редакции</h2>
            <p className="mt-1 text-sm text-slate-500">Закреплённые в подборках и сильные предложения с ближайшими датами</p>
          </div>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Смотреть все <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="horizontal-snap-row mt-5 touch-pan-x">
          <div className="horizontal-snap-track">
            {events.map((event) => (
              <div key={event.id} className="showcase-rail-card">
                <EventCard event={event} showcaseRail editorsPickBadge />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeNowSection({
  tabs,
  onOpenCatalog,
}: {
  tabs: ReturnType<typeof buildHomeNowTabs>;
  onOpenCatalog: (extra?: Record<string, string>) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<HomeNowTabKey>(() => pickDefaultHomeNowTab(tabs));
  const current = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  React.useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(pickDefaultHomeNowTab(tabs));
    }
  }, [activeTab, tabs]);

  if (!current) return null;

  return (
    <section id="events" className="bg-slate-50 py-10 sm:py-14">
      <div className="container-page min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Куда сходить сейчас</h2>
            <p className="mt-1 text-sm text-slate-500">{current.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCatalog(current.catalogQuery)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {current.title} <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tab.key === current.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-primary/30'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="horizontal-snap-row mt-5 touch-pan-x" key={current.key}>
          <div className="horizontal-snap-track">
            {current.events.map((event) => (
              <div key={`${current.key}-${event.id}-${event.startsAt}`} className="showcase-rail-card">
                <EventCard event={event} showcaseRail />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFormatSection() {
  return (
    <section id="formats" className="py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Выберите формат отдыха</h2>
            <p className="mt-1 text-sm text-slate-500">Сценарии под настроение, компанию и сезон</p>
          </div>
          <a href="/podborki" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Все подборки <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="horizontal-snap-row mt-6 flex flex-nowrap gap-3 snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:pb-0">
          {HOME_FORMAT_TILES.map((tile) => (
            <a
              key={tile.title}
              href={tile.href}
              className={`horizontal-snap-card group relative min-h-[140px] overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-lg transition hover:scale-[1.02] md:w-auto ${tile.gradient}`}
            >
              <h3 className="text-lg font-bold">{tile.title}</h3>
              <p className="mt-1 text-sm text-white/80">{tile.subtitle}</p>
              <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeVenuesSection() {
  const pickHomeVenues = React.useCallback((list: PublicVenue[] | null | undefined) => {
    if (!list?.length) return [];
    return list
      .filter((venue) => venuePageTemplate(venue.type) === 'institution' && venue.events >= 3 && venue.address)
      .sort((a, b) => b.events - a.events)
      .slice(0, 8);
  }, []);

  const [venues, setVenues] = React.useState<PublicVenue[]>(() => pickHomeVenues(readCachedInstitutionVenues()));
  const [isLoading, setIsLoading] = React.useState(() => !readCachedInstitutionVenues()?.length);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/public/venues?limit=8&family=institution`, { cache: 'default', signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as { venues?: PublicVenue[] }) : null))
      .then((payload) => {
        if (!payload?.venues) return;
        writeCachedInstitutionVenues(payload.venues);
        setVenues(pickHomeVenues(payload.venues));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [pickHomeVenues]);

  return (
    <section id="venues" className="border-t border-slate-100 py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Популярные места и площадки
            </h2>
            <p className="mt-1 text-sm text-slate-500">Музеи, театры, концертные залы и культурные пространства</p>
          </div>
          <a href="/venues" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Все площадки <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        {isLoading && !venues.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : venues.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {venues.map((venue) => (
              <InstitutionCard key={venue.id} venue={venue} href={venueHref(venue)} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HomeBlogSection() {
  if (!BLOG_POSTS.length) return null;

  const [featured, ...rest] = BLOG_POSTS;

  return (
    <section id="blog" className="bg-slate-50 py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Идеи для поездок и отдыха
            </h2>
            <p className="mt-1 text-sm text-slate-500">Гайды и советы перед выбором события</p>
          </div>
          <a href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Все материалы <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <a
            href={`/blog/${featured.slug}`}
            className="group relative min-h-[240px] overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg sm:min-h-[280px]"
          >
            <img
              src={featured.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-6">
              <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                {featured.tag}
              </span>
              <h3 className="mt-3 text-2xl font-bold">{featured.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-white/80">{featured.excerpt}</p>
            </div>
          </a>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 3).map((post) => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                  <img src={post.imageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{post.tag}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                    {post.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.excerpt}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeTrustSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container-page">
        <h2 className="font-display text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Почему выбирают Дайбилет
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_TRUST_ITEMS.map(({ title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <CheckCircle2 className="h-6 w-6 text-primary-600" />
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnerCta() {
  return (
    <section id="partner" className="bg-gradient-to-r from-primary-600 to-sky-500 py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Проводите экскурсии или мероприятия?</h2>
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
              Добавьте свои события на Дайбилет и получайте продажи через каталог, подборки и городские страницы.
            </p>
          </div>
          <a
            href="/offer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-slate-50"
          >
            Стать партнёром
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function PopularNowSection({
  events,
  sparseCatalog,
  onOpenCatalog,
}: {
  events: PublicSession[];
  sparseCatalog?: boolean;
  onOpenCatalog: () => void;
}) {
  const title = sparseCatalog ? 'Рекомендуем начать с этого' : 'Популярное сейчас';
  const subtitle = sparseCatalog ? 'Сильные предложения из текущего каталога' : 'Конкретные события с ближайшими датами';

  return (
    <section className="py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Открыть каталог <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} showcase />
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoSection({ landings, cityFilter }: { landings: PublicLanding[]; cityFilter?: string }) {
  type PromoCard = PublicLanding & { href?: string };
  const fallback = React.useMemo(() => landings.filter((landing) => landing.events > 0).slice(0, 6), [landings]);
  const [featured, setFeatured] = React.useState<PromoCard[]>(fallback);

  React.useEffect(() => {
    setFeatured(fallback);
  }, [fallback]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (cityFilter) params.set('city', cityFilter);
    const suffix = params.toString() ? `?${params.toString()}` : '';

    fetch(`${API_BASE_URL}/api/public/promo-blocks${suffix}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { items?: Array<{ slug: string; title: string; subtitle: string; events: number; priceFrom?: number | null; href: string }> } | null) => {
        if (!payload?.items?.length) return;
        setFeatured(
          payload.items.map((item) => ({
            slug: item.slug,
            title: item.title,
            subtitle: item.subtitle,
            chips: [],
            events: item.events,
            venues: 0,
            priceFrom: item.priceFrom,
            strength: item.events >= 20 ? 'ready' : 'seed',
            href: item.href,
          })),
        );
      })
      .catch(() => undefined);
  }, [cityFilter]);

  if (!featured.length) return null;

  return (
    <section id="landings" className="py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Тематические подборки</h2>
            <p className="mt-1 text-sm text-slate-500">Готовые списки под настроение и повод — от прогулок до концертов</p>
          </div>
          <a href="/podborki" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
            Все подборки <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="horizontal-snap-row mt-6 flex flex-nowrap gap-3 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0">
          {featured.map((landing, index) => (
            <a
              key={landing.slug}
              href={landing.href || landingPageHref(landing.slug)}
              className={`horizontal-snap-card group relative min-h-[168px] overflow-hidden rounded-xl p-5 text-left text-white shadow-lg transition-transform hover:scale-[1.02] sm:min-h-[180px] sm:p-6 md:w-auto ${promoGradient(index)}`}
            >
              {promoBlockIcon(landing.slug, index)}
              <h3 className="text-lg font-bold">{landing.title}</h3>
              <p className="mt-1 text-sm text-white/80">{landing.subtitle}</p>
              <div className="mt-4 text-sm font-semibold">{pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}</div>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CitiesSection({ destinations }: { destinations: PublicDestination[] }) {
  const cities = React.useMemo(
    () =>
      destinations
        .filter((item) => item.type === 'city')
        .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru'))
        .slice(0, 8),
    [destinations],
  );

  if (!cities.length) return null;

  return (
    <section id="destinations" className="border-b border-slate-100 py-12 sm:py-16">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Популярные города</h2>
            <p className="mt-1 text-sm text-slate-500">Выберите город — покажем афишу и подборки</p>
          </div>
          <a href="/cities" className="shrink-0 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Все города →
          </a>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {cities.map((city) => (
            <CityCard
              key={city.name}
              slug={citySlug(city)}
              name={city.name}
              eventCount={city.events}
              venueCount={city.venues}
              description=""
              href={cityHref(city)}
              imageUrl={resolveCityCardImage(city)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function pluralEvents(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} событий`;
  if (mod10 === 1) return `${formatNumber(count)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} события`;
  return `${formatNumber(count)} событий`;
}

function promoBlockIcon(slug: string, index: number) {
  const key = String(slug || '').toLowerCase();
  if (key.includes('bridge')) return <Landmark className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('dinner') || key.includes('ужин')) return <UtensilsCrossed className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('party') || key.includes('disco')) return <CalendarDays className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('bus')) return <MapPin className="mb-3 h-8 w-8 opacity-80" />;
  if (key.includes('concert')) return <CalendarDays className="mb-3 h-8 w-8 opacity-80" />;
  if (index % 3 === 0) return <Ship className="mb-3 h-8 w-8 opacity-80" />;
  if (index % 3 === 1) return <CalendarDays className="mb-3 h-8 w-8 opacity-80" />;
  return <UtensilsCrossed className="mb-3 h-8 w-8 opacity-80" />;
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
