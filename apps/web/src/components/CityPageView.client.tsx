'use client';

import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Grid3X3,
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
import { inCityPrepositional } from '@/lib/city-declension';
import { resolveCityInfo, type CityInfoEntry } from '@/lib/cityInfo';
import { isOpenDate } from '@/lib/event-card-meta';
import {
  collectSessionStartsAtTimes,
  isSameSessionDay,
  isSessionWeekend,
  resolveSessionTimeZoneForSession,
} from '@/lib/datetime';
import type {
  PublicCityDto,
  PublicCityPageDto,
  PublicLandingDto,
  PublicSessionDto,
  PublicVenueDto,
} from '@daibilet/contracts/public';

type ViewMode = 'cards' | 'table';
type DateFilter = 'all' | 'today' | 'weekend';

const CITY_HASH_ALIASES: Record<string, string> = {
  'city-schedule': 'affiche',
  'city-directions': 'directions',
  'city-sights': 'sights',
  'city-travel': 'travel',
  'city-guide-faq': 'faq',
  'city-seo': 'seo',
};

const SECTION_SCROLL_MT = 'scroll-mt-[calc(var(--site-header-height)+3.25rem)]';

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
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('all');
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
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    scrollToSection(hash);
  }, [contentReady, slug]);

  React.useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) scrollToSection(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const sessions = React.useMemo(() => {
    if (!payload) return [];
    return payload.sessions.filter((session) => {
      if (category !== 'all' && session.category !== category) return false;
      if (tag !== 'all' && !session.tags.includes(tag)) return false;
      if (!matchesCityDateFilter(session, dateFilter)) return false;
      return true;
    });
  }, [category, dateFilter, payload, tag]);

  const city = payload?.city;
  const categories = city ? Object.entries(city.categories).sort((a, b) => b[1] - a[1]) : [];
  const popularTags = React.useMemo(
    () => (payload ? collectPopularTags(payload.sessions, 12).map(({ name, events }) => ({ name, count: events })) : []),
    [payload],
  );
  const guide = city ? cityGuideFor(city) : null;
  const recommended = payload ? rankRecommended(payload.sessions).slice(0, 6) : [];
  const unifiedFaq = React.useMemo(() => mergeCityFaqItems(guide?.faq, faqItems), [faqItems, guide?.faq]);

  const hasDirections = Boolean(
    (payload?.landings?.length || 0) > 0 || categories.length > 0,
  );
  const hasVenues = Boolean(payload?.venues?.length);
  const hasTravel = Boolean(guide?.travel?.trim());
  const hasSights = Boolean(
    guide?.sights?.length ||
      guide?.mustSee?.length ||
      (contentReady && (categories.length > 0 || (payload?.venues?.length || 0) > 0)),
  );
  const hasFaq = unifiedFaq.length > 0;
  const hasSeo = Boolean(seoText);

  const tabs = React.useMemo(
    () =>
      [
        { id: 'affiche', label: 'Афиша', show: true },
        { id: 'directions', label: 'Направления', show: hasDirections },
        { id: 'venues', label: 'Площадки', show: hasVenues },
        { id: 'travel', label: 'Как добраться', show: hasTravel },
        { id: 'sights', label: 'Достопримечательности', show: hasSights },
        { id: 'faq', label: 'FAQ', show: hasFaq },
      ].filter((tab) => tab.show),
    [hasDirections, hasFaq, hasSights, hasTravel, hasVenues],
  );

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
            <CityHero city={city} stats={payload.stats} guide={guide} hasTravel={hasTravel} />
            <CityStickyTabs tabs={tabs} />

            <section id="affiche" className={`border-b border-slate-100 ${SECTION_SCROLL_MT}`}>
              <div className="container-page py-8">
                <CityCatalogHeader city={city} count={sessions.length} mode={mode} setMode={setMode} />
                <DateFilterChips active={dateFilter} onSelect={setDateFilter} />
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
                        setDateFilter('all');
                      }}
                    />
                    <PopularTags
                      tags={popularTags}
                      active={tag}
                      onSelect={(value) => {
                        setTag(value);
                        setCategory('all');
                      }}
                    />
                    {dateFilter === 'all' && category === 'all' && tag === 'all' ? (
                      <RecommendedEvents city={city} sessions={recommended} />
                    ) : null}
                    {mode === 'table' ? <CityEventsTable sessions={sessions} /> : <CityEventsGrid sessions={sessions} />}
                  </>
                ) : (
                  <CityScheduleLoadingState />
                )}
              </div>
            </section>

            {contentReady ? (
              <>
                <PopularDirections
                  city={city}
                  landings={payload.landings}
                  categories={categories}
                  onCategory={(value) => {
                    setCategory(value);
                    setTag('all');
                    setDateFilter('all');
                    scrollToSection('affiche');
                  }}
                />
                <VenueHighlights city={city} venues={payload.venues} />
              </>
            ) : (
              <CityContentLoadingState />
            )}

            <CityTravelSection travel={guide?.travel} />
            <CitySightsSection
              city={city}
              guide={guide}
              categories={categories}
              venues={payload.venues}
              allowFallback={contentReady}
            />
            {hasFaq ? <CityFaqSection cityName={city.name} items={unifiedFaq} /> : null}
            {hasSeo && seoText ? <CitySeoTextSection cityName={city.name} text={seoText} /> : null}
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
  hasTravel,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
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
    <section id="top" className="relative min-h-[280px] overflow-hidden border-b border-primary-950 text-white sm:min-h-[320px]">
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
      <div className="container-page relative py-12 sm:py-14">
        <div className="flex items-center gap-2 text-sm text-primary-100/80">
          <button type="button" onClick={() => navigateHome('top')} className="hover:text-white">
            Главная
          </button>
          <span>/</span>
          <span className="text-white">{city.name}</span>
        </div>
        <div className="mt-5 max-w-4xl">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{city.name}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-primary-50/88 sm:text-lg">
            {guide?.brief ||
              `Экскурсии, музеи, мероприятия и активный отдых ${cityIn}. Выбирайте формат, дату и площадку без долгого поиска по разным билетным системам.`}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            <span>
              <span className="font-semibold text-white">{formatNumber(stats.events)}</span> событий
            </span>
            <span aria-hidden="true" className="text-white/35">
              ·
            </span>
            <span>
              <span className="font-semibold text-white">{formatNumber(stats.venues)}</span> площадок
            </span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#affiche"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection('affiche');
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>События {cityIn}</span>
            </a>
            {hasTravel ? (
              <a
                href="#travel"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection('travel');
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Как добраться
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CityStickyTabs({ tabs }: { tabs: Array<{ id: string; label: string }> }) {
  const [activeId, setActiveId] = React.useState(tabs[0]?.id || 'affiche');

  React.useEffect(() => {
    if (!tabs.length) return;
    const elements = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.08, 0.2, 0.4],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [tabs]);

  if (!tabs.length) return null;

  return (
    <nav
      aria-label="Разделы страницы города"
      className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
    >
      <div className="container-page flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={(event) => {
                event.preventDefault();
                setActiveId(tab.id);
                scrollToSection(tab.id);
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `#${tab.id}`);
                }
              }}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${
                active
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-600 hover:text-primary-700'
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function DateFilterChips({
  active,
  onSelect,
}: {
  active: DateFilter;
  onSelect: (value: DateFilter) => void;
}) {
  const chips: Array<{ value: DateFilter; label: string }> = [
    { value: 'all', label: 'Все даты' },
    { value: 'today', label: 'Сегодня' },
    { value: 'weekend', label: 'Выходные' },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onSelect(chip.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            active === chip.value
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {chip.value !== 'all' ? <CalendarDays className="h-3.5 w-3.5" /> : null}
          {chip.label}
        </button>
      ))}
    </div>
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

function PopularDirections({
  city,
  landings,
  categories,
  onCategory,
}: {
  city: PublicCityDto;
  landings: PublicLandingDto[];
  categories: Array<[string, number]>;
  onCategory: (category: string) => void;
}) {
  const cityIn = cityInPrepositional(city);
  const landingItems = landings.slice(0, 8).map((landing) => ({
    key: landing.slug,
    title: landing.title,
    href: landingPageHref(landing.slug),
    count: landing.events,
    kind: 'link' as const,
  }));
  const categoryItems = categories.slice(0, Math.max(0, 8 - landingItems.length)).map(([name, count]) => ({
    key: `category-${name}`,
    title: name,
    count,
    kind: 'category' as const,
    category: name,
  }));
  const items = [...landingItems, ...categoryItems].slice(0, 8);

  if (!items.length) return null;

  return (
    <section id="directions" className={`border-b border-slate-100 bg-slate-50/70 py-8 ${SECTION_SCROLL_MT}`}>
      <div className="container-page">
        <h2 className="text-lg font-bold text-slate-950">Популярные направления</h2>
        <p className="mt-1 text-sm text-slate-600">Подборки и категории {cityIn}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) =>
            item.kind === 'link' ? (
              <a
                key={item.key}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{item.title}</span>
                {item.count ? <span className="text-xs text-slate-400">({formatNumber(item.count)})</span> : null}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            ) : (
              <button
                key={item.key}
                type="button"
                onClick={() => onCategory(item.category)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{item.title}</span>
                {item.count ? <span className="text-xs text-slate-400">({formatNumber(item.count)})</span> : null}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function CitySightsSection({
  city,
  guide,
  categories,
  venues,
  allowFallback = false,
}: {
  city: PublicCityDto;
  guide: CityInfoEntry | null;
  categories: Array<[string, number]>;
  venues: PublicVenueDto[];
  allowFallback?: boolean;
}) {
  const fromSights = guide?.sights?.map((item) => ({ name: item.title, desc: item.text })) || [];
  const fromMustSee = guide?.mustSee?.length ? guide.mustSee : [];
  const places = fromSights.length
    ? fromSights
    : fromMustSee.length
      ? fromMustSee
      : allowFallback
        ? buildFallbackMustSee(city, categories, venues)
        : [];
  if (!places.length) return null;
  const cityIn = cityInPrepositional(city);

  return (
    <section id="sights" className={`container-page border-b border-slate-100 py-10 ${SECTION_SCROLL_MT}`}>
      <h2 className="text-2xl font-bold text-slate-950">Что посмотреть {cityIn}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Главные точки, с которых удобно начать знакомство с городом.
      </p>
      <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {places.slice(0, 6).map((place, index) => (
          <li key={`${place.name}:${index}`} className="flex gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-slate-950">{place.name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{place.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CityTravelSection({ travel }: { travel?: string }) {
  if (!travel?.trim()) return null;
  return (
    <section id="travel" className={`border-b border-slate-100 bg-slate-50/60 py-10 ${SECTION_SCROLL_MT}`}>
      <div className="container-page max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-950">Как добраться и когда ехать</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">{travel}</p>
        <a
          href="#affiche"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection('affiche');
          }}
          className="mt-5 inline-flex text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          К афише →
        </a>
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
    <section id="venues" className={`container-page border-b border-slate-100 py-10 ${SECTION_SCROLL_MT}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Площадки и локации</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Музеи, театры, причалы и точки старта экскурсий {cityIn}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <a
            href="#affiche"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection('affiche');
            }}
            className="text-primary-700 hover:text-primary-800"
          >
            Смотреть афишу
          </a>
          {locations.length ? (
            <a href="/locations" className="text-primary-700 hover:text-primary-800">
              Все локации →
            </a>
          ) : null}
        </div>
      </div>
      <ul className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
        {featured.map((venue) => (
          <li key={venue.id}>
            <a
              href={venueHref(venue)}
              className="flex flex-col gap-1 py-3.5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="font-semibold text-slate-950">{venue.name}</span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {venue.address ? (
                  <span className="line-clamp-1">{venue.address}</span>
                ) : (
                  <span>{pluralEvents(venue.events)}</span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PopularTags({
  tags,
  active,
  onSelect,
}: {
  tags: Array<{ name: string; count: number }>;
  active: string;
  onSelect: (tag: string) => void;
}) {
  if (!tags.length) return null;
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Популярные теги</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelect(active === item.name ? 'all' : item.name)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active === item.name
                ? 'border-primary-500 bg-primary-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            <Tag className="h-3 w-3" />
            {item.name}
            <span className={active === item.name ? 'text-white/70' : 'text-slate-400'}>({formatNumber(item.count)})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecommendedEvents({ city, sessions }: { city: PublicCityDto; sessions: PublicSessionDto[] }) {
  if (!sessions.length) return null;
  const cityIn = cityInPrepositional(city);
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-slate-950">Стоит внимания {cityIn}</h3>
      <p className="mt-1 text-sm text-slate-500">Ближайшие даты и наполненные карточки.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <EventCard key={session.id} session={session} />
        ))}
      </div>
    </div>
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
        <h2 className="text-2xl font-bold text-slate-950">Афиша {cityIn}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {pluralEvents(count)} после выбранных фильтров. Для повторяющихся событий карточка объединяет ближайшие слоты.
        </p>
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:inline-flex">
        <button
          type="button"
          onClick={() => setMode('cards')}
          className={`inline-flex min-h-10 items-center gap-2 px-4 text-sm font-medium ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Grid3X3 className="h-4 w-4" />
          Карточки
        </button>
        <button
          type="button"
          onClick={() => setMode('table')}
          className={`inline-flex min-h-10 items-center gap-2 border-l border-slate-200 px-4 text-sm font-medium ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
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
      <button
        type="button"
        onClick={props.onReset}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${props.active === 'all' && props.activeTag === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
      >
        Все {formatNumber(props.total)}
      </button>
      {props.activeTag !== 'all' ? (
        <button
          type="button"
          onClick={props.onReset}
          className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
        >
          <Search className="h-3.5 w-3.5" />
          {props.activeTag}
        </button>
      ) : null}
      {props.categories.map(([name, count]) => (
        <button
          key={name}
          type="button"
          onClick={() => props.onCategory(name)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${props.active === name ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
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
                <a href={eventHref(session)} className="font-medium text-slate-950 hover:text-primary-700">
                  {session.title}
                </a>
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

function CitySeoTextSection({ cityName, text }: { cityName: string; text: string }) {
  return (
    <section id="seo" className={`border-t border-slate-100 bg-slate-50/70 py-12 ${SECTION_SCROLL_MT}`}>
      <div className="container-page max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-900">Афиша {cityName}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
      </div>
    </section>
  );
}

function CityFaqSection({ cityName, items }: { cityName: string; items: CityFaqItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <section id="faq" className={`border-t border-slate-100 py-12 ${SECTION_SCROLL_MT}`}>
      <div className="container-page">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900 md:text-3xl">Частые вопросы</h2>
        <p className="mb-8 text-center text-slate-600">Ответы о городе и афише {cityName}</p>
        <div className="mx-auto max-w-3xl space-y-2">
          {items.map((item, index) => {
            const open = openIndex === index;
            return (
              <div
                key={`${item.question}:${index}`}
                className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left text-sm font-medium text-slate-900"
                >
                  <span className="pr-2">{item.question}</span>
                  <span className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {open ? <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{item.answer}</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
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

function mergeCityFaqItems(
  editorial: CityInfoEntry['faq'] | undefined,
  generated: CityFaqItem[],
): CityFaqItem[] {
  const items: CityFaqItem[] = [];
  const seen = new Set<string>();

  for (const item of editorial || []) {
    const question = item.q.trim();
    const key = question.toLowerCase();
    if (!question || seen.has(key)) continue;
    seen.add(key);
    items.push({ question, answer: item.a });
  }

  for (const item of generated) {
    const question = item.question.trim();
    const key = question.toLowerCase();
    if (!question || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items;
}

function matchesCityDateFilter(session: PublicSessionDto, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  if (isOpenDate(session)) return true;
  const timeZone = resolveSessionTimeZoneForSession(session);
  const times = collectSessionStartsAtTimes(session);
  if (!times.length) return false;
  return times.some((startsAt) => {
    if (filter === 'today') return isSameSessionDay(startsAt, new Date(), timeZone);
    if (filter === 'weekend') return isSessionWeekend(startsAt, timeZone);
    return true;
  });
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
  if (city.type === 'region') return `в регионе ${name}`;
  return inCityPrepositional(name);
}

function resolveSectionId(hash: string): string {
  const raw = hash.replace(/^#/, '');
  return CITY_HASH_ALIASES[raw] || raw;
}

function scrollToSection(id: string) {
  const targetId = resolveSectionId(id);
  window.setTimeout(() => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
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
