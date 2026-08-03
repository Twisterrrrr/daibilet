'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, Grid3X3, ListFilter, MapPin, Ticket } from 'lucide-react';

import { CityHubArticlesGrid } from '@/components/CityHubArticleTeaser.client';
import { CityAdmissionBlock } from '@/components/CityAdmissionBlock';
import { EventCard } from '@/components/EventCard';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import Link from 'next/link';
import { formatStreetAddress } from '@/lib/address';
import { formatMoney, formatNumber, formatPriceFrom, pluralEvents, pluralVenues } from '@/lib/format';
import type { CityFaqItem } from '@/lib/city-faq';
import type { CityHubArticlesBuckets } from '@/lib/city-hub-articles';
import type { CityHubTemplate } from '@/lib/city-hub-template';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import { venuePageTemplate } from '@/lib/venue-meta';
import { eventHref, sessionVenueHref, venueHref } from '@/lib/routes';
import { inCityAccusative, inCityPrepositional, cityToGenitive } from '@/lib/city-declension';
import { buildCityHubSeoPhrase } from '@/lib/city-hub-seo';
import { isCityHubSectionHidden, resolveCityHubConfig } from '@/lib/city-hub-config';
import { matchSightAfficheLink, resolveFeaturedDirections } from '@/lib/city-hub-directions';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityImage } from '@/lib/city-images';
import { CITY_NIGHT_HERO } from '@/lib/city-night-hero';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { CityDayPresetBlock } from '@/components/CityDayPresetBlock.client';
import { MustSeeFilterTabs } from '@/components/MustSeeFilterTabs.client';
import { resolveCityInfo, type CityInfoEntry, type CityMustSeeItem } from '@/lib/cityInfo';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import { dayRouteItemFromMustSee } from '@/lib/day-route-from-place';
import {
  buildMustSeeFilterTabs,
  classifyMustSeePlace,
  type MustSeeFilterId,
} from '@/lib/must-see-filters';
import { isOpenDate, MIN_DISPLAY_PRICE_RUB } from '@/lib/event-card-meta';
import {
  collectSessionStartsAtTimes,
  isSameSessionDay,
  isSessionTomorrow,
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
type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend';

const CITY_HASH_ALIASES: Record<string, string> = {
  'city-schedule': 'affiche',
  'city-directions': 'more',
  'city-sights': 'sights',
  'city-travel': 'practice',
  'city-guide-faq': 'practice',
  'city-seo': 'seo',
  'why-go': 'about',
  'zachem-ehat': 'about',
  directions: 'more',
  venues: 'more',
  travel: 'practice',
  faq: 'practice',
};

const SECTION_SCROLL_MT = 'scroll-mt-[calc(var(--site-header-height)+3.25rem)]';

export function CityPageView({
  slug,
  initialPayload,
  faqItems = [],
  seoText = null,
  hubTemplate = 'default',
  hubArticles = null,
  admission = null,
}: {
  slug: string;
  initialPayload: PublicCityPageDto | null;
  faqItems?: CityFaqItem[];
  seoText?: string | null;
  /** `editorial` — параллельный Lovable-like visual; default = фаза 1 wireframe. */
  hubTemplate?: CityHubTemplate;
  hubArticles?: CityHubArticlesBuckets | null;
  admission?: FinanceAdmissionListResult | null;
}) {
  const editorial = hubTemplate === 'editorial';
  const [payload, setPayload] = React.useState<PublicCityPageDto | null>(initialPayload);
  const [contentReady, setContentReady] = React.useState(() => Boolean(initialPayload?.sessions?.length));
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState('all');
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
    const filtered = payload.sessions.filter((session) => {
      if (category !== 'all' && session.category !== category) return false;
      if (!matchesCityDateFilter(session, dateFilter)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => sessionHitScore(b) - sessionHitScore(a));
  }, [category, dateFilter, payload]);

  const city = payload?.city;
  // Chip facets = hub feed only (same universe as the list / «Все»), not full-city catalog.
  const categories = React.useMemo(() => {
    if (!payload?.sessions?.length) return [] as Array<[string, number]>;
    const counts = new Map<string, number>();
    for (const session of payload.sessions) {
      const name = session.category?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [payload]);
  const guide = city ? cityGuideFor(city) : null;
  const hubConfig = React.useMemo(() => resolveCityHubConfig(slug), [slug]);
  const unifiedFaq = React.useMemo(() => {
    const merged = mergeCityFaqItems(guide?.faq, faqItems);
    if (merged.length) return merged;
    if (!city?.name) return [];
    return defaultCityFaq(city.name);
  }, [faqItems, guide?.faq, city?.name]);
  const featuredDirections = React.useMemo(
    () =>
      resolveFeaturedDirections({
        config: hubConfig,
        landings: payload?.landings || [],
        categories,
        citySlug: city?.slug || city?.sourceSlug || slug,
      }),
    [hubConfig, payload?.landings, categories, city?.slug, city?.sourceSlug, slug],
  );

  const hasDirections = Boolean(
    !isCityHubSectionHidden(hubConfig, 'directions') &&
      (featuredDirections.length > 0 ||
        (payload?.landings?.some((landing) => Number(landing.events) > 0) ?? false) ||
        categories.some(([, count]) => count > 0)),
  );
  const hasVenues = Boolean(!isCityHubSectionHidden(hubConfig, 'venues') && payload?.venues?.length);
  const hasTravel = Boolean(!isCityHubSectionHidden(hubConfig, 'travel') && guide?.travel?.trim());
  const hasSights = Boolean(
    !isCityHubSectionHidden(hubConfig, 'sights') &&
      (guide?.sights?.length ||
        guide?.mustSee?.length ||
        (contentReady && (categories.length > 0 || (payload?.venues?.length || 0) > 0))),
  );
  const hasFaq = unifiedFaq.length > 0;
  const hasSeo = Boolean(seoText);
  const aboutArticles = hubArticles?.about || [];
  const afficheArticles = hubArticles?.affiche || [];
  const sightsArticles = hubArticles?.sights || [];
  const practiceArticles = hubArticles?.practice || [];
  const moreArticles = hubArticles?.more || [];
  const footerArticles = React.useMemo(() => {
    const seen = new Set<string>();
    const all = [...aboutArticles, ...afficheArticles, ...sightsArticles, ...practiceArticles, ...moreArticles];
    return all.filter((article) => {
      const key = article.slug || article.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [aboutArticles, afficheArticles, sightsArticles, practiceArticles, moreArticles]);
  const hasAbout = Boolean(guide?.hookFact?.trim());
  const hasPractice = hasTravel || hasFaq || practiceArticles.length > 0;
  const hasMore = hasDirections || hasVenues || moreArticles.length > 0;
  const showSightsBlock = hasSights;
  // Story cards UI hidden (owner 2026-08-03); keep build helper for later - do not render.

  const tabs = React.useMemo(
    () =>
      [
        { id: 'about', label: 'Зачем ехать', show: hasAbout },
        { id: 'sights', label: 'Главные места', show: showSightsBlock },
        { id: 'affiche', label: 'Афиша', show: true },
        { id: 'practice', label: 'Советы', show: hasPractice },
        { id: 'more', label: 'Топ-запросы', show: hasMore },
        { id: 'blog', label: 'Из блога', show: footerArticles.length > 0 },
      ].filter((tab) => tab.show),
    [footerArticles.length, hasAbout, hasMore, hasPractice, showSightsBlock],
  );

  return (
    <div className={editorial ? 'bg-zinc-50 text-zinc-900' : 'bg-white text-slate-900'}>
      <div>
        {!payload && !error ? <CityLoadingState editorial={editorial} /> : null}

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
            <CityHero
              city={city}
              stats={payload.stats}
              guide={guide}
              hasTravel={hasTravel}
              hubConfig={hubConfig}
              editorial={editorial}
            />
            <CityStickyTabs tabs={tabs} editorial={editorial} />

            {hasAbout ? (
              <CityWhyGoSection guide={guide} editorial={editorial} />
            ) : null}

            {showSightsBlock ? (
              <CitySightsSection
                city={city}
                guide={guide}
                categories={categories}
                venues={payload.venues}
                landings={payload.landings}
                allowFallback={contentReady}
                editorial={editorial}
                articles={[]}
                sessions={payload.sessions}
              />
            ) : null}

            <section
              id="affiche"
              className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'} ${SECTION_SCROLL_MT}`}
            >
              <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-8'}`}>
                <CityCatalogHeader
                  mode={mode}
                  setMode={setMode}
                  editorial={editorial}
                />
                <h3 className={`mb-3 text-lg font-semibold ${editorial ? 'text-zinc-900' : 'text-slate-900'}`}>
                  Что купить сейчас
                </h3>
                <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 md:flex-nowrap md:overflow-x-auto md:pb-0.5">
                  <DateFilterChips active={dateFilter} onSelect={setDateFilter} editorial={editorial} />
                  {contentReady ? (
                    <CategoryFilter
                      categories={categories}
                      active={category}
                      filteredCount={sessions.length}
                      editorial={editorial}
                      onCategory={setCategory}
                      onReset={() => {
                        setCategory('all');
                        setDateFilter('all');
                      }}
                    />
                  ) : null}
                </div>
                {contentReady ? (
                  <>
                    {mode === 'table' ? (
                      <CityEventsTable sessions={sessions} />
                    ) : (
                      <CityEventsGrid sessions={sessions} editorial={editorial} />
                    )}
                  </>
                ) : (
                  <CityScheduleLoadingState />
                )}
              </div>
            </section>

            {hasPractice ? (
              <section
                id="practice"
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'} ${SECTION_SCROLL_MT}`}
              >
                <div className={`container-page ${editorial ? 'pt-12 pb-4' : 'pt-8 pb-2'}`}>
                  <h2
                    className={
                      editorial
                        ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
                        : 'text-2xl font-bold text-slate-950'
                    }
                  >
                    Советы
                  </h2>
                  <p className={`mt-2 max-w-3xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                    Как добраться, когда ехать и ответы на частые вопросы.
                  </p>
                </div>
                <CityTravelSection travel={guide?.travel} editorial={editorial} nested />
                {hasFaq ? (
                  <CityFaqSection cityName={city.name} items={unifiedFaq} editorial={editorial} nested />
                ) : null}
              </section>
            ) : null}

            {hasMore ? (
              <section
                id="more"
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'} ${SECTION_SCROLL_MT}`}
              >
                <div className={`container-page ${editorial ? 'pt-12 pb-4' : 'pt-8 pb-2'}`}>
                  <h2
                    className={
                      editorial
                        ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
                        : 'text-2xl font-bold text-slate-950'
                    }
                  >
                    Топ-запросы
                  </h2>
                </div>
                {contentReady ? (
                  <>
                    <PopularDirections
                      city={city}
                      featuredDirections={featuredDirections}
                      categories={categories}
                      editorial={editorial}
                      nested
                      onCategory={(value) => {
                        setCategory(value);
                        setDateFilter('all');
                        scrollToSection('affiche');
                      }}
                    />
                    {admission && admission.items.length > 0 ? (
                      <CityAdmissionBlock
                        admission={admission}
                        cityName={city.name}
                        editorial={editorial}
                        nested
                      />
                    ) : null}
                    <VenueHighlights
                      city={city}
                      venues={payload.venues}
                      topN={hubConfig?.venuesTopN}
                      editorial={editorial}
                      nested
                    />
                  </>
                ) : (
                  <CityContentLoadingState />
                )}
              </section>
            ) : contentReady ? null : (
              <CityContentLoadingState />
            )}

            {footerArticles.length ? (
              <section
                id="blog"
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'} ${SECTION_SCROLL_MT}`}
              >
                <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-8'}`}>
                  <h2
                    className={
                      editorial
                        ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
                        : 'text-2xl font-bold text-slate-950'
                    }
                  >
                    Из блога
                  </h2>
                  <p className={`mt-2 max-w-3xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                    Подробные материалы о городе - в подвале страницы, чтобы не отвлекать от выбора билетов.
                  </p>
                  <CityHubArticlesGrid
                    articles={footerArticles}
                    editorial={editorial}
                    sessions={payload.sessions}
                  />
                </div>
              </section>
            ) : null}

            {hasSeo && seoText ? (
              <CitySeoTextSection cityName={city.name} text={seoText} editorial={editorial} />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function CityHero({
  city,
  stats,
  guide,
  hasTravel,
  hubConfig = null,
  editorial = false,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
  hubConfig?: ReturnType<typeof resolveCityHubConfig>;
  editorial?: boolean;
}) {
  if (editorial) {
    return (
      <CityHeroEditorial
        city={city}
        stats={stats}
        guide={guide}
        hasTravel={hasTravel}
        hubConfig={hubConfig}
      />
    );
  }
  return (
    <CityHeroDefault
      city={city}
      stats={stats}
      guide={guide}
      hasTravel={hasTravel}
      hubConfig={hubConfig}
    />
  );
}

function CityHeroEditorial({
  city,
  stats,
  guide,
  hasTravel,
  hubConfig = null,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
  hubConfig?: ReturnType<typeof resolveCityHubConfig>;
}) {
  return (
    <CityHeroStrip
      city={city}
      stats={stats}
      guide={guide}
      hasTravel={hasTravel}
      hubConfig={hubConfig}
      editorial
    />
  );
}

function CityHeroDefault({
  city,
  stats,
  guide,
  hasTravel,
  hubConfig = null,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
  hubConfig?: ReturnType<typeof resolveCityHubConfig>;
}) {
  return (
    <CityHeroStrip city={city} stats={stats} guide={guide} hasTravel={hasTravel} hubConfig={hubConfig} />
  );
}

/** HERO3p: 16:9 gutter md4/lg10/xl16/2xl20 + light #122868 at photo seam; иначе нейтральный strip. */
function CityHeroStrip({
  city,
  stats,
  guide,
  hasTravel,
  hubConfig = null,
  editorial = false,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
  hubConfig?: ReturnType<typeof resolveCityHubConfig>;
  editorial?: boolean;
}) {
  const [heroImageFailed, setHeroImageFailed] = React.useState(false);
  const cityIn = cityInPrepositional(city);
  // Short lead always in hero; hookFact lives in «Зачем ехать» below.
  const brief =
    guide?.brief?.trim() ||
    `Экскурсии, музеи, мероприятия и активный отдых ${cityIn}. Выбирайте формат и дату - и покупайте билет онлайн на Дайбилете.`;
  const primaryCta = hubConfig?.primaryCta;
  const primaryTarget = primaryCta?.target || '#affiche';
  const primaryLabel = primaryCta?.label || `События ${cityIn}`;
  const seasonChip = hubConfig?.highlightSeason;
  const heroImage = resolveCityImage({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
    heroImageUrl: city.heroImageUrl,
  });

  React.useEffect(() => {
    setHeroImageFailed(false);
  }, [heroImage]);

  /** Layout lock from first paint: image error must not collapse night shell (CLS). */
  const nightShell = Boolean(heroImage);
  const showPhoto = Boolean(heroImage && !heroImageFailed);
  const heroFocus = resolveCityImageObjectPosition({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
  });

  const titleClass = nightShell
    ? editorial
      ? 'font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl'
      : 'font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl'
    : editorial
      ? 'font-serif text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl'
      : 'font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl';

  const briefClass = nightShell
    ? 'mt-3 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg'
    : editorial
      ? 'mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg'
      : 'mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg';

  const seasonChipClass = nightShell
    ? 'inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25'
    : editorial
      ? 'inline-flex items-center rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-800'
      : 'inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800';

  const statsClass = nightShell
    ? 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70'
    : editorial
      ? 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500'
      : 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500';

  const statsStrongClass = nightShell
    ? 'font-semibold text-white'
    : editorial
      ? 'font-semibold text-zinc-800'
      : 'font-semibold text-slate-700';

  const statsDotClass = nightShell ? 'text-white/35' : editorial ? 'text-zinc-300' : 'text-slate-300';

  const primaryCtaClass = nightShell
    ? editorial
      ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-zinc-950 ring-1 ring-white transition hover:bg-white/90'
      : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-white/90'
    : editorial
      ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-medium text-white ring-1 ring-zinc-950 transition hover:bg-zinc-800'
      : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700';

  const secondaryCtaClass = nightShell
    ? editorial
      ? 'inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/15'
      : 'inline-flex min-h-11 items-center justify-center rounded-lg border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15'
    : editorial
      ? 'inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 hover:border-zinc-400'
      : 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-slate-300';

  const sectionClass = nightShell
    ? CITY_NIGHT_HERO.section
    : editorial
      ? 'border-b border-zinc-200 bg-zinc-50'
      : 'border-b border-slate-200 bg-slate-50';

  const contentClass = nightShell ? CITY_NIGHT_HERO.content : 'container-page py-8 sm:py-10';

  return (
    <div id="top">
      <PageBreadcrumbBar
        items={[
          { label: 'Главная', href: '/' },
          { label: city.type === 'region' ? 'Направления' : 'Города', href: '/cities' },
          { label: city.name },
        ]}
      />
      <section className={sectionClass}>
        {nightShell ? (
          <div
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
            style={{ backgroundColor: CITY_NIGHT_HERO.navy }}
            aria-hidden
          >
            {/* 1) LeftGrad → light #122868 at photo. 2) Photo + soft edge fade md-only. 3) Right gutter light→deep rim. No alpha-mask. */}
            <div
              className={CITY_NIGHT_HERO.leftFillDesktop}
              style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftDesktop }}
            />
            <div className={CITY_NIGHT_HERO.photoFrame}>
              {showPhoto ? (
                <SafeImage
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  sizes={CITY_NIGHT_HERO.imageSizes}
                  style={{ objectPosition: heroFocus }}
                  onError={() => setHeroImageFailed(true)}
                  className="object-cover object-center"
                />
              ) : null}
              {/* Soft L+R edge fade (~15% each, md+) - no CSS mask-image on mobile full-bleed. */}
              <div
                className={CITY_NIGHT_HERO.photoEdgeFade}
                style={{ backgroundImage: CITY_NIGHT_HERO.fadePhotoEdges }}
              />
            </div>
            <div
              className="absolute inset-0 md:hidden"
              style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftMobile }}
            />
            <div
              className={CITY_NIGHT_HERO.rightGutter}
              style={{ backgroundImage: CITY_NIGHT_HERO.fadeRightGutter }}
            />
          </div>
        ) : null}
        <div className={contentClass}>
          <div className={nightShell ? CITY_NIGHT_HERO.contentInner : 'max-w-2xl'}>
            <h1 className={titleClass}>{city.name}</h1>
            {brief ? <p className={briefClass}>{brief}</p> : null}
            <div className="mt-5 md:mt-3">
              {seasonChip ? (
                <p className={`text-sm ${nightShell ? 'text-white/70' : editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                  <span className={seasonChipClass}>
                    {seasonChip.label}
                    {seasonChip.monthsHint ? ` (${seasonChip.monthsHint})` : ''}
                  </span>
                </p>
              ) : null}
              <p className={`${seasonChip ? 'mt-3 ' : ''}${statsClass}`}>
                <span className={statsStrongClass}>{pluralEvents(stats.events)}</span>
                <span aria-hidden="true" className={statsDotClass}>
                  ·
                </span>
                <span className={statsStrongClass}>{pluralVenues(stats.venues)}</span>
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {primaryTarget.startsWith('#') ? (
                  <a
                    href={primaryTarget}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(primaryTarget.replace(/^#/, ''));
                    }}
                    className={primaryCtaClass}
                  >
                    <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{primaryLabel}</span>
                  </a>
                ) : (
                  <Link href={primaryTarget} className={primaryCtaClass}>
                    <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{primaryLabel}</span>
                  </Link>
                )}
                {hasTravel ? (
                  <a
                    href="#travel"
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection('travel');
                    }}
                    className={secondaryCtaClass}
                  >
                    Как добраться
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CityStickyTabs({
  tabs,
  editorial = false,
}: {
  tabs: Array<{ id: string; label: string }>;
  editorial?: boolean;
}) {
  const [activeId, setActiveId] = React.useState(tabs[0]?.id || 'affiche');
  /** Пока идёт programmatic smooth-scroll - не даём observer перебить activeId. */
  const scrollLockUntilRef = React.useRef(0);

  React.useEffect(() => {
    if (!tabs.length) return;
    const elements = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < scrollLockUntilRef.current) return;
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
      className={
        editorial
          ? 'sticky top-[var(--site-header-height)] z-30 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-md'
          : 'sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur'
      }
    >
      <div
        className={
          editorial
            ? 'container-page flex gap-6 overflow-x-auto py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-8'
            : 'container-page flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }
      >
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollLockUntilRef.current = Date.now() + 1200;
                setActiveId(tab.id);
                scrollToSection(tab.id);
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `#${tab.id}`);
                }
              }}
              className={
                editorial
                  ? `shrink-0 border-b-2 py-4 text-sm font-medium transition-colors ${
                      active
                        ? 'border-zinc-950 text-zinc-950'
                        : 'border-transparent text-zinc-500 hover:text-zinc-900'
                    }`
                  : `shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${
                      active
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-slate-600 hover:text-primary-700'
                    }`
              }
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function hubFilterChipClass(isActive: boolean, editorial = false) {
  const base =
    'inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium tracking-wide transition';
  if (editorial) {
    return `${base} ${
      isActive
        ? 'border-zinc-900 bg-zinc-900 text-white'
        : 'border-zinc-200/90 bg-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
    }`;
  }
  return `${base} ${
    isActive
      ? 'border-slate-800 bg-slate-800 text-white'
      : 'border-slate-200/90 bg-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
  }`;
}

function DateFilterChips({
  active,
  onSelect,
  editorial = false,
}: {
  active: DateFilter;
  onSelect: (value: DateFilter) => void;
  editorial?: boolean;
}) {
  const chips: Array<{ value: DateFilter; label: string }> = [
    { value: 'all', label: 'Все даты' },
    { value: 'today', label: 'Сегодня' },
    { value: 'tomorrow', label: 'Завтра' },
    { value: 'weekend', label: 'Выходные' },
  ];

  return (
    <div className="flex shrink-0 flex-wrap gap-1.5 md:flex-nowrap">
      {chips.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onSelect(chip.value)}
            className={hubFilterChipClass(isActive, editorial)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

function CityWhyGoSection({
  guide,
  editorial = false,
}: {
  guide: CityInfoEntry | null;
  editorial?: boolean;
}) {
  const hook = guide?.hookFact?.trim();
  // Brief is shown in hero; keep hookFact here. Story cards UI temporarily hidden.
  // H2 «Зачем ехать…» перенесён на секцию главных мест; над фактом заголовок не дублируем.

  return (
    <section
      id="about"
      className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'} ${SECTION_SCROLL_MT}`}
    >
      <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-8'}`}>
        {hook ? (
          <div
            className={`rounded-2xl px-5 py-4 sm:px-6 sm:py-5 ${
              editorial
                ? 'bg-amber-50 ring-1 ring-amber-200/80'
                : 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 ring-1 ring-amber-200/70'
            }`}
          >
            <p className={`text-xs font-semibold ${editorial ? 'text-amber-800' : 'text-amber-800'}`}>
              Интересный факт
            </p>
            <p
              className={`mt-2 max-w-3xl text-sm leading-6 ${
                editorial ? 'text-zinc-600' : 'text-slate-600'
              }`}
            >
              {hook}
            </p>
          </div>
        ) : null}
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

function CityLoadingState({ editorial = false }: { editorial?: boolean }) {
  // Same CITY_NIGHT_HERO shell as CityHeroStrip / SiteChromeSkeleton city (mobile min-h + top-heavy py).
  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex min-h-11 items-center gap-1.5 py-3" aria-hidden>
          <div className="h-3 w-16 rounded bg-slate-200/80" />
          <div className="h-3 w-3 rounded bg-slate-100" />
          <div className="h-3 w-20 rounded bg-slate-200/70" />
        </div>
      </div>
      <section className={CITY_NIGHT_HERO.section} aria-busy="true" aria-label="Загрузка">
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{ backgroundColor: CITY_NIGHT_HERO.navy }}
          aria-hidden
        >
          <div
            className={CITY_NIGHT_HERO.leftFillDesktop}
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftDesktop }}
          />
          <div className={`${CITY_NIGHT_HERO.photoFrame} bg-white/[0.04]`} />
          <div
            className="absolute inset-0 md:hidden"
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftMobile }}
          />
          <div
            className={CITY_NIGHT_HERO.rightGutter}
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeRightGutter }}
          />
        </div>
        <div className={CITY_NIGHT_HERO.content}>
          <div className={CITY_NIGHT_HERO.contentInner}>
            <div className={`h-10 max-w-md rounded sm:h-12 ${editorial ? 'bg-white/20' : 'bg-white/22'}`} />
            <div className="mt-3 h-4 max-w-xl rounded bg-white/16" />
            <div className="mt-2 h-4 max-w-lg rounded bg-white/12" />
            <div className="mt-5 md:mt-3 flex gap-3">
              <div className="h-11 w-44 rounded-lg bg-white/24" />
              <div className="h-11 w-36 rounded-lg bg-white/12" />
            </div>
          </div>
        </div>
      </section>
      <section className="container-page py-10">
        <div className={`h-6 w-64 rounded ${editorial ? 'bg-zinc-100' : 'bg-slate-100'}`} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`h-32 rounded-lg ${editorial ? 'bg-zinc-100' : 'bg-slate-50'}`} />
          ))}
        </div>
      </section>
    </>
  );
}

function PopularDirections({
  city,
  featuredDirections,
  categories,
  onCategory,
  editorial = false,
  nested = false,
}: {
  city: PublicCityDto;
  featuredDirections: ReturnType<typeof resolveFeaturedDirections>;
  categories: Array<[string, number]>;
  onCategory: (category: string) => void;
  editorial?: boolean;
  nested?: boolean;
}) {
  const cityIn = cityInPrepositional(city);
  const citySlug = city.slug || city.sourceSlug || undefined;
  const landingItems = featuredDirections
    .filter((item) => item.slug && item.events > 0)
    .map((item) => ({
      slug: item.slug!,
      title: item.title,
      subtitle: item.subtitle || null,
      events: item.events,
      priceFrom: item.priceFrom ?? null,
    }));
  const landingTitles = new Set(landingItems.map((item) => item.title.trim().toLowerCase()));
  const categoryItems = featuredDirections
    .filter((item) => item.categoryKey && item.events > 0)
    .filter((item) => !landingTitles.has(item.title.trim().toLowerCase()))
    .map((item) => [item.categoryKey!, item.events] as [string, number])
    .concat(
      categories
        .filter(([, count]) => count > 0)
        .filter(([name]) => !landingTitles.has(name.trim().toLowerCase()))
        .filter(([name]) => !featuredDirections.some((item) => item.categoryKey === name)),
    )
    .slice(0, Math.max(0, 6 - landingItems.length));

  if (!landingItems.length && !categoryItems.length) return null;

  return (
    <section
      id="directions"
      className={`py-10 ${nested ? '' : SECTION_SCROLL_MT} ${
        nested
          ? ''
          : `border-b ${editorial ? 'border-zinc-200 bg-zinc-50/50' : 'border-slate-100 bg-slate-50/80'}`
      }`}
    >
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h3
              className={
                editorial
                  ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
                  : 'font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'
              }
            >
              Подборки по топ-запросам
            </h3>
            <p className={`mt-2 text-sm leading-6 sm:text-base ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              Не листайте всю афишу {cityIn}: мы уже собрали то, что ищут чаще всего - с ценами, датами и площадками в
              одном списке.
            </p>
          </div>
          <Link
            href={citySlug ? `/podborki?city=${encodeURIComponent(citySlug)}` : '/podborki'}
            className={`text-sm font-semibold ${
              editorial ? 'text-zinc-700 hover:text-zinc-950' : 'text-primary-700 hover:text-primary-800'
            }`}
          >
            Все подборки →
          </Link>
        </div>

        {landingItems.length ? (
          <div className="mt-6 flex flex-col gap-3 sm:gap-4">
            {landingItems.map((landing, index) => (
              <LandingDirectionCard
                key={landing.slug}
                landing={landing}
                citySlug={citySlug}
                variant="banner"
                rank={index + 1}
              />
            ))}
          </div>
        ) : null}

        {categoryItems.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {categoryItems.map(([name, count]) => (
              <button
                key={`category-${name}`}
                type="button"
                onClick={() => onCategory(name)}
                className={
                  editorial
                    ? 'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50'
                    : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary-700'
                }
              >
                {name}
                <span className="text-xs text-slate-400">{formatNumber(count)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CitySightsSection({
  city,
  guide,
  categories,
  venues,
  landings = [],
  allowFallback = false,
  editorial = false,
  articles = [],
  sessions = [],
}: {
  city: PublicCityDto;
  guide: CityInfoEntry | null;
  categories: Array<[string, number]>;
  venues: PublicVenueDto[];
  landings?: PublicLandingDto[];
  allowFallback?: boolean;
  editorial?: boolean;
  articles?: BlogCardDto[];
  sessions?: PublicSessionDto[];
}) {
  const fromSights: CityMustSeeItem[] =
    guide?.sights?.map((item) => ({
      name: item.title,
      desc: item.text,
      href: item.href,
      venueSlug: item.venueSlug,
      locationSlug: item.locationSlug,
    })) || [];
  const fromMustSee = guide?.mustSee?.length ? guide.mustSee : [];
  // Prefer mustSee: it carries venueSlug/locationSlug for day-route + title links.
  // Sights often duplicate the same 6 places as prose without slugs (batch cities).
  const places: CityMustSeeItem[] = fromMustSee.length
    ? fromMustSee
    : fromSights.length
      ? fromSights
      : allowFallback
        ? buildFallbackMustSee(city, categories, venues)
        : [];
  if (!places.length && !articles.length) return null;
  const cityInto = cityInAccusative(city);
  const citySlug = city.slug || city.sourceSlug || undefined;
  const landingRows = landings.map((landing) => ({
    slug: landing.slug,
    title: landing.title,
    subtitle: landing.subtitle,
    events: landing.events,
    priceFrom: landing.priceFrom,
  }));
  const titleClass = `font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`;

  return (
    <section
      id="sights"
      className={`container-page border-b py-10 ${SECTION_SCROLL_MT} ${
        editorial ? 'border-zinc-200' : 'border-slate-100'
      }`}
    >
      <h2
        className={
          editorial
            ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
            : 'text-2xl font-bold text-slate-950'
        }
      >
        Зачем ехать {cityInto}
      </h2>
      {places.length ? (
        <CitySightsMustSeeList
          places={places}
          venues={venues}
          city={city}
          editorial={editorial}
          namedPresets={guide?.dayRoutePresets}
          landingRows={landingRows}
          categories={categories}
          citySlug={citySlug}
          titleClass={titleClass}
        />
      ) : null}
      {articles.length ? (
        <div className={places.length ? 'mt-8' : 'mt-4'}>
          <h3 className={`text-lg font-semibold ${editorial ? 'text-zinc-900' : 'text-slate-900'}`}>
            Материалы по темам
          </h3>
          <p className={`mt-1 text-sm ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Подборки и гиды, которые помогают выбрать формат прогулки или события.
          </p>
          <CityHubArticlesGrid
            articles={articles}
            editorial={editorial}
            sessions={sessions}
          />
        </div>
      ) : null}
    </section>
  );
}

function CitySightsMustSeeList({
  places,
  venues,
  city,
  editorial,
  namedPresets,
  landingRows,
  categories,
  citySlug,
  titleClass,
}: {
  places: CityMustSeeItem[];
  venues: PublicVenueDto[];
  city: PublicCityDto;
  editorial: boolean;
  namedPresets?: CityInfoEntry['dayRoutePresets'];
  landingRows: Array<{
    slug: string;
    title: string;
    subtitle?: string | null;
    events?: number | null;
    priceFrom?: number | null;
  }>;
  categories: Array<[string, number]>;
  citySlug?: string;
  titleClass: string;
}) {
  const classifiedPlaces = React.useMemo(() => {
    return places.map((place) => {
      const matched = venues.find((venue) => {
        const slug = String(place.venueSlug || place.locationSlug || '').trim();
        return slug && String(venue.slug || '').trim() === slug;
      });
      return { ...place, type: matched?.type || null };
    });
  }, [places, venues]);

  const filterMeta = React.useMemo(
    () => buildMustSeeFilterTabs(classifiedPlaces),
    [classifiedPlaces],
  );
  const [filterId, setFilterId] = React.useState<MustSeeFilterId>(filterMeta.defaultId);

  React.useEffect(() => {
    const ids = new Set(filterMeta.tabs.map((tab) => tab.id));
    if (!ids.has(filterId)) setFilterId(filterMeta.defaultId);
  }, [filterMeta, filterId]);

  const activeId = filterMeta.tabs.length < 2 ? filterMeta.defaultId : filterId;
  const filteredPlaces = React.useMemo(
    () => classifiedPlaces.filter((place) => classifyMustSeePlace(place) === activeId),
    [classifiedPlaces, activeId],
  );
  // With category tabs show the full filtered set; single-tab cities keep top-6.
  const visiblePlaces =
    filterMeta.tabs.length >= 2 ? filteredPlaces : filteredPlaces.slice(0, 6);

  return (
    <>
      <MustSeeFilterTabs
        tabs={filterMeta.tabs}
        activeId={activeId}
        onChange={setFilterId}
        editorial={editorial}
      />
      {/* Mobile: 1-card 85/15 swipe. md+: carousel columns with 2-row vertical stack. */}
      <div
        key={activeId}
        className="horizontal-snap-row mt-6 touch-pan-x snap-x snap-mandatory"
        data-city-must-see-rail
        aria-label="Главные места"
        tabIndex={0}
      >
        <ol className="flex w-max flex-nowrap gap-3 md:grid md:auto-cols-[min(22rem,calc(50vw-3rem))] md:grid-flow-col md:grid-rows-2 md:gap-x-6 md:gap-y-5">
        {visiblePlaces.map((place, index) => {
          const afficheLink = matchSightAfficheLink({
            sightName: place.name,
            sightDesc: place.desc,
            landings: landingRows,
            categories,
            citySlug,
          });
          const placeHref = resolveCityPlaceTitleHref(place, venues);
          const dayRouteItem = dayRouteItemFromMustSee(place, venues, city);
          const matchedVenue = venues.find((venue) => {
            const slug = String(place.venueSlug || place.locationSlug || '').trim();
            return slug && String(venue.slug || '').trim() === slug;
          });
          const blurb = String(
            matchedVenue?.hookFact || matchedVenue?.shortDescription || place.desc || '',
          )
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[—–]/g, '-');
          return (
            <li
              key={`${place.name}:${index}`}
              className="flex w-[85%] min-w-[85%] shrink-0 snap-start gap-3 md:w-auto md:min-w-0 md:max-w-none"
              data-city-must-see-card
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  editorial ? 'bg-zinc-100 text-zinc-800' : 'bg-primary-50 text-primary-700'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                {placeHref ? (
                  <Link
                    href={placeHref}
                    className={`${titleClass} underline decoration-slate-300 underline-offset-2 hover:decoration-current`}
                    data-city-must-see-title
                  >
                    {place.name}
                  </Link>
                ) : (
                  <div className={titleClass}>{place.name}</div>
                )}
                {blurb ? (
                  <p
                    className={`mt-1 text-sm leading-6 ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}
                  >
                    {blurb}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {dayRouteItem ? (
                    <AddToDayRouteButton
                      compact
                      className="!min-h-9 !px-2.5 !py-1.5 !text-[11px]"
                      venue={dayRouteItem}
                    />
                  ) : null}
                  {afficheLink ? (
                    afficheLink.href.startsWith('#') ? (
                      <a
                        href={afficheLink.href}
                        onClick={(event) => {
                          event.preventDefault();
                          scrollToSection(afficheLink.href.replace(/^#/, ''));
                        }}
                        className={`inline-flex text-sm font-semibold ${
                          editorial
                            ? 'text-zinc-700 hover:text-zinc-950'
                            : 'text-primary-700 hover:text-primary-800'
                        }`}
                      >
                        {afficheLink.label} →
                      </a>
                    ) : (
                      <Link
                        href={afficheLink.href}
                        className={`inline-flex text-sm font-semibold ${
                          editorial
                            ? 'text-zinc-700 hover:text-zinc-950'
                            : 'text-primary-700 hover:text-primary-800'
                        }`}
                      >
                        {afficheLink.label} →
                      </Link>
                    )
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
        </ol>
      </div>
      <CityDayPresetBlock
        places={places}
        venues={venues}
        city={city}
        editorial={editorial}
        namedPresets={namedPresets}
      />
    </>
  );
}

function CityTravelSection({
  travel,
  editorial = false,
  nested = false,
}: {
  travel?: string;
  editorial?: boolean;
  nested?: boolean;
}) {
  if (!travel?.trim()) return null;
  return (
    <section
      id="travel"
      className={`py-8 sm:py-10 ${nested ? '' : `${SECTION_SCROLL_MT} border-b`} ${
        nested
          ? editorial
            ? 'bg-zinc-50'
            : 'bg-slate-50'
          : editorial
            ? 'border-zinc-200 bg-zinc-50'
            : 'border-slate-100 bg-slate-50'
      }`}
    >
      <div className="container-page">
        <div className="max-w-3xl">
          <h3
            className={
              editorial
                ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
                : 'text-2xl font-bold text-slate-950'
            }
          >
            Как добраться и когда ехать
          </h3>
          <p className={`mt-4 text-sm leading-7 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>{travel}</p>
          <a
            href="#affiche"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection('affiche');
            }}
            className={`mt-5 inline-flex text-sm font-semibold ${
              editorial ? 'text-zinc-900 underline-offset-4 hover:underline' : 'text-primary-700 hover:text-primary-800'
            }`}
          >
            К афише →
          </a>
        </div>
      </div>
    </section>
  );
}

function VenueHighlights({
  city,
  venues,
  topN = 6,
  editorial = false,
  nested = false,
}: {
  city: PublicCityDto;
  venues: PublicVenueDto[];
  topN?: number;
  editorial?: boolean;
  nested?: boolean;
}) {
  if (!venues.length) return null;
  const cityIn = cityInPrepositional(city);
  const institutions = venues.filter((venue) => venuePageTemplate(venue.type) !== 'location');
  const locations = venues.filter((venue) => venuePageTemplate(venue.type) === 'location');
  const featured = [...institutions, ...locations].slice(0, Math.max(1, topN));

  return (
    <section
      id="venues"
      className={`container-page py-10 ${nested ? '' : `${SECTION_SCROLL_MT} border-b`} ${
        nested ? '' : editorial ? 'border-zinc-200' : 'border-slate-100'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            className={
              editorial
                ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
                : 'text-2xl font-bold text-slate-950'
            }
          >
            Площадки и локации
          </h3>
          <p className={`mt-1 max-w-3xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Музеи, театры, причалы и точки старта экскурсий {cityIn}.
          </p>
        </div>
        <div className={`flex flex-wrap gap-3 text-sm font-semibold ${editorial ? 'text-zinc-800' : ''}`}>
          <a
            href="#affiche"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection('affiche');
            }}
            className={editorial ? 'hover:underline' : 'text-primary-700 hover:text-primary-800'}
          >
            Смотреть афишу
          </a>
          {locations.length ? (
            <a
              href="/locations"
              className={editorial ? 'hover:underline' : 'text-primary-700 hover:text-primary-800'}
            >
              Все локации →
            </a>
          ) : null}
        </div>
      </div>
      <ul
        className={`mt-6 grid grid-cols-1 border-t md:grid-cols-2 md:gap-x-8 ${
          editorial ? 'border-zinc-200' : 'border-slate-100'
        }`}
      >
        {featured.map((venue) => (
          <li
            key={venue.id}
            className={`border-b ${editorial ? 'border-zinc-100' : 'border-slate-100'}`}
          >
            <a
              href={venueHref(venue)}
              className={`flex flex-col gap-1 py-3.5 transition md:pr-3 ${
                editorial ? 'hover:bg-zinc-100/70' : 'hover:bg-slate-50/80'
              }`}
            >
              <span className={`font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>{venue.name}</span>
              <span className={`flex items-center gap-1 text-sm ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {venue.address ? (
                  <span className="line-clamp-1">
                    {formatStreetAddress(venue.address, { city: venue.city }) || venue.address}
                  </span>
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

function CityCatalogHeader({
  mode,
  setMode,
  editorial = false,
}: {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  editorial?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2
          className={
            editorial
              ? 'font-serif text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl'
              : 'font-display text-2xl font-bold tracking-tight text-slate-950'
          }
        >
          Ближайшие события
        </h2>
      </div>
      <div
        className={`hidden overflow-hidden rounded-lg shadow-sm sm:inline-flex ${
          editorial ? 'bg-white ring-1 ring-black/5' : 'border border-slate-200 bg-white'
        }`}
      >
        <button
          type="button"
          onClick={() => setMode('cards')}
          className={`inline-flex min-h-10 items-center gap-2 px-4 text-sm font-medium ${
            mode === 'cards'
              ? editorial
                ? 'bg-zinc-900 text-white'
                : 'bg-primary-600 text-white'
              : editorial
                ? 'text-zinc-600 hover:bg-zinc-50'
                : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Grid3X3 className="h-4 w-4" />
          Карточки
        </button>
        <button
          type="button"
          onClick={() => setMode('table')}
          className={`inline-flex min-h-10 items-center gap-2 border-l px-4 text-sm font-medium ${
            editorial ? 'border-zinc-200' : 'border-slate-200'
          } ${
            mode === 'table'
              ? editorial
                ? 'bg-zinc-900 text-white'
                : 'bg-primary-600 text-white'
              : editorial
                ? 'text-zinc-600 hover:bg-zinc-50'
                : 'text-slate-600 hover:bg-slate-50'
          }`}
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
  filteredCount: number;
  onCategory: (value: string) => void;
  onReset: () => void;
  editorial?: boolean;
}) {
  const editorial = props.editorial;
  const activeAll = props.active === 'all';
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5 md:flex-nowrap">
      <button
        type="button"
        onClick={props.onReset}
        className={hubFilterChipClass(activeAll, editorial)}
      >
        Все
        {activeAll ? (
          <span className="ml-1.5 tabular-nums text-white/70">{formatNumber(props.filteredCount)}</span>
        ) : null}
      </button>
      {props.categories.map(([name]) => {
        const isActive = props.active === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => props.onCategory(name)}
            className={`shrink-0 ${hubFilterChipClass(isActive, editorial)}`}
          >
            {name}
            {isActive ? (
              <span className="ml-1.5 tabular-nums text-white/70">{formatNumber(props.filteredCount)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function CityEventsGrid({
  sessions,
  editorial = false,
}: {
  sessions: PublicSessionDto[];
  editorial?: boolean;
}) {
  if (editorial) {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {sessions.slice(0, 48).map((session) => (
          <AffichePosterCard key={session.id} session={session} />
        ))}
        {!sessions.length ? <EmptyState /> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.slice(0, 48).map((session) => (
        <EventCard key={session.id} session={session} compact />
      ))}
      {!sessions.length ? <EmptyState /> : null}
    </div>
  );
}

function AffichePosterCard({ session }: { session: PublicSessionDto }) {
  const href = eventHref(session);
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const dateBadge = [session.dateLabel, session.timeLabel].filter(Boolean).join(' · ') || session.category;

  return (
    <article className="group relative flex flex-col">
      <Link href={href} className="absolute inset-0 z-[1] rounded-xl" aria-label={`Событие: ${session.title}`} />
      <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-xl bg-zinc-100">
        <SafeImage
          src={session.imageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.affichePoster}
          className="object-cover outline outline-1 -outline-offset-1 outline-black/5 transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              <Ticket className="h-8 w-8 text-zinc-400" />
            </div>
          }
        />
        {dateBadge ? (
          <div className="absolute left-3 top-3">
            <span className="rounded-sm bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-800 backdrop-blur-sm">
              {isOpenDate(session) ? 'Открытая дата' : dateBadge}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className="mb-1 text-lg font-medium leading-tight text-balance text-zinc-900">{session.title}</h3>
        {session.venue ? <p className="mb-3 line-clamp-2 text-sm text-zinc-500">{session.venue}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3">
          {hasPrice ? (
            <span className="text-sm font-medium text-zinc-900">{formatPriceFrom(session.priceFrom)}</span>
          ) : (
            <span />
          )}
          <span className="relative z-[2] text-sm font-medium text-zinc-700 underline-offset-4 group-hover:underline">
            Билеты
          </span>
        </div>
      </div>
    </article>
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

function CitySeoTextSection({
  cityName,
  text,
  editorial = false,
}: {
  cityName: string;
  text: string;
  editorial?: boolean;
}) {
  return (
    <section
      id="seo"
      className={`border-t py-12 ${SECTION_SCROLL_MT} ${
        editorial ? 'border-zinc-200 bg-white/60' : 'border-slate-100 bg-slate-50/70'
      }`}
    >
      <div className="container-page">
        <div className="max-w-3xl">
          <h2
            className={
              editorial
                ? 'font-serif text-3xl font-semibold text-zinc-950'
                : 'text-2xl font-bold text-slate-900'
            }
          >
            {buildCityHubSeoPhrase(cityName)}
          </h2>
          <p className={`mt-3 max-w-2xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>{text}</p>
        </div>
      </div>
    </section>
  );
}

function CityFaqSection({
  cityName,
  items,
  editorial = false,
  nested = false,
}: {
  cityName: string;
  items: CityFaqItem[];
  editorial?: boolean;
  nested?: boolean;
}) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const cityGenitive = cityToGenitive(cityName);

  return (
    <section
      id="faq"
      className={`py-8 sm:py-10 ${nested ? '' : `${SECTION_SCROLL_MT} border-t`} ${
        nested ? '' : editorial ? 'border-zinc-200' : 'border-slate-100'
      }`}
    >
      <div className="container-page">
        <div className="max-w-3xl">
          <h3
            className={
              editorial
                ? 'mb-2 font-serif text-2xl font-semibold text-zinc-950 md:text-3xl'
                : 'mb-2 text-2xl font-bold text-slate-900 md:text-3xl'
            }
          >
            Частые вопросы
          </h3>
          <p className={`mb-6 text-sm ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Ответы о городе и афише {cityGenitive}
          </p>
          <div className="space-y-2">
            {items.map((item, index) => {
              const open = openIndex === index;
              return (
                <div
                  key={`${item.question}:${index}`}
                  className={`rounded-xl border transition-colors ${
                    editorial
                      ? 'border-zinc-200 bg-white hover:border-zinc-300'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left text-sm font-medium ${
                      editorial ? 'text-zinc-900' : 'text-slate-900'
                    }`}
                  >
                    <span className="pr-2">{item.question}</span>
                    <span
                      className={`shrink-0 transition-transform ${editorial ? 'text-zinc-400' : 'text-slate-400'} ${
                        open ? 'rotate-180' : ''
                      }`}
                    >
                      ▾
                    </span>
                  </button>
                  {open ? (
                    <div
                      className={`px-4 pb-4 text-sm leading-relaxed ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}
                    >
                      {item.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
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

/** Только city FAQ (cityInfo / editorial props). Платформенные FAQ про Дайбилет не подмешиваем. */
function mergeCityFaqItems(
  editorial: CityInfoEntry['faq'] | undefined,
  cityFaq: CityFaqItem[],
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

  for (const item of cityFaq) {
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
    if (filter === 'tomorrow') return isSessionTomorrow(startsAt, timeZone);
    if (filter === 'weekend') return isSessionWeekend(startsAt, timeZone);
    return true;
  });
}

function sessionHaystack(session: PublicSessionDto): string {
  return `${session.category || ''} ${session.title || ''} ${(session as { eventTitle?: string }).eventTitle || ''}`.toLowerCase();
}

function sessionHitScore(session: PublicSessionDto): number {
  const hay = sessionHaystack(session);
  if (/стендап|stand[\s-]?up|standup|comedy|юмор|квиз/.test(hay)) return 3;
  if (/концерт|concert|шоу|фестиваль|live/.test(hay)) return 2;
  return 0;
}

function defaultCityFaq(cityName: string): CityFaqItem[] {
  return [
    {
      question: `Нужно ли покупать билеты заранее в ${cityName}?`,
      answer:
        'На популярные экскурсии и вечерние шоу лучше брать билеты онлайн заранее - особенно в выходные и высокий сезон. Так вы фиксируете цену и не стоите в кассе.',
    },
    {
      question: 'Как удобнее спланировать один день в городе?',
      answer:
        'Начните с блока «Главные места», затем откройте афишу на сегодня или завтра.',
    },
    {
      question: 'Где смотреть логистику и сезон?',
      answer:
        'Короткие ответы - в разделе «Советы»: как добраться и когда ехать. Подробные SEO-материалы остаются внизу страницы, в блоке «Из блога».',
    },
  ];
}

function buildFallbackMustSee(
  city: PublicCityDto,
  categories: Array<[string, number]>,
  venues: PublicVenueDto[],
): CityMustSeeItem[] {
  const categoryPlaces: CityMustSeeItem[] = categories.slice(0, 3).map(([name, count]) => ({
    name,
    desc: `${pluralEvents(count)} в каталоге города ${city.name}: удобно начать выбор с этой категории.`,
  }));
  const venuePlaces: CityMustSeeItem[] = venues.slice(0, 3).map((venue) => ({
    name: venue.name,
    desc: `${pluralEvents(venue.events)} на странице площадки. Проверьте расписание, цену и ближайшие даты.`,
    href: venueHref(venue),
  }));
  return [...categoryPlaces, ...venuePlaces];
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

function cityInAccusative(city: PublicCityDto) {
  const bySlug: Record<string, string> = {
    'sankt-peterburg': 'в Санкт-Петербург',
    'saint-petersburg': 'в Санкт-Петербург',
    moscow: 'в Москву',
    'moskovskaya-oblast': 'в Московскую область',
    'leningradskaya-oblast': 'в Ленинградскую область',
    'krasnodarskiy-kray': 'в Краснодарский край',
    'krasnoyarskiy-kray': 'в Красноярский край',
    'respublika-tatarstan': 'в Республику Татарстан',
    'respublika-hakasiya': 'в Республику Хакасия',
    'respublika-bashkortostan': 'в Республику Башкортостан',
    'respublika-kareliya': 'в Республику Карелия',
    'ulyanovskaya-oblast': 'в Ульяновскую область',
    'habarovskiy-kray': 'в Хабаровский край',
    'primorskiy-kray': 'в Приморский край',
    'altayskiy-kray': 'в Алтайский край',
    'samarskaya-oblast': 'в Самарскую область',
    'chelyabinskaya-oblast': 'в Челябинскую область',
    'nizhny-novgorod': 'в Нижний Новгород',
  };
  if (bySlug[city.slug]) return bySlug[city.slug];
  if (city.sourceSlug && bySlug[city.sourceSlug]) return bySlug[city.sourceSlug];

  const name = city.name.trim();
  if (city.type === 'region') return `в регион ${name}`;
  return inCityAccusative(name);
}

function resolveSectionId(hash: string): string {
  const raw = hash.replace(/^#/, '');
  return CITY_HASH_ALIASES[raw] || raw;
}

function scrollToSection(id: string) {
  const targetId = resolveSectionId(id);
  const run = () => {
    const el = document.getElementById(targetId);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };
  // rAF + retry: секции/картинки ещё двигают layout сразу после клика.
  window.requestAnimationFrame(() => {
    if (run()) return;
    window.setTimeout(run, 120);
  });
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
