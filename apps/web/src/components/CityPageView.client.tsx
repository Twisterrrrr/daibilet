'use client';

import * as React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Lightbulb, MapPin, Ticket } from 'lucide-react';
import Link from 'next/link';

import { CityHubArticlesGrid } from '@/components/CityHubArticleTeaser.client';
import { CityAdmissionBlock } from '@/components/CityAdmissionBlock';
import { EventCard } from '@/components/EventCard';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { RegionNearbyStrip } from '@/components/RegionNearbyStrip.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { AddToDayRouteButton } from '@/components/AddToDayRouteButton.client';
import { useDayRouteState } from '@/hooks/useDayRouteState';
import { CityDayPresetBlock } from '@/components/CityDayPresetBlock.client';
import { CityIdentityCarousel } from '@/components/CityIdentityCarousel.client';
import { CityLifehacksSection } from '@/components/CityLifehacksSection.client';
import { CityRegionalEvents } from '@/components/CityRegionalEvents.client';
import { CityWeatherWidget } from '@/components/CityWeatherWidget.client';
import { MustSeeFilterTabs } from '@/components/MustSeeFilterTabs.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { SuburbsCarousel } from '@/components/SuburbsCarousel.client';
import { formatStreetAddress } from '@/lib/address';
import { formatNumber, formatPriceFrom, pluralEvents, pluralVenues } from '@/lib/format';
import type { CityFaqItem } from '@/lib/city-faq';
import type { CityHubArticlesBuckets } from '@/lib/city-hub-articles';
import type { CityHubTemplate } from '@/lib/city-hub-template';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import { venuePageTemplate } from '@/lib/venue-meta';
import { eventHref, venueHref } from '@/lib/routes';
import { inCityAccusative, inCityPrepositional, cityToGenitive } from '@/lib/city-declension';
import { buildCatalogHref } from '@/lib/catalog-url';
import { buildCityHubSeoPhrase } from '@/lib/city-hub-seo';
import {
  isCityHubAfficheBeforeSuburbs,
  isCityHubBlogAfterSuburbs,
  isCityHubSectionHidden,
  normalizeCityHubSlug,
  resolveCityHubConfig,
} from '@/lib/city-hub-config';
import { matchSightAfficheLink, resolveFeaturedDirections } from '@/lib/city-hub-directions';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityImage } from '@/lib/city-images';
import { CITY_NIGHT_HERO } from '@/lib/city-night-hero';
import { cityHasLifehacks, resolveCityLifehacks } from '@/lib/city-hub-lifehacks';
import {
  groupStandupInHubFeed,
  isCityHubTouristAffiche,
  preferredAfficheCategory,
  rankCityHubSessions,
  visibleAfficheCategories,
} from '@/lib/city-hub-affiche';
import { formatCoverDateBadge } from '@/lib/event-card-meta';
import {
  cityHasWeatherWidget,
  cityHasWhenToGo,
  cityIdentitySlides,
  collectPlacesBySlugs,
  placeSlugKey,
  resolveWhenToGoBlurb,
  suburbMatchesSlugs,
  type CityPlaceFocus,
} from '@/lib/city-hub-local-flavor';
import {
  resolveCityInfo,
  type CityInfoEntry,
  type CityMustSeeItem,
} from '@/lib/cityInfo';
import { resolveCityPlaceTitleHref } from '@/lib/city-place-href';
import {
  dayRouteHookLine,
  dayRouteItemFromMustSee,
} from '@/lib/day-route-from-place';
import {
  buildMustSeeFilterTabs,
  classifyMustSeePlace,
  mustSeeFilterLabel,
  type MustSeeFilterId,
} from '@/lib/must-see-filters';
import { isOpenDate, MIN_DISPLAY_PRICE_RUB } from '@/lib/event-card-meta';
import type {
  PublicCityDto,
  PublicCityPageDto,
  PublicLandingDto,
  PublicSessionDto,
  PublicVenueDto,
} from '@daibilet/contracts/public';

const CITY_HASH_ALIASES: Record<string, string> = {
  'city-schedule': 'affiche',
  'city-directions': 'more',
  'city-sights': 'sights',
  'city-travel': 'practice',
  'city-guide-faq': 'practice',
  lifehacks: 'practice',
  'city-seo': 'seo',
  'why-go': 'sights',
  'zachem-ehat': 'sights',
  about: 'sights',
  directions: 'more',
  venues: 'more',
  travel: 'practice',
  faq: 'practice',
  suburbs: 'city-suburbs',
  'must-see': 'city-must-see',
  'region-events': 'region-events',
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
  const [placeFocus, setPlaceFocus] = React.useState<CityPlaceFocus | null>(null);
  const userPickedCategory = React.useRef(false);

  React.useEffect(() => {
    setPlaceFocus(null);
  }, [slug]);

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
      return true;
    });
    const ranked = rankCityHubSessions(filtered);
    return dedupeHubSessions(ranked);
  }, [category, payload]);

  const city = payload?.city;
  const touristAffiche = isCityHubTouristAffiche(normalizeCityHubSlug(city?.slug || city?.sourceSlug || slug));
  const afficheBeforeSuburbs = isCityHubAfficheBeforeSuburbs(city?.slug || city?.sourceSlug || slug);
  // Chip facets = hub feed only (same universe as the list / «Все»), not full-city catalog.
  const categories = React.useMemo(() => {
    if (!payload?.sessions?.length) return [] as Array<[string, number]>;
    return visibleAfficheCategories(payload.sessions, { tourist: touristAffiche });
  }, [payload, touristAffiche]);

  React.useEffect(() => {
    userPickedCategory.current = false;
  }, [slug]);

  React.useEffect(() => {
    if (userPickedCategory.current) return;
    setCategory(preferredAfficheCategory(categories, { tourist: touristAffiche }));
  }, [categories, touristAffiche, slug]);
  const afficheRows = React.useMemo(
    () =>
      touristAffiche
        ? groupStandupInHubFeed(sessions)
        : sessions.map((session) => ({ kind: 'event' as const, session })),
    [sessions, touristAffiche],
  );

  const pickCategory = React.useCallback((value: string) => {
    userPickedCategory.current = true;
    setCategory(value);
  }, []);
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
        guide?.significantSuburbs?.length ||
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
  // Brief lives in hero; hookFact is its own block between tabs and «Зачем ехать».
  const hasHookFact = Boolean(guide?.hookFact?.trim());
  const hookFactText = guide?.hookFact?.trim() || '';
  const hubSlug = city?.slug || city?.sourceSlug || slug;
  const hasWeather = cityHasWeatherWidget(hubSlug);
  const whenToGo = resolveWhenToGoBlurb(hubSlug);
  const hasWhenToGo = cityHasWhenToGo(hubSlug) && Boolean(whenToGo);
  const hasIdentity = cityIdentitySlides(hubSlug).length > 0;
  const hasLifehacks = cityHasLifehacks(hubSlug);
  const lifehacks = resolveCityLifehacks(hubSlug);
  const showTravel = hasTravel && !lifehacks?.skipTravel;
  const hasPractice = hasTravel || hasFaq || practiceArticles.length > 0 || hasLifehacks;
  const hasMore = hasDirections || hasVenues || moreArticles.length > 0;
  const showSightsBlock = hasSights || hasHookFact || hasWeather || hasWhenToGo || hasIdentity;

  const applyPlaceFocus = React.useCallback((focus: CityPlaceFocus | null) => {
    if (!focus?.slugs.length) {
      setPlaceFocus(null);
      return;
    }
    setPlaceFocus(focus);
    scrollToSection(focus.scrollTo === 'suburbs' ? 'city-suburbs' : 'city-must-see');
  }, []);
  // Story cards UI hidden (owner 2026-08-03); keep build helper for later - do not render.
  const blogAfterSuburbs = isCityHubBlogAfterSuburbs(city?.slug || city?.sourceSlug || slug);

  const tabs = React.useMemo(
    () => {
      const blogTab = { id: 'blog', label: 'Из блога', show: footerArticles.length > 0 };
      return [
        { id: 'sights', label: 'Зачем ехать', show: showSightsBlock },
        ...(blogAfterSuburbs ? [blogTab] : []),
        { id: 'affiche', label: 'Афиша', show: true },
        { id: 'practice', label: hasLifehacks ? 'Лайфхаки' : 'Советы', show: hasPractice },
        { id: 'more', label: 'Подборки', show: hasMore },
        ...(!blogAfterSuburbs ? [blogTab] : []),
      ].filter((tab) => tab.show);
    },
    [blogAfterSuburbs, footerArticles.length, hasLifehacks, hasMore, hasPractice, showSightsBlock],
  );

  const renderHubBlogSection = () => {
    if (!footerArticles.length || !city) return null;
    const citySlug = city.slug || city.sourceSlug || '';
    const blogHref = citySlug ? `/blog?city=${encodeURIComponent(citySlug)}` : '/blog';
    return (
      <section
        id="blog"
        className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-200/80'} ${SECTION_SCROLL_MT}`}
      >
        <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-8'}`}>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2
                className={
                  editorial
                    ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
                    : 'text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]'
                }
              >
                Из блога {aboutCityPrepositional(city)}
              </h2>
              <p className={`mt-1.5 text-sm leading-6 ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
                Маршруты, окрестности и советы местных
              </p>
            </div>
            <Link
              href={blogHref}
              className={`shrink-0 text-sm font-semibold ${
                editorial ? 'text-zinc-700 hover:text-zinc-950' : 'text-primary-700 hover:text-primary-800'
              }`}
            >
              Все материалы →
            </Link>
          </div>
          <CityHubArticlesGrid articles={footerArticles} editorial={editorial} />
        </div>
      </section>
    );
  };

  return (
    <div className={editorial ? 'bg-zinc-50 text-zinc-900' : 'bg-slate-50 text-slate-900'}>
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

            {showSightsBlock ? (
              <div
                id={hasIdentity ? undefined : 'sights'}
                className={`border-b ${hasIdentity ? '' : SECTION_SCROLL_MT} ${
                  editorial ? 'border-zinc-200' : 'border-slate-200/80'
                }`}
              >
                {hasHookFact || hasWeather || hasWhenToGo || hasIdentity ? (
                  <div
                    className={`container-page pt-8 sm:pt-10 ${
                      hasSights ? 'pb-2 sm:pb-3' : 'pb-8 sm:pb-10'
                    }`}
                  >
                    <div
                      className={
                        hasHookFact && (hasWeather || hasWhenToGo)
                          ? 'flex flex-col gap-4 md:flex-row md:items-stretch'
                          : ''
                      }
                    >
                      {hasWeather || hasWhenToGo ? (
                        <div className={hasHookFact ? 'md:w-[42%] md:shrink-0 [&>*]:h-full' : ''}>
                          <CityWeatherWidget
                            citySlug={hubSlug}
                            cityIn={cityInPrepositional(city)}
                            editorial={editorial}
                          />
                        </div>
                      ) : null}
                      {hasHookFact ? (
                        <div
                          className={
                            hasWeather || hasWhenToGo ? 'md:min-w-0 md:flex-1 [&>*]:h-full' : ''
                          }
                        >
                          <CityHookFactCallout
                            hook={hookFactText}
                            tip={guide?.hookFactTip?.trim() || ''}
                            editorial={editorial}
                          />
                        </div>
                      ) : null}
                    </div>
                    {hasIdentity ? (
                      <CityIdentityCarousel
                        citySlug={hubSlug}
                        editorial={editorial}
                        sectionId="sights"
                        onSelect={applyPlaceFocus}
                      />
                    ) : null}
                  </div>
                ) : null}
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
                  compactTop={hasHookFact || hasWeather || hasWhenToGo}
                  placeFocus={placeFocus}
                  onPlaceFocus={applyPlaceFocus}
                  includeSuburbs={!afficheBeforeSuburbs}
                />
              </div>
            ) : null}

            {afficheBeforeSuburbs ? null : <CityRegionalEvents citySlug={hubSlug} editorial={editorial} />}

            {blogAfterSuburbs && !afficheBeforeSuburbs ? renderHubBlogSection() : null}

            <section
              id="affiche"
              className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-200/80'} ${SECTION_SCROLL_MT}`}
            >
              <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-8'}`}>
                <CityCatalogHeader editorial={editorial} />
                {contentReady ? (
                  <div className="sticky top-[calc(var(--site-header-height)+3.25rem)] z-20 -mx-1 mb-5 bg-slate-50/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/90">
                    <div className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <CategoryFilter
                      categories={categories}
                      active={category}
                      filteredCount={sessions.length}
                      editorial={editorial}
                      onCategory={pickCategory}
                      onReset={() => pickCategory('all')}
                    />
                    </div>
                  </div>
                ) : null}
                {contentReady ? (
                  <CityEventsGrid rows={afficheRows} editorial={editorial} />
                ) : (
                  <CityScheduleLoadingState />
                )}
              </div>
            </section>

            {afficheBeforeSuburbs && guide?.significantSuburbs?.length ? (
              <div
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-100'}`}
              >
                <div className={`container-page ${editorial ? 'py-12 sm:py-14' : 'py-10'}`}>
                  <SuburbsCarousel
                    places={guide.significantSuburbs}
                    venues={payload.venues}
                    city={city}
                    cityGenitive={cityToGenitive(city.name)}
                    editorial={editorial}
                    replaceDayOnApply
                    navigateToMyDayOnApply
                    sectionId="city-suburbs"
                    focusSlugs={
                      placeFocus &&
                      guide.significantSuburbs.some((suburb) =>
                        suburbMatchesSlugs(suburb, placeFocus.slugs),
                      )
                        ? placeFocus.slugs
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : null}

            {afficheBeforeSuburbs ? <CityRegionalEvents citySlug={hubSlug} editorial={editorial} /> : null}

            {blogAfterSuburbs && afficheBeforeSuburbs ? renderHubBlogSection() : null}

            {payload.regionNearby?.events?.length ? (
              <RegionNearbyStrip nearby={payload.regionNearby} editorial={editorial} />
            ) : null}

            {hasPractice ? (
              <section
                id="practice"
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-200/80'} ${SECTION_SCROLL_MT}`}
              >
                <div className={`container-page ${editorial ? 'pt-12 pb-4' : 'pt-8 pb-2'}`}>
                  <h2
                    className={
                      editorial
                        ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
                        : 'text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]'
                    }
                  >
                    {hasLifehacks && city?.name
                      ? `Лайфхаки ${cityToGenitive(city.name)}: как сберечь бюджет`
                      : 'Советы'}
                  </h2>
                  {hasLifehacks ? null : (
                    <p className={`mt-2 max-w-3xl text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                      Как добраться, когда ехать и ответы на частые вопросы.
                    </p>
                  )}
                  {hasLifehacks ? (
                    <CityLifehacksSection
                      citySlug={hubSlug}
                      editorial={editorial}
                      onPlaceFocus={(focus) => applyPlaceFocus(focus)}
                      onAffiche={() => scrollToSection('affiche')}
                    />
                  ) : null}
                </div>
                {showTravel ? (
                  <CityTravelSection travel={guide?.travel} editorial={editorial} nested />
                ) : null}
                <CitySeasonalTip tip={guide?.seasonalTip} editorial={editorial} />
                {hasFaq ? (
                  <CityFaqSection cityName={city.name} items={unifiedFaq} editorial={editorial} nested />
                ) : null}
              </section>
            ) : null}

            {hasMore ? (
              <section
                id="more"
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-200/80'} ${SECTION_SCROLL_MT}`}
              >
                {contentReady ? (
                  <>
                    <PopularDirections
                      city={city}
                      featuredDirections={featuredDirections}
                      categories={categories}
                      editorial={editorial}
                      nested
                      onCategory={(value) => {
                        pickCategory(value);
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

            {blogAfterSuburbs ? null : renderHubBlogSection()}

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
  const citySlug = city.slug || city.sourceSlug || undefined;
  // Short lead always in hero; hookFact sits above «Зачем ехать».
  const brief =
    guide?.brief?.trim() ||
    `Экскурсии, музеи, мероприятия и активный отдых ${cityIn}. Выбирайте формат и дату - и покупайте билет онлайн на Дайбилете.`;
  const afficheHref = citySlug
    ? buildCatalogHref({ city: citySlug, sort: 'popular' })
    : '#affiche';
  const collectionsHref = citySlug
    ? `/podborki?city=${encodeURIComponent(citySlug)}`
    : '/podborki';
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

  const briefClass = nightShell
    ? 'mt-3 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg'
    : editorial
      ? 'mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg'
      : 'mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg';

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

  // No «Афиша» chip: the primary CTA above already goes to the catalog.
  const jumpChips = [
    { id: 'sights', label: 'Зачем ехать' },
    { id: 'more', label: 'Подборки' },
    { id: 'blog', label: 'Блог' },
  ] as const;

  // hasTravel kept for caller parity; hero CTAs are Афиша + Подборки событий.
  void hasTravel;

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
          <div className={nightShell ? 'w-full max-w-3xl md:max-w-[72%]' : 'max-w-3xl'}>
            <h1 className={titleClass}>{city.name}</h1>
            {brief ? <p className={briefClass}>{brief}</p> : null}
            <div className="mt-4 md:mt-5">
              {seasonChip ? (
                <p className={`mb-3 text-sm ${nightShell ? 'text-white/70' : editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                  <span className={seasonChipClass}>
                    {seasonChip.label}
                    {seasonChip.monthsHint ? ` (${seasonChip.monthsHint})` : ''}
                  </span>
                </p>
              ) : null}
              <p className={statsClass}>
                <span className={statsStrongClass}>{pluralEvents(stats.events)}</span>
                <span aria-hidden="true" className={statsDotClass}>
                  ·
                </span>
                <span className={statsStrongClass}>{pluralVenues(stats.venues)}</span>
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={afficheHref} className={primaryCtaClass}>
                  <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Афиша</span>
                </Link>
                <Link href={collectionsHref} className={secondaryCtaClass}>
                  Подборки событий
                </Link>
              </div>

              {/* Mobile quick-jump under CTAs; desktop keeps sticky tabs. */}
              <div
                className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
                data-city-hero-jump
              >
                {jumpChips.map((chip) => (
                  <a
                    key={chip.id}
                    href={`#${chip.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(chip.id);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', `#${chip.id}`);
                      }
                    }}
                    className={
                      nightShell
                        ? 'shrink-0 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/35 backdrop-blur-sm'
                        : editorial
                          ? 'shrink-0 rounded-full bg-zinc-200/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-800'
                          : 'shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700'
                    }
                  >
                    {chip.label}
                  </a>
                ))}
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
    'inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition';
  if (editorial) {
    return `${base} ${
      isActive
        ? 'bg-zinc-900 text-white'
        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
    }`;
  }
  return `${base} ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
  }`;
}

/** hookFact above «Зачем ехать»; brief stays in hero. */
function CityHookFactCallout({
  hook,
  tip = '',
  editorial = false,
}: {
  hook: string;
  tip?: string;
  editorial?: boolean;
}) {
  return (
    <aside
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl p-5 pl-6 sm:p-6 sm:pl-7 ${
        editorial
          ? 'bg-white ring-1 ring-zinc-200'
          : 'bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80'
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${editorial ? 'bg-zinc-900' : 'bg-slate-900'}`}
        aria-hidden
      />
      <h2
        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${
          editorial ? 'text-zinc-500' : 'text-slate-500'
        }`}
      >
        <Lightbulb
          className={`h-4 w-4 ${editorial ? 'text-zinc-800' : 'text-primary-600'}`}
          strokeWidth={1.75}
          aria-hidden
        />
        Интересный факт
      </h2>
      <p
        className={`mt-4 text-base leading-relaxed sm:text-lg ${
          editorial ? 'text-zinc-800' : 'text-slate-800'
        }`}
      >
        {hook}
      </p>
      {tip ? (
        <p className={`mt-5 text-sm ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>{tip}</p>
      ) : null}
    </aside>
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
  // Same CITY_NIGHT_HERO shell as CityHeroStrip / SiteChromeSkeleton city (equal py + justify-center).
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
            <div className="mt-5 h-14 max-w-2xl rounded-2xl bg-white/90" />
            <div className="mt-3 flex gap-2 md:hidden">
              <div className="h-7 w-16 rounded-full bg-white/20" />
              <div className="h-7 w-20 rounded-full bg-white/16" />
              <div className="h-7 w-20 rounded-full bg-white/14" />
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
            <h2
              className={
                editorial
                  ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
                  : 'font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'
              }
            >
              Каталог подборок
            </h2>
            <p className={`mt-2 text-sm leading-6 sm:text-base ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              Форматы, которые чаще всего ищут {cityIn} - с ценами и датами в одном списке.
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {landingItems.map((landing) => (
              <LandingDirectionCard
                key={landing.slug}
                landing={landing}
                citySlug={citySlug}
                variant="tile"
                showFilterCityBadge={false}
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
  compactTop = false,
  placeFocus = null,
  onPlaceFocus,
  includeSuburbs = true,
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
  /** True when hookFact already sits above this section. */
  compactTop?: boolean;
  placeFocus?: CityPlaceFocus | null;
  onPlaceFocus?: (focus: CityPlaceFocus | null) => void;
  includeSuburbs?: boolean;
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
  if (
    !places.length &&
    !articles.length &&
    !(guide?.significantSuburbs?.length) &&
    !(guide?.dayRoutePresets?.length)
  ) {
    return null;
  }
  void sessions;
  const cityInto = cityInAccusative(city);
  const cityGenitive = cityToGenitive(city.name);
  const citySlug = city.slug || city.sourceSlug || undefined;
  const landingRows = landings.map((landing) => ({
    slug: landing.slug,
    title: landing.title,
    subtitle: landing.subtitle,
    events: landing.events,
    priceFrom: landing.priceFrom,
  }));
  const titleClass = `font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`;
  const allSuburbs = guide?.significantSuburbs?.length ? guide.significantSuburbs : [];
  const suburbs = includeSuburbs ? allSuburbs : [];
  const namedPresets = guide?.dayRoutePresets;
  const hasNamedScenarios = Boolean(namedPresets?.length);
  const activeFocus = placeFocus?.slugs.length ? placeFocus : null;
  const focusedPlaces = activeFocus ? collectPlacesBySlugs(activeFocus.slugs, places, allSuburbs) : [];
  // Editorial «Зачем ехать» (places) always owns the section H2; scenarios follow below.
  // hookFact renders above this section (between tabs and H2).
  const sectionTitle =
    places.length || !hasNamedScenarios
      ? `Зачем ехать ${cityInto}`
      : 'Готовые сценарии дня';

  return (
    <section
      className={`container-page ${compactTop ? 'pt-6 pb-10' : 'py-10'}`}
    >
      {places.length || hasNamedScenarios ? (
        <CitySightsMustSeeList
          heading={sectionTitle}
          places={places}
          venues={venues}
          city={city}
          editorial={editorial}
          namedPresets={namedPresets}
          landingRows={landingRows}
          categories={categories}
          citySlug={citySlug}
          titleClass={titleClass}
          focusSlugs={activeFocus?.slugs || []}
          onClearFocus={() => onPlaceFocus?.(null)}
          focusBanner={
            activeFocus ? (
        <div
          className={`mt-4 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 ${
            editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
          }`}
          data-city-place-focus={activeFocus.id}
        >
          <p className={`min-w-0 flex-1 text-sm ${editorial ? 'text-zinc-700' : 'text-slate-700'}`}>
            {activeFocus.label}
            {focusedPlaces.length ? ` · ${focusedPlaces.length} точек` : ''}
          </p>
          <button
            type="button"
            data-city-place-focus-clear
            className={`text-xs font-semibold ${editorial ? 'text-zinc-500 hover:text-zinc-800' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => onPlaceFocus?.(null)}
          >
            Сбросить
          </button>
        </div>
            ) : null
          }
        />
      ) : (
        <h2
          className={
            editorial
              ? 'font-serif text-3xl font-semibold text-zinc-950 sm:text-4xl'
              : 'text-2xl font-bold text-slate-950'
          }
        >
          {sectionTitle}
        </h2>
      )}
      {suburbs.length ? (
        <SuburbsCarousel
          places={suburbs}
          venues={venues}
          city={city}
          cityGenitive={cityGenitive}
          editorial={editorial}
          replaceDayOnApply
          navigateToMyDayOnApply
          className="mt-10"
          sectionId="city-suburbs"
          focusSlugs={
            activeFocus && suburbs.some((suburb) => suburbMatchesSlugs(suburb, activeFocus.slugs))
              ? activeFocus.slugs
              : undefined
          }
        />
      ) : null}
      {articles.length ? (
        <div className={places.length || suburbs.length ? 'mt-8' : 'mt-4'}>
          <h3 className={`text-lg font-semibold ${editorial ? 'text-zinc-900' : 'text-slate-900'}`}>
            Материалы по темам
          </h3>
          <p className={`mt-1 text-sm ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Подборки и гиды, которые помогают выбрать формат прогулки или события.
          </p>
          <CityHubArticlesGrid articles={articles} editorial={editorial} />
        </div>
      ) : null}
    </section>
  );
}

function CitySightsMustSeeList({
  heading,
  places,
  venues,
  city,
  editorial,
  namedPresets,
  landingRows,
  categories,
  citySlug,
  titleClass,
  focusSlugs = [],
  onClearFocus,
  focusBanner = null,
}: {
  heading: string;
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
  focusSlugs?: string[];
  onClearFocus?: () => void;
  focusBanner?: React.ReactNode;
}) {
  const hasNamedScenarios = Boolean(namedPresets?.length);
  const showPlacesRail = places.length > 0;
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
  const focusedSlugSet = React.useMemo(
    () => new Set(focusSlugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean)),
    [focusSlugs],
  );
  const focusedMustSee = React.useMemo(
    () =>
      focusedSlugSet.size
        ? classifiedPlaces.filter((place) => focusedSlugSet.has(placeSlugKey(place)))
        : [],
    [classifiedPlaces, focusedSlugSet],
  );
  const filteredPlaces = React.useMemo(
    () => classifiedPlaces.filter((place) => classifyMustSeePlace(place) === activeId),
    [classifiedPlaces, activeId],
  );
  // With category tabs show the full filtered set; single-tab cities keep top-6.
  const visiblePlaces =
    focusedMustSee.length > 0
      ? focusedMustSee
      : filterMeta.tabs.length >= 2
        ? filteredPlaces
        : filteredPlaces.slice(0, 6);
  // <4 places: md+ horizontal grid (2→2 cols, 3→3), same card track as ≥4 carousel.
  // Cap column width so 1–3 cards stay standard size and left-aligned (no full-bleed stretch).
  const sparseGrid = visiblePlaces.length > 0 && visiblePlaces.length < 4;
  const sparseColsClass =
    visiblePlaces.length <= 1
      ? 'md:grid-cols-[minmax(0,min(22rem,calc(50vw-3rem)))]'
      : visiblePlaces.length === 2
        ? 'md:grid-cols-[repeat(2,minmax(0,min(22rem,calc(50vw-3rem))))]'
        : 'md:grid-cols-[repeat(3,minmax(0,min(22rem,calc(50vw-3rem))))]';

  const railRef = React.useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  const syncRail = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setCanPrev(overflow && scrollLeft > 4);
    setCanNext(overflow && scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    if (!showPlacesRail) return;
    const el = railRef.current;
    if (!el) return;
    syncRail();
    el.addEventListener('scroll', syncRail, { passive: true });
    window.addEventListener('resize', syncRail, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncRail) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', syncRail);
      window.removeEventListener('resize', syncRail);
      ro?.disconnect();
    };
  }, [syncRail, activeId, visiblePlaces.length, sparseGrid, showPlacesRail]);

  const scrollPage = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: dir * el.clientWidth,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const arrowClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40';
  const showRailArrows = showPlacesRail && !sparseGrid;
  const routeCount = useDayRouteState().venues.length;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2
          className={
            editorial
              ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
              : 'text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]'
          }
        >
          {heading}
        </h2>
        {showRailArrows ? (
          <div className="flex shrink-0 gap-2 pt-0.5">
            <button
              type="button"
              data-city-must-see-prev
              aria-label="Предыдущие места"
              disabled={!canPrev}
              onClick={() => scrollPage(-1)}
              className={arrowClass}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              data-city-must-see-next
              aria-label="Следующие места"
              disabled={!canNext}
              onClick={() => scrollPage(1)}
              className={arrowClass}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      {showPlacesRail ? (
        <div className="mt-2.5 flex items-start justify-between gap-3">
          <p
            className={`flex min-w-0 items-start gap-2 text-sm leading-6 ${
              editorial ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            <Info className={`mt-0.5 h-4 w-4 shrink-0 ${editorial ? 'text-zinc-400' : 'text-primary-600'}`} aria-hidden />
            <span>
              Нажмите «В маршрут» - место появится в панели внизу экрана и сохранится до следующего визита
            </span>
          </p>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium tabular-nums ${
              editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            В маршруте: {routeCount}
          </span>
        </div>
      ) : null}
      {focusBanner}
      {showPlacesRail ? (
        <>
      <MustSeeFilterTabs
        tabs={filterMeta.tabs}
        activeId={activeId}
        onChange={(id) => {
          onClearFocus?.();
          setFilterId(id);
        }}
        editorial={editorial}
      />
      {/* Mobile: 1-card ~80/20 peek swipe. md+: sparse (<4) = capped card grid; ≥4 = 2-row carousel. */}
      <div id="city-must-see" className={`relative mt-6 ${SECTION_SCROLL_MT}`}>
        <div
          key={focusedMustSee.length ? `focus:${[...focusedSlugSet].join(',')}` : activeId}
          ref={railRef}
          className={
            sparseGrid
              ? 'horizontal-snap-row flex flex-nowrap gap-2.5 snap-x snap-mandatory md:block md:overflow-visible'
              : 'horizontal-snap-row flex flex-nowrap gap-2.5 snap-x snap-mandatory md:block md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden'
          }
          data-city-must-see-rail
          data-city-must-see-layout={sparseGrid ? 'sparse-grid' : 'carousel'}
          aria-label="Главные места"
          tabIndex={0}
        >
        {/* Mobile: contents hoists cards into the flex scrollport so % = viewport. */}
        {/* md sparse: N-col capped grid (w-max, left). md carousel: auto rows + flow-col. */}
        <ol
          className={
            sparseGrid
              ? `contents md:grid md:w-max md:max-w-full md:items-start md:justify-items-start md:gap-x-6 md:gap-y-5 ${sparseColsClass}`
              : 'contents md:grid md:w-max md:auto-cols-[min(22rem,calc(50vw-3rem))] md:grid-flow-col md:grid-rows-[auto_auto] md:items-start md:gap-x-6 md:gap-y-5'
          }
        >
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
          const blurb =
            dayRouteHookLine({
              hookFact: matchedVenue?.hookFact,
              shortDescription: matchedVenue?.shortDescription,
              desc: place.desc,
              preferEditorial: true,
            }) || '';
          const categoryId = classifyMustSeePlace(place);
          const categoryLabel = mustSeeFilterLabel(categoryId);
          // Nested sub-spots (places[]) stay in suburb cards / articles / location PDP - not on hub must-see.
          return (
            <li
              key={`${place.name}:${index}`}
              className="flex min-w-0 shrink-0 snap-start items-stretch pr-1 [flex:0_0_80%] md:w-auto md:min-w-0 md:max-w-none md:pr-0 md:[flex:none]"
              data-city-must-see-card
            >
              <article
                className={`flex h-full min-w-0 flex-1 flex-col rounded-2xl p-4 sm:p-5 ${
                  editorial
                    ? 'border border-zinc-200 bg-white shadow-sm'
                    : 'border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {placeHref ? (
                      <Link
                        href={placeHref}
                        className={`${titleClass} text-base font-bold leading-snug break-words hover:text-primary-700`}
                        data-city-must-see-title
                      >
                        {place.name}
                      </Link>
                    ) : (
                      <div className={`${titleClass} text-base font-bold leading-snug break-words`}>
                        {place.name}
                      </div>
                    )}
                    {blurb ? (
                      <p
                        className={`mt-1.5 text-sm leading-6 break-words ${
                          editorial ? 'text-zinc-600' : 'text-slate-600'
                        }`}
                      >
                        {blurb}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {categoryLabel}
                      </span>
                      {place.seasonLabel ? (
                        <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                          {place.seasonLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
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
                  ) : (
                    <span />
                  )}
                  {dayRouteItem ? (
                    <AddToDayRouteButton
                      compact
                      className="!min-h-9 !rounded-full !px-3 !py-1.5 !text-[12px]"
                      venue={dayRouteItem}
                    />
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
        </ol>
        </div>
      </div>
        </>
      ) : null}
      <div className={showPlacesRail ? 'mt-10' : 'mt-6'}>
        {hasNamedScenarios && showPlacesRail ? (
          <h3
            className={
              editorial
                ? 'mb-4 font-serif text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl'
                : 'mb-4 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl'
            }
          >
            Готовые сценарии
          </h3>
        ) : null}
        <CityDayPresetBlock
          places={places}
          venues={venues}
          city={city}
          editorial={editorial}
          namedPresets={namedPresets}
        />
      </div>
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

function CitySeasonalTip({
  tip,
  editorial = false,
}: {
  tip?: CityInfoEntry['seasonalTip'];
  editorial?: boolean;
}) {
  if (!tip) return null;
  const tipHref = String(tip.href || '');
  const myDayHref = tipHref.includes('/moscow/') || tipHref.includes('den-goroda')
    ? '/my-day?city=moscow'
    : tipHref.includes('saint-petersburg') || tipHref.includes('night-bridges')
      ? '/my-day?city=saint-petersburg'
      : null;
  return (
    <div className={`container-page py-2 sm:py-4 ${editorial ? 'bg-zinc-50' : 'bg-slate-50'}`}>
      <aside
        aria-label={tip.title}
        className={`max-w-3xl rounded-xl border p-4 sm:p-5 ${
          editorial ? 'border-zinc-200 bg-white' : 'border-sky-100 bg-white'
        }`}
      >
        <h3 className={`text-base font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>{tip.title}</h3>
        <p className={`mt-1.5 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>{tip.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <Link
            href={tip.href}
            className={editorial ? 'text-zinc-900 underline-offset-4 hover:underline' : 'text-primary-700 hover:text-primary-800'}
          >
            {tip.linkLabel} →
          </Link>
          {myDayHref ? (
            <Link
              href={myDayHref}
              className={editorial ? 'text-zinc-900 underline-offset-4 hover:underline' : 'text-primary-700 hover:text-primary-800'}
            >
              Собрать вечер в Мой день →
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
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

function CityCatalogHeader({ editorial = false }: { editorial?: boolean }) {
  return (
    <div className="mb-4">
      <h2
        className={
          editorial
            ? 'font-serif text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl'
            : 'font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]'
        }
      >
        Ближайшие события
      </h2>
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
    <div className="flex w-max flex-nowrap items-center gap-2" role="tablist" aria-label="Категории событий">
      <button
        type="button"
        role="tab"
        aria-selected={activeAll}
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
            role="tab"
            aria-selected={isActive}
            onClick={() => props.onCategory(name)}
            className={hubFilterChipClass(isActive, editorial)}
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
  rows,
  editorial = false,
}: {
  rows: ReturnType<typeof groupStandupInHubFeed<PublicSessionDto>>;
  editorial?: boolean;
}) {
  const items = rows.slice(0, 48);
  if (!items.length) {
    return <EmptyState />;
  }

  return (
    <div data-city-events-rail>
      <ScrollRail
        className="mt-1"
        hideScrollbar
        viewportClassName="flex flex-nowrap gap-2.5 snap-x snap-mandatory pb-0.5"
        aria-label="Ближайшие события"
      >
        {items.map((row) =>
          row.kind === 'standup' ? (
            <div
              key={`standup:${row.venueName}`}
              className="w-[min(88%,18.5rem)] shrink-0 snap-start sm:w-[20rem]"
              data-rail-item
              data-city-standup-series
            >
              <HubStandupSeriesCard sessions={row.sessions} venueName={row.venueName} editorial={editorial} />
            </div>
          ) : (
            <div
              key={row.session.id}
              className="w-[min(62%,11.5rem)] shrink-0 snap-start sm:w-[12rem] md:w-[12.5rem] lg:w-[13rem]"
              data-rail-item
              data-city-events-card
            >
              {editorial ? (
                <AffichePosterCard session={row.session} />
              ) : (
                <EventCard session={row.session} showcaseRail cityHub />
              )}
            </div>
          ),
        )}
      </ScrollRail>
    </div>
  );
}

function HubStandupSeriesCard({
  sessions,
  venueName,
  editorial = false,
}: {
  sessions: PublicSessionDto[];
  venueName: string;
  editorial?: boolean;
}) {
  const dates = sessions.slice(0, 8);
  const venueLink = sessions[0]?.venueSlug
    ? venueHref({ slug: sessions[0].venueSlug, name: venueName })
    : null;
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border p-4 ${
        editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
          editorial ? 'text-zinc-500' : 'text-slate-500'
        }`}
      >
        Стендап на неделю
      </p>
      <h3 className={`mt-1 text-base font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
        {venueLink ? (
          <Link href={venueLink} className="hover:underline">
            {venueName}
          </Link>
        ) : (
          venueName
        )}
      </h3>
      <p className={`mt-1 text-xs ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
        {sessions.length} ближайших дат
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {dates.map((session) => (
          <Link
            key={session.id || session.slug}
            href={eventHref(session)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              editorial ? 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            {formatCoverDateBadge(session) || session.dateLabel || 'Скоро'}
          </Link>
        ))}
      </div>
    </article>
  );
}

function AffichePosterCard({ session }: { session: PublicSessionDto }) {
  const href = eventHref(session);
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const dateBadge = [session.dateLabel, session.timeLabel].filter(Boolean).join(' · ') || session.category;

  return (
    <article className="group relative flex h-full flex-col">
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
      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-1 line-clamp-2 text-lg font-medium leading-tight text-balance text-zinc-900">
          {session.title}
        </h3>
        {session.venue ? <p className="mb-3 line-clamp-1 text-sm text-zinc-500">{session.venue}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
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

function dedupeHubSessions(sessions: PublicSessionDto[]): PublicSessionDto[] {
  const seen = new Set<string>();
  const out: PublicSessionDto[] = [];
  for (const session of sessions) {
    const groupKey = String((session as { groupKey?: string }).groupKey || '')
      .trim()
      .toLowerCase();
    const slug = String(session.slug || '')
      .trim()
      .toLowerCase();
    const key = groupKey ? `group:${groupKey}` : slug ? `slug:${slug}` : `id:${session.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(session);
  }
  return out;
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

function aboutCityPrepositional(city: PublicCityDto) {
  const inPhrase = cityInPrepositional(city);
  const prep = inPhrase.replace(/^во?\s+/i, '');
  const particle = /^[аеёиоуыэюя]/i.test(prep) ? 'об' : 'о';
  return `${particle} ${prep}`;
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
    'respublika-hakasiya': 'в Республике Хакасии',
    'respublika-bashkortostan': 'в Республике Башкортостан',
    'respublika-kareliya': 'в Республике Карелии',
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
    'respublika-kareliya': 'в Республику Карелию',
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
