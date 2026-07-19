'use client';

import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
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
import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/format';
import { collectPopularTags } from '@/lib/catalog-tags';
import { resolveCityImage } from '@/lib/city-images';
import type { CityFaqItem } from '@/lib/city-faq';
import { venuePageTemplate } from '@/lib/venue-meta';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { landingPageHref } from '@/lib/landing-routes';
import { eventHref, sessionVenueHref, venueHref } from '@/lib/routes';
import { resolveCityInfo, type CityInfoEntry } from '@/lib/cityInfo';
import type {
  PublicCityDto,
  PublicCityPageDto,
  PublicLandingDto,
  PublicSessionDto,
  PublicVenueDto,
} from '@daibilet/contracts/public';

type ViewMode = 'cards' | 'table';

export function CityPageView({
  slug,
  initialPayload,
  faqItems = [],
  seoText = null,
}: {
  slug: string;
  initialPayload: PublicCityPageDto | null;
  faqItems?: CityFaqItem[];
  seoText?: string | null;
}) {
  const [payload, setPayload] = React.useState<PublicCityPageDto | null>(initialPayload);
  const [contentReady, setContentReady] = React.useState(() => Boolean(initialPayload?.sessions?.length));
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState('all');
  const [tag, setTag] = React.useState('all');
  const [mode, setMode] = React.useState<ViewMode>('cards');

  React.useEffect(() => {
    if (initialPayload?.sessions?.length) return;
    const controller = new AbortController();
    fetch(`/api/public/cities/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicCityPageDto | null;
      })
      .then((data) => {
        if (!data?.city) throw new Error('Город не найден');
        setPayload(data);
        setContentReady(true);
        setError(null);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : String(requestError));
      });
    return () => controller.abort();
  }, [slug, initialPayload?.sessions?.length]);

  React.useEffect(() => {
    if (!contentReady) return;
    if (window.location.hash === '#city-schedule') scrollToSchedule();
  }, [contentReady, slug]);

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
  const popularTags = React.useMemo(
    () => (payload ? collectPopularTags(payload.sessions, 12).map(({ name, events }) => ({ name, count: events })) : []),
    [payload],
  );
  const guide = city ? cityGuideFor(city) : null;
  const recommended = payload ? rankRecommended(payload.sessions).slice(0, 6) : [];
  const moreEvents = payload ? rankRecommended(payload.sessions).slice(6, 30) : [];

  return (
    <div className="bg-white text-slate-900">
      <main>
        {!payload && !error ? <CityLoadingState /> : null}

        {error && !payload?.city ? (
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
            {contentReady ? (
              <>
                <PopularDirections city={city} landings={payload.landings} categories={categories} />
                <MustSeeSection city={city} guide={guide} categories={categories} venues={payload.venues} />
                <CategoryTiles categories={categories} onSelect={(value) => {
                  setCategory(value);
                  setTag('all');
                  scrollToSchedule();
                }} />
                <VenueHighlights city={city} venues={payload.venues} />
                <PopularTags tags={popularTags} active={tag} onSelect={(value) => {
                  setTag(value);
                  setCategory('all');
                  scrollToSchedule();
                }} />
                <RecommendedEvents city={city} sessions={recommended} />
                <MoreEvents sessions={moreEvents} />
              </>
            ) : (
              <CityContentLoadingState />
            )}

            <section id="city-schedule" className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <CityCatalogHeader city={city} count={sessions.length} mode={mode} setMode={setMode} />
                {contentReady ? (
                  <>
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
                  </>
                ) : (
                  <CityScheduleLoadingState />
                )}
              </div>

              <aside className="grid content-start gap-4">
                {contentReady ? (
                  <CityGuideAside city={city} stats={payload.stats} categories={categories} landings={payload.landings} />
                ) : (
                  <div className="h-64 rounded-xl bg-slate-50" />
                )}
              </aside>
            </section>

            {seoText ? <CitySeoTextSection cityName={city.name} text={seoText} /> : null}
            {faqItems.length ? <CityFaqSection cityName={city.name} items={faqItems} /> : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function CityHero({
  city,
  stats,
  guide,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
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
  const heroFocus = resolveCityImageObjectPosition({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
  });

  return (
    <section className="relative min-h-[320px] overflow-hidden border-b border-primary-950 text-white sm:min-h-[380px]">
      {showImage ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={heroImage || ''}
            alt=""
            style={{ objectPosition: heroFocus }}
            className="absolute inset-0 h-full w-full object-cover"
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
              <a href="#city-schedule" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                <Ticket className="mr-2 h-4 w-4" />
                Все события {cityIn}
              </a>
              <a href="#city-directions" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                Смотреть направления
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

function CityContentLoadingState() {
  return (
    <section className="container-page py-10">
      <div className="h-6 w-64 rounded bg-slate-100" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 rounded-lg bg-slate-50" />
        ))}
      </div>
    </section>
  );
}

function CityScheduleLoadingState() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-72 rounded-xl bg-slate-50" />
      ))}
    </div>
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

function PopularDirections({ city, landings, categories }: { city: PublicCityDto; landings: PublicLandingDto[]; categories: Array<[string, number]> }) {
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
      href: '#city-schedule',
      count,
    })),
  ].slice(0, 8);

  if (!items.length) return null;

  return (
    <section id="city-directions" className="bg-gradient-to-r from-primary-50 to-amber-50 py-8">
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
}: {
  city: PublicCityDto;
  guide: CityInfoEntry | null;
  categories: Array<[string, number]>;
  venues: PublicVenueDto[];
}) {
  const places = guide?.mustSee.length ? guide.mustSee : buildFallbackMustSee(city, categories, venues);
  if (!places.length) return null;
  const cityIn = cityInPrepositional(city);

  return (
    <section className="container-page py-12">
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

function VenueHighlights({ city, venues }: { city: PublicCityDto; venues: PublicVenueDto[] }) {
  if (!venues.length) return null;
  const cityIn = cityInPrepositional(city);
  const institutions = venues.filter((venue) => venuePageTemplate(venue.type) !== 'location');
  const locations = venues.filter((venue) => venuePageTemplate(venue.type) === 'location');
  const featured = [...institutions, ...locations].slice(0, 6);

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Площадки и локации</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Музеи, театры, причалы и точки старта экскурсий {cityIn}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <a href="#city-schedule" className="text-primary-700 hover:text-primary-800">
            Смотреть афишу
          </a>
          {locations.length ? (
            <a href="/locations" className="text-primary-700 hover:text-primary-800">
              Все локации →
            </a>
          ) : null}
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((venue) => (
          <a key={venue.id} href={venueHref(venue)} className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:bg-primary-50/60 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]">
            <div className="font-semibold text-slate-950">{venue.name}</div>
            {venue.address ? (
              <div className="mt-2 flex items-start gap-1 text-sm text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{venue.address}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {pluralEvents(venue.events)}
              </div>
            )}
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

function RecommendedEvents({ city, sessions }: { city: PublicCityDto; sessions: PublicSessionDto[] }) {
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
          <EventCard key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}

function MoreEvents({ sessions }: { sessions: PublicSessionDto[] }) {
  if (!sessions.length) return null;
  return (
    <section className="container-page pb-12">
      <h2 className="text-xl font-bold text-slate-950">Ещё события</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sessions.map((session) => (
          <EventCard key={session.id} session={session} compact />
        ))}
      </div>
    </section>
  );
}

function CityCatalogHeader({
  city,
  count,
  mode,
  setMode,
}: {
  city: PublicCityDto;
  count: number;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}) {
  const cityIn = cityInPrepositional(city);
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">События {cityIn}</h2>
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

function CityEventsGrid({ sessions }: { sessions: PublicSessionDto[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.slice(0, 48).map((session) => (
        <EventCard key={session.id} session={session} compact />
      ))}
      {!sessions.length ? <EmptyState /> : null}
    </div>
  );
}

function CityEventsTable({ sessions }: { sessions: PublicSessionDto[] }) {
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
                {(() => {
                  const venueLink = sessionVenueHref(session);
                  return venueLink ? (
                    <a className="font-medium text-primary-600 hover:text-primary-700" href={venueLink}>
                      {session.venue}
                    </a>
                  ) : (
                    session.venue
                  );
                })()}
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
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  categories: Array<[string, number]>;
  landings: PublicLandingDto[];
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

function CitySeoTextSection({ cityName, text }: { cityName: string; text: string }) {
  return (
    <section id="city-seo" className="border-t border-slate-100 bg-slate-50/70 py-12">
      <div className="container-page max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-900">Афиша {cityName}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
      </div>
    </section>
  );
}

function CityFaqSection({ cityName, items }: { cityName: string; items: CityFaqItem[] }) {
  return (
    <section id="faq" className="border-t border-slate-100 py-12">
      <div className="container-page">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900 md:text-3xl">Частые вопросы</h2>
        <p className="mb-10 text-center text-slate-600">Ответы о билетах и афише {cityName}</p>
        <div className="mx-auto max-w-3xl space-y-2">
          {items.map((item, index) => (
            <details
              key={`${item.question}:${index}`}
              className="group rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
            >
              <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 p-4 text-left text-sm font-medium text-slate-900">
                <span className="pr-2">{item.question}</span>
                <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
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

function BuyLink({ session }: { session: PublicSessionDto }) {
  return (
    <Link
      href={eventHref(session)}
      className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
    >
      Купить
    </Link>
  );
}

function EmptyState() {
  return <div className="p-8 text-sm text-slate-500">Событий по выбранному фильтру пока нет.</div>;
}

function cityGuideFor(city: PublicCityDto) {
  return resolveCityInfo(city.slug, city.sourceSlug);
}

function buildFallbackMustSee(city: PublicCityDto, categories: Array<[string, number]>, venues: PublicVenueDto[]) {
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

function rankRecommended(sessions: PublicSessionDto[]) {
  return [...sessions].sort((a, b) => {
    const scoreDiff = sessionQualityScore(b) - sessionQualityScore(a);
    if (scoreDiff) return scoreDiff;
    return new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime();
  });
}

function sessionQualityScore(session: PublicSessionDto) {
  let score = 0;
  if (session.imageUrl) score += 3;
  if (session.priceFrom) score += 3;
  if (session.purchaseUrl || session.widgetUrl || session.deeplinkUrl) score += 2;
  if (session.tags.length) score += 1;
  if ((session.sessionCount || 0) > 1) score += 1;
  return score;
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(n)} событий`;
  if (mod10 === 1) return `${formatNumber(n)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(n)} события`;
  return `${formatNumber(n)} событий`;
}

function cityInPrepositional(city: PublicCityDto) {
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
    'respublika-bashkortostan': 'в Республике Башкортостан',
    'respublika-kareliya': 'в Республике Карелия',
    'ulyanovskaya-oblast': 'в Ульяновской области',
    'habarovskiy-kray': 'в Хабаровском крае',
    'primorskiy-kray': 'в Приморском крае',
    'altayskiy-kray': 'в Алтайском крае',
    'samarskaya-oblast': 'в Самарской области',
    'chelyabinskaya-oblast': 'в Челябинской области',
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

function applyCityMeta(payload: PublicCityPageDto) {
  document.title = payload.city.seoTitle || `${payload.city.name}: афиша и билеты | Дайбилет`;
  upsertMeta('description', payload.city.seoDescription || `Афиша событий, экскурсии, музеи и билеты ${cityInPrepositional(payload.city)}.`);
  // robots задаётся в generateMetadata (SSR); клиент не перезаписывает noindex thin-страниц
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
