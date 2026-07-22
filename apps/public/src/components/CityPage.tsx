import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Grid3X3,
  Landmark,
  ListFilter,
  MapPin,
  Search,
  Tag,
  Ticket,
  TrendingUp,
} from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber } from '@/data';
import { API_BASE_URL } from '@/lib/api-base';
import { pickCityHubArticles } from '@/lib/city-hub-articles';
import { resolveCityImage } from '@/lib/city-images';
import { landingPageHref } from '@/lib/landing-slugs';
import { eventHref } from '@/routes';
import { resolveCityInfo, type CityInfoEntry } from '@/lib/cityInfo';
import type { PublicArticle, PublicCity, PublicCityPage, PublicLanding, PublicSession, PublicVenue } from '@/types';

type ViewMode = 'cards' | 'table';

export function CityPage({ slug }: { slug: string }) {
  const [payload, setPayload] = React.useState<PublicCityPage | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState('all');
  const [tag, setTag] = React.useState('all');
  const [mode, setMode] = React.useState<ViewMode>('cards');

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/public/cities/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicCityPage | null;
      })
      .then((data) => {
        if (!data) throw new Error('Город не найден');
        setPayload(data);
        setError(null);
        applyCityMeta(data);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : String(requestError));
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [slug]);

  const sessions = React.useMemo(() => {
    if (!payload) return [];
    return payload.sessions.filter((session) => {
      if (category !== 'all' && session.category !== category) return false;
      if (tag !== 'all' && !session.tags.includes(tag)) return false;
      return true;
    });
  }, [category, payload, tag]);

  const city = payload?.city;
  const categories = city ? Object.entries(city.categories).sort((a, b) => b[1] - a[1]) : [];
  const popularTags = React.useMemo(() => (payload ? topTags(payload.sessions, 12) : []), [payload]);
  const guide = city ? cityGuideFor(city) : null;
  const recommended = payload ? rankRecommended(payload.sessions).slice(0, 6) : [];
  const moreEvents = payload ? rankRecommended(payload.sessions).slice(6, 30) : [];
  const articleSlots = React.useMemo(
    () => pickCityHubArticles(city?.slug, city?.name, payload?.articles || []),
    [city?.name, city?.slug, payload?.articles],
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel={city?.name || 'Дайбилет'} onSection={(section) => navigateHome(section)} searchCity={city?.name} />

      <main>
        {isLoading ? <CityLoadingState /> : null}

        {!isLoading && error ? (
          <div className="container-page py-16">
            <button type="button" className="btn-secondary" onClick={() => navigateHome('top')}>
              <ArrowLeft className="h-4 w-4" />
              На главную
            </button>
            <h1 className="mt-6 text-3xl font-bold text-slate-950">Город не найден</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        ) : null}

        {city && payload ? (
          <>
            <CityHero city={city} stats={payload.stats} guide={guide} />
            <CityHubTabs />
            <AboutSection city={city} guide={guide} stats={payload.stats} articles={articleSlots.about} sessions={payload.sessions} />

            <section id="affiche" className="scroll-mt-24 bg-slate-50 py-10">
              <div className="container-page">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Что купить сейчас</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Афиша и билеты {cityInPrepositional(city)}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Ближайшие события, быстрые фильтры и рекомендации собраны рядом с редакционными подсказками, чтобы не уходить с хаба в общий блог.
                  </p>
                </div>
              </div>
              <CategoryTiles categories={categories} onSelect={(value) => {
                setCategory(value);
                setTag('all');
                scrollToSchedule();
              }} />
              <PopularTags tags={popularTags} active={tag} onSelect={(value) => {
                setTag(value);
                setCategory('all');
                scrollToSchedule();
              }} />
              <RecommendedEvents city={city} sessions={recommended} />

              <div id="city-schedule" className="container-page grid scroll-mt-24 gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <CityCatalogHeader city={city} count={sessions.length} mode={mode} setMode={setMode} />
                  <CategoryFilter
                    categories={categories}
                    active={category}
                    total={payload.sessions.length}
                    activeTag={tag}
                    onCategory={(value) => {
                      setCategory(value);
                      setTag('all');
                    }}
                    onReset={() => {
                      setCategory('all');
                      setTag('all');
                    }}
                  />
                  {mode === 'table' ? <CityEventsTable sessions={sessions} /> : <CityEventsGrid sessions={sessions} />}
                  <EditorialArticleRail title="Материалы к афише" articles={articleSlots.affiche} sessions={payload.sessions} className="mt-6" />
                </div>

                <aside className="grid content-start gap-4">
                  <CityGuideAside city={city} stats={payload.stats} categories={categories} landings={payload.landings} />
                </aside>
              </div>
            </section>

            <MustSeeSection city={city} guide={guide} categories={categories} venues={payload.venues} articles={articleSlots.sights} sessions={payload.sessions} />
            <PracticeSection city={city} stats={payload.stats} categories={categories} articles={articleSlots.practice} sessions={payload.sessions} />

            <section id="more" className="scroll-mt-24 bg-white py-10">
              <span id="seo" className="sr-only" aria-hidden="true" />
              <div className="container-page">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Ещё</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Направления, площадки и подборки</h2>
              </div>
              <PopularDirections city={city} landings={payload.landings} categories={categories} />
              <VenueHighlights city={city} venues={payload.venues} />
              <MoreEvents sessions={moreEvents} />
              <EditorialArticleRail title="Ещё один полезный материал" articles={articleSlots.more} sessions={payload.sessions} className="container-page" />
            </section>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function CityHero({
  city,
  stats,
  guide,
}: {
  city: PublicCity;
  stats: PublicCityPage['stats'];
  guide: CityInfoEntry | null;
}) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const heroImage = resolveCityImage({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
  });
  const showImage = Boolean(heroImage && !hasImageError);
  const cityIn = cityInPrepositional(city);

  return (
    <section className="relative min-h-[320px] overflow-hidden border-b border-primary-950 text-white sm:min-h-[380px]">
      {showImage ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={heroImage || ''}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center lg:object-[center_75%]"
            onError={() => setHasImageError(true)}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/25" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/55 to-transparent" />
      <div className="container-page relative py-14 sm:py-16">
        <div className="flex items-center gap-2 text-sm text-primary-100/80">
          <button type="button" onClick={() => navigateHome('top')} className="hover:text-white">
            Главная
          </button>
          <span>/</span>
          <span className="text-white">{city.name}</span>
        </div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/86">
              <MapPin className="h-4 w-4" />
              {city.type === 'region' ? 'Страница направления' : 'Страница города'}
            </div>
            <h1 className="max-w-4xl text-4xl font-extrabold sm:text-5xl">{city.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88 sm:text-lg">
              {guide?.brief || `Экскурсии, музеи, мероприятия и активный отдых ${cityIn}. Выбирайте формат, дату и площадку без долгого поиска по разным билетным системам.`}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#affiche" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                <Ticket className="mr-2 h-4 w-4" />
                Все события {cityIn}
              </a>
              <a href="#sights" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                Куда сходить
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Событий" value={formatNumber(stats.events)} />
            <HeroStat label="Площадок" value={formatNumber(stats.venues)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CityHubTabs() {
  const tabs = [
    { label: 'О городе', href: '#about' },
    { label: 'Афиша', href: '#affiche' },
    { label: 'Куда сходить', href: '#sights' },
    { label: 'Практика', href: '#practice' },
    { label: 'Ещё', href: '#more' },
  ];

  return (
    <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <nav className="container-page flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Разделы города">
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function AboutSection({
  city,
  guide,
  stats,
  articles,
  sessions,
}: {
  city: PublicCity;
  guide: CityInfoEntry | null;
  stats: PublicCityPage['stats'];
  articles: PublicArticle[];
  sessions: PublicSession[];
}) {
  const cityIn = cityInPrepositional(city);
  const brief =
    guide?.brief ||
    `${city.name} — удобная точка для экскурсий, музеев, прогулок и городских событий. Начните с короткого обзора, а затем переходите к ближайшей афише.`;

  return (
    <section id="about" className="container-page scroll-mt-24 py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Зачем ехать</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">О городе и сценариях поездки</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{brief}</p>
          <EditorialArticleRail title="Почитать перед выбором" articles={articles} sessions={sessions} className="mt-6" />
        </div>

        <aside className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <HubFact label={city.type === 'region' ? 'Направление' : 'Город'} value={city.name} />
          <HubFact label="В афише" value={pluralEvents(stats.events)} />
          <HubFact label="Площадки" value={formatNumber(stats.venues)} />
          <a href="#affiche" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
            Смотреть афишу {cityIn}
          </a>
        </aside>
      </div>
    </section>
  );
}

function CityLoadingState() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
        <div className="container-page py-14 sm:py-16">
          <div className="h-4 w-44 rounded bg-white/20" />
          <div className="mt-8 h-12 max-w-xl rounded bg-white/22" />
          <div className="mt-4 h-5 max-w-2xl rounded bg-white/16" />
          <div className="mt-3 h-5 max-w-lg rounded bg-white/16" />
          <div className="mt-7 flex gap-3">
            <div className="h-11 w-64 rounded-lg bg-white/24" />
            <div className="h-11 w-48 rounded-lg bg-white/12" />
          </div>
        </div>
      </section>
      <section className="container-page py-10">
        <div className="h-6 w-64 rounded bg-slate-100" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-slate-50" />
          ))}
        </div>
      </section>
    </>
  );
}

function PopularDirections({ city, landings, categories }: { city: PublicCity; landings: PublicLanding[]; categories: Array<[string, number]> }) {
  const cityIn = cityInPrepositional(city);
  const items = [
    ...landings.slice(0, 8).map((landing) => ({
      key: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      href: landingPageHref(landing.slug),
      count: landing.events,
    })),
    ...categories.slice(0, Math.max(0, 6 - landings.length)).map(([name, count]) => ({
      key: `category-${name}`,
      title: name,
      subtitle: `Быстрый вход в афишу ${cityIn}`,
      href: '#affiche',
      count,
    })),
  ].slice(0, 8);

  if (!items.length) return null;

  return (
    <section id="directions" className="scroll-mt-24 bg-gradient-to-r from-primary-50 to-amber-50 py-8">
      <span id="city-directions" className="sr-only" aria-hidden="true" />
      <div className="container-page">
        <h2 className="text-lg font-bold text-slate-950">Популярные направления</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-100"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{item.title}</span>
              {item.count ? <span className="text-xs text-primary-500">({formatNumber(item.count)})</span> : null}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function MustSeeSection({
  city,
  guide,
  categories,
  venues,
  articles,
  sessions,
}: {
  city: PublicCity;
  guide: CityInfoEntry | null;
  categories: Array<[string, number]>;
  venues: PublicVenue[];
  articles: PublicArticle[];
  sessions: PublicSession[];
}) {
  const places = guide?.mustSee.length ? guide.mustSee : buildFallbackMustSee(city, categories, venues);
  if (!places.length) return null;
  const cityIn = cityInPrepositional(city);

  return (
    <section id="sights" className="container-page scroll-mt-24 py-12">
      <h2 className="text-2xl font-bold text-slate-950">Что обязательно посетить {cityIn}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Главные точки и сценарии, с которых удобно начать знакомство с городом. Ниже можно перейти к билетам, расписанию и площадкам.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.slice(0, 6).map((place, index) => (
          <div key={`${place.name}:${index}`} className="flex gap-4 rounded-lg bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg font-bold text-primary-600">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-slate-950">{place.name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{place.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <EditorialArticleRail title="Гиды по местам" articles={articles} sessions={sessions} className="mt-6" />
    </section>
  );
}

function CategoryTiles({ categories, onSelect }: { categories: Array<[string, number]>; onSelect: (category: string) => void }) {
  if (!categories.length) return null;
  return (
    <section className="bg-slate-50 py-10">
      <div className="container-page">
        <div className="grid gap-3 sm:grid-cols-3">
          {categories.slice(0, 3).map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
              className="flex items-center gap-4 rounded-lg bg-white p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:bg-primary-50 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <Landmark className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-950">{name}</span>
                <span className="mt-1 block text-sm text-slate-500">{pluralEvents(count)}</span>
              </span>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function VenueHighlights({ city, venues }: { city: PublicCity; venues: PublicVenue[] }) {
  if (!venues.length) return null;
  const cityIn = cityInPrepositional(city);
  return (
    <section id="venues" className="container-page scroll-mt-24 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Площадки и точки интереса</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Места, откуда стартуют экскурсии, проходят мероприятия и формируются городские маршруты {cityIn}.
          </p>
        </div>
        <a href="#affiche" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
          Смотреть афишу
        </a>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.slice(0, 6).map((venue) => (
          <a key={venue.id} href={`/venues/${venue.slug || venue.id}`} className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:bg-primary-50/60 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]">
            <div className="font-semibold text-slate-950">{venue.name}</div>
            <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {pluralEvents(venue.events)}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function PopularTags({ tags, active, onSelect }: { tags: Array<{ name: string; count: number }>; active: string; onSelect: (tag: string) => void }) {
  if (!tags.length) return null;
  return (
    <section className="container-page py-10">
      <h3 className="text-lg font-semibold text-slate-950">Популярные теги</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelect(active === item.name ? 'all' : item.name)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
              active === item.name
                ? 'border-primary-500 bg-primary-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            {item.name}
            <span className={active === item.name ? 'text-white/70' : 'text-slate-400'}>({formatNumber(item.count)})</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecommendedEvents({ city, sessions }: { city: PublicCity; sessions: PublicSession[] }) {
  if (!sessions.length) return null;
  const cityIn = cityInPrepositional(city);
  return (
    <section className="container-page pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Рекомендуем {cityIn}</h2>
          <p className="mt-1 text-sm text-slate-500">События с ближайшими датами, ценой и наполненной карточкой.</p>
        </div>
        <a href="#city-schedule" className="hidden text-sm font-semibold text-primary-700 hover:text-primary-800 sm:inline-flex sm:items-center sm:gap-1">
          Все события <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <EventCard key={session.id} event={session} />
        ))}
      </div>
    </section>
  );
}

function MoreEvents({ sessions }: { sessions: PublicSession[] }) {
  if (!sessions.length) return null;
  return (
    <section className="container-page pb-12">
      <h2 className="text-xl font-bold text-slate-950">Ещё события</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sessions.map((session) => (
          <EventCard key={session.id} event={session} compact />
        ))}
      </div>
    </section>
  );
}

function PracticeSection({
  city,
  stats,
  categories,
  articles,
  sessions,
}: {
  city: PublicCity;
  stats: PublicCityPage['stats'];
  categories: Array<[string, number]>;
  articles: PublicArticle[];
  sessions: PublicSession[];
}) {
  const cityIn = cityInPrepositional(city);
  const topCategory = categories[0]?.[0] || 'экскурсии и события';

  return (
    <section id="practice" className="scroll-mt-24 bg-slate-50 py-12">
      <div className="container-page">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Практика</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Как спланировать день {cityIn}</h2>
            <div id="travel" className="mt-5 grid scroll-mt-24 gap-4 sm:grid-cols-3">
              <PracticeTip title="Начните с даты" text="В афише видны ближайшие слоты, открытые даты и события с готовой ссылкой на покупку." />
              <PracticeTip title="Сузьте формат" text={`Самый заметный спрос сейчас: ${topCategory.toLowerCase()}. Категории помогают быстро отсечь лишнее.`} />
              <PracticeTip title="Проверьте место" text={`${formatNumber(stats.venues)} площадок и точек старта собраны рядом с событиями, чтобы сравнить маршрут до покупки.`} />
            </div>
            <EditorialArticleRail title="Практический разбор" articles={articles} sessions={sessions} className="mt-6" />
          </div>

          <aside id="faq" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-950">Частые вопросы</h3>
            <div className="mt-3 grid gap-2">
              <FaqItem title="Где смотреть ближайшие даты?" text="В блоке афиши: фильтры и таблица используют уже загруженные события города." />
              <FaqItem title="Что делать, если нет ссылки на покупку?" text="Такие события остаются в каталоге как справочные, а покупку показываем только там, где есть готовый provider-link." />
              <FaqItem title="Материалы открываются отдельно?" text="Да, полный текст остаётся на канонической странице блога, а хаб показывает только тизер и краткое содержание." />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PracticeTip({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function FaqItem({ title, text }: { title: string; text: string }) {
  return (
    <details className="group rounded-lg bg-slate-50 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </details>
  );
}

function EditorialArticleRail({
  title,
  articles,
  sessions,
  className = '',
}: {
  title: string;
  articles: PublicArticle[];
  sessions: PublicSession[];
  className?: string;
}) {
  if (!articles.length) return null;

  return (
    <div className={className}>
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <EditorialArticleCard key={article.slug} article={article} sessions={sessions} />
        ))}
      </div>
    </div>
  );
}

function EditorialArticleCard({ article, sessions }: { article: PublicArticle; sessions: PublicSession[] }) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const badges = articleFitBadges(article);
  const showImage = Boolean(article.coverImageUrl && !hasImageError);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-full md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative min-h-[150px] overflow-hidden bg-slate-100">
          {showImage ? (
            <img
              src={article.coverImageUrl || ''}
              alt=""
              loading="lazy"
              onError={() => setHasImageError(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0)] text-slate-400">
              <BookOpen className="h-9 w-9" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{articleTypeLabel(article.articleType)}</span>
            {article.publishedAt ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatArticleDate(article.publishedAt)}
              </span>
            ) : null}
          </div>

          <h4 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-slate-950">
            <a href={`/blog/${article.slug}`} className="hover:text-primary-700">
              {article.title}
            </a>
          </h4>
          {article.excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p> : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <Tag className="h-3 w-3" />
                {badge}
              </span>
            ))}
          </div>

          {article.excerpt ? (
            <details className="group mt-3 rounded-lg bg-slate-50 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                Коротко о чём
                <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{article.excerpt}</p>
            </details>
          ) : null}

          <ArticleEventMiniRow article={article} sessions={sessions} />

          <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={scrollToAffiche}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Ticket className="mr-2 h-4 w-4" />
              Смотреть в афише
            </button>
            <a
              href={`/blog/${article.slug}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
            >
              Открыть материал
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function ArticleEventMiniRow({ article, sessions }: { article: PublicArticle; sessions: PublicSession[] }) {
  const items = articleMatchedSessions(article, sessions);
  if (!items.length) return null;

  return (
    <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
      {items.map((session) => (
        <a key={session.id} href={eventHref(session)} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-primary-50/70">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900">{session.title}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">{session.dateLabel} · {session.venue}</span>
          </span>
          <span className="self-center whitespace-nowrap text-xs font-semibold text-primary-700">{formatMoney(session.priceFrom)}</span>
        </a>
      ))}
    </div>
  );
}

function CityCatalogHeader({
  city,
  count,
  mode,
  setMode,
}: {
  city: PublicCity;
  count: number;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}) {
  const cityIn = cityInPrepositional(city);
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">Каталог событий {cityIn}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {pluralEvents(count)} после выбранных фильтров. Для повторяющихся событий карточка объединяет ближайшие слоты.
        </p>
      </div>
      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={() => setMode('cards')} className={`inline-flex min-h-10 items-center gap-2 px-4 text-sm font-medium ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Grid3X3 className="h-4 w-4" />
          Карточки
        </button>
        <button type="button" onClick={() => setMode('table')} className={`inline-flex min-h-10 items-center gap-2 border-l border-slate-200 px-4 text-sm font-medium ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
          <ListFilter className="h-4 w-4" />
          Таблица
        </button>
      </div>
    </div>
  );
}

function CategoryFilter(props: {
  categories: Array<[string, number]>;
  active: string;
  activeTag: string;
  total: number;
  onCategory: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button type="button" onClick={props.onReset} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${props.active === 'all' && props.activeTag === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
        Все {formatNumber(props.total)}
      </button>
      {props.activeTag !== 'all' ? (
        <button type="button" onClick={props.onReset} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100">
          <Search className="h-3.5 w-3.5" />
          {props.activeTag}
        </button>
      ) : null}
      {props.categories.map(([name, count]) => (
        <button key={name} type="button" onClick={() => props.onCategory(name)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${props.active === name ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          {name} {formatNumber(count)}
        </button>
      ))}
    </div>
  );
}

function CityEventsGrid({ sessions }: { sessions: PublicSession[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.slice(0, 48).map((session) => (
        <EventCard key={session.id} event={session} compact />
      ))}
      {!sessions.length ? <EmptyState /> : null}
    </div>
  );
}

function CityEventsTable({ sessions }: { sessions: PublicSession[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Дата</th>
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Место</th>
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sessions.slice(0, 160).map((session) => (
            <tr key={session.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-middle">
                <div className="font-medium text-slate-900">{session.dateLabel}</div>
                <div className="text-xs text-slate-500">{session.timeLabel}</div>
              </td>
              <td className="min-w-[320px] px-4 py-3">
                <a href={eventHref(session)} className="font-medium text-slate-950 hover:text-primary-700">{session.title}</a>
                <div className="mt-1 text-xs text-slate-500">{session.tags.slice(0, 2).join(' · ')}</div>
              </td>
              <td className="max-w-[240px] px-4 py-3 text-slate-600">
                {session.venueSlug ? <a className="font-medium text-primary-600 hover:text-primary-700" href={`/venues/${session.venueSlug}`}>{session.venue}</a> : session.venue}
              </td>
              <td className="px-4 py-3 text-slate-600">{session.category}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">{formatMoney(session.priceFrom)}</td>
              <td className="px-4 py-3">
                <BuyLink session={session} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sessions.length ? <EmptyState /> : null}
    </div>
  );
}

function CityGuideAside({
  city,
  stats,
  categories,
  landings,
}: {
  city: PublicCity;
  stats: PublicCityPage['stats'];
  categories: Array<[string, number]>;
  landings: PublicLanding[];
}) {
  return (
    <>
      <section className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <h3 className="text-sm font-semibold text-slate-950">Как выбрать</h3>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600">
          <p>Сначала выберите сценарий: прогулка, музей, мероприятие или активность.</p>
          <p>Затем сравните дату, место старта и цену. Для повторяющихся событий смотрите слоты внутри карточки.</p>
          <p>Покупка открывается в виджете билетной системы, финансовый контур остается на стороне поставщика.</p>
        </div>
      </section>
      <section className="rounded-lg bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Коротко о странице</h3>
        <div className="mt-3 grid gap-2">
          <HubFact label={city.type === 'region' ? 'Направление' : 'Город'} value={city.name} />
          <HubFact label="Событий" value={formatNumber(stats.events)} />
          <HubFact label="Топ-категория" value={categories[0]?.[0] || 'скоро появится'} />
        </div>
      </section>
      {landings.length ? (
        <section className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <h3 className="text-sm font-semibold text-slate-950">Подборки</h3>
          <div className="mt-3 grid gap-3">
            {landings.slice(0, 6).map((landing) => (
              <a key={landing.slug} href={landingPageHref(landing.slug)} className="rounded-lg bg-slate-50 p-3 transition hover:bg-primary-50/70">
                <div className="text-sm font-semibold text-slate-950">{landing.title}</div>
                <div className="mt-1 text-xs text-slate-500">{formatNumber(landing.events)} событий · {formatMoney(landing.priceFrom)}</div>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function HubFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/12 p-4">
      <div className="text-xs font-medium uppercase text-white/60">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function BuyLink({ session }: { session: PublicSession }) {
  if (!session.purchaseUrl) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-400">
        Нет ссылки
      </span>
    );
  }

  return (
    <a href={session.purchaseUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
      Купить
    </a>
  );
}

function EmptyState() {
  return <div className="p-8 text-sm text-slate-500">Событий по выбранному фильтру пока нет.</div>;
}

function articleFitBadges(article: PublicArticle): string[] {
  const text = normalizeArticleText(`${article.title} ${article.slug} ${article.excerpt || ''}`);
  const badges: string[] = [];
  if (/(первый|впервые|гид|обзор)/.test(text)) badges.push('подходит если вы впервые в городе');
  if (/(дет|семь|ребен)/.test(text)) badges.push('подходит если едете с детьми');
  if (/(вечер|ноч|ужин|выходн)/.test(text)) badges.push('подходит если нужен вечерний план');
  if (/(музе|театр|выстав|культур)/.test(text)) badges.push('подходит если хочется культуры');
  if (/(прогул|маршрут|достопримеч|места)/.test(text)) badges.push('подходит если любите маршруты');
  if (/(теплоход|река|канал|набереж)/.test(text)) badges.push('подходит если тянет к воде');
  if (!badges.length) badges.push('подходит если выбираете без спешки');
  return badges.slice(0, 3);
}

function articleTypeLabel(type?: string | null): string {
  if (type === 'gid') return 'Гид';
  if (type === 'column') return 'Колонка';
  return 'Обзор';
}

function formatArticleDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
}

function articleMatchedSessions(article: PublicArticle, sessions: PublicSession[]): PublicSession[] {
  if (!sessions.length) return [];
  const keywords = articleKeywords(article);
  const matched = sessions
    .map((session) => ({ session, score: scoreArticleSession(session, keywords) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(left.session.startsAt || 0).getTime() - new Date(right.session.startsAt || 0).getTime();
    })
    .slice(0, 3)
    .map((item) => item.session);

  return matched.length ? matched : rankRecommended(sessions).slice(0, 3);
}

function articleKeywords(article: PublicArticle): string[] {
  const stopWords = new Set([
    'куда',
    'сходить',
    'город',
    'города',
    'гиде',
    'гид',
    'обзор',
    'лучшие',
    'лучшее',
    'билеты',
    'афиша',
    'материал',
  ]);
  return [...new Set(normalizeArticleText(`${article.title} ${article.slug} ${article.excerpt || ''}`).split(' '))]
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .slice(0, 10);
}

function scoreArticleSession(session: PublicSession, keywords: string[]): number {
  if (!keywords.length) return 0;
  const text = normalizeArticleText([
    session.title,
    session.category,
    session.venue,
    ...(session.tags || []),
    ...(session.subcategories || []),
  ].join(' '));
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

function normalizeArticleText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cityGuideFor(city: PublicCity) {
  return resolveCityInfo(city.slug, city.sourceSlug);
}

function buildFallbackMustSee(city: PublicCity, categories: Array<[string, number]>, venues: PublicVenue[]) {
  const categoryPlaces = categories.slice(0, 3).map(([name, count]) => ({
    name,
    desc: `${pluralEvents(count)} в каталоге города ${city.name}: удобно начать выбор с этой категории.`,
  }));
  const venuePlaces = venues.slice(0, 3).map((venue) => ({
    name: venue.name,
    desc: `${pluralEvents(venue.events)} на странице площадки. Проверьте расписание, цену и ближайшие даты.`,
  }));
  return [...categoryPlaces, ...venuePlaces];
}

function rankRecommended(sessions: PublicSession[]) {
  return [...sessions].sort((a, b) => {
    const scoreDiff = sessionQualityScore(b) - sessionQualityScore(a);
    if (scoreDiff) return scoreDiff;
    return new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime();
  });
}

function sessionQualityScore(session: PublicSession) {
  let score = 0;
  if (session.imageUrl) score += 3;
  if (session.priceFrom) score += 3;
  if (session.purchaseUrl || session.widgetUrl || session.deeplinkUrl) score += 2;
  if (session.tags.length) score += 1;
  if ((session.sessionCount || 0) > 1) score += 1;
  return score;
}

function topTags(sessions: PublicSession[], limit: number) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    for (const tag of session.tags || []) {
      const clean = tag.trim();
      if (!clean || clean.length < 3) continue;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(n)} событий`;
  if (mod10 === 1) return `${formatNumber(n)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(n)} события`;
  return `${formatNumber(n)} событий`;
}

function cityInPrepositional(city: PublicCity) {
  const bySlug: Record<string, string> = {
    'sankt-peterburg': 'в Санкт-Петербурге',
    'saint-petersburg': 'в Санкт-Петербурге',
    moscow: 'в Москве',
    'moskovskaya-oblast': 'в Московской области',
    'leningradskaya-oblast': 'в Ленинградской области',
    'krasnodarskiy-kray': 'в Краснодарском крае',
    'krasnoyarskiy-kray': 'в Красноярском крае',
    'respublika-tatarstan': 'в Республике Татарстан',
    'respublika-hakasiya': 'в Республике Хакасия',
    'ulyanovskaya-oblast': 'в Ульяновской области',
    'habarovskiy-kray': 'в Хабаровском крае',
  };
  if (bySlug[city.slug]) return bySlug[city.slug];
  if (city.sourceSlug && bySlug[city.sourceSlug]) return bySlug[city.sourceSlug];

  const name = city.name.trim();
  if (name === 'Москва') return 'в Москве';
  if (name === 'Санкт-Петербург') return 'в Санкт-Петербурге';
  if (city.type === 'region') return `в регионе ${name}`;
  if (name.endsWith('а')) return `в ${name.slice(0, -1)}е`;
  return `в городе ${name}`;
}

function scrollToSchedule() {
  window.setTimeout(() => document.querySelector('#city-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

function scrollToAffiche() {
  window.setTimeout(() => document.querySelector('#affiche')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

function navigateHome(section: string) {
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

function applyCityMeta(payload: PublicCityPage) {
  document.title = payload.city.seoTitle || `${payload.city.name}: афиша и билеты | Дайбилет`;
  upsertMeta('description', payload.city.seoDescription || `Афиша событий, экскурсии, музеи и билеты ${cityInPrepositional(payload.city)}.`);
  upsertMeta('robots', 'index, follow');
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
