'use client';

import * as React from 'react';
import { ArrowLeft, ChevronDown, Clock, Info, Lightbulb, MapPin, Ticket } from 'lucide-react';
import Link from 'next/link';

import { CityHeroStrip } from '@/components/CityHeroStrip.client';
import { CityHubArticlesGrid } from '@/components/CityHubArticleTeaser.client';
import { CityAdmissionBlock } from '@/components/CityAdmissionBlock';
import {
  CityHubSectionHeading,
  HUB_SECTION_GAP,
  HUB_SECTION_PAD,
  HUB_SECTION_PAD_BOTTOM_HALF,
  HUB_SECTION_PAD_TOP_HALF,
  HUB_SECTION_SCROLL_MT,
} from '@/components/CityHubSectionHeading';
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
import { HubCarouselChrome } from '@/components/HubCarouselChrome.client';
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
  isCityHubSectionHidden,
  normalizeCityHubSlug,
  resolveCityHubConfig,
} from '@/lib/city-hub-config';
import { matchSightAfficheLink, resolveFeaturedDirections } from '@/lib/city-hub-directions';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityImage } from '@/lib/city-images';
import { CITY_NIGHT_HERO } from '@/lib/city-night-hero';
import { cityHasLifehacks } from '@/lib/city-hub-lifehacks';
import { listCityRegionalEvents, listCityRegionalPastEvents } from '@/lib/city-regional-events';
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
  mustSeeFilterStopTypeTag,
  type MustSeeFilterId,
} from '@/lib/must-see-filters';
import { dayRouteStopPriceChipLabel } from '@/lib/day-route-stop-types';
import { formatVisitDuration } from '@/lib/visit-duration';
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
  'city-directions': 'affiche',
  'city-sights': 'sights',
  lifehacks: 'lifehacks',
  'city-travel': 'lifehacks',
  'city-guide-faq': 'faq',
  practice: 'faq',
  'city-seo': 'seo',
  'why-go': 'sights',
  'zachem-ehat': 'sights',
  top: 'about',
  'city-hero': 'about',
  directions: 'affiche',
  more: 'faq',
  travel: 'lifehacks',
  faq: 'faq',
  suburbs: 'city-suburbs',
  'must-see': 'city-must-see',
  'glavnye-mesta': 'city-must-see',
  routes: 'city-routes',
  scenarios: 'city-routes',
  'day-constructor': 'city-routes',
  events: 'affiche',
  blog: 'blog',
  zametki: 'blog',
  'region-events': 'region-events',
};

const HUB_DESKTOP_NAV: Array<{ id: string; label: string }> = [
  { id: 'about', label: 'О городе' },
  { id: 'sights', label: 'Зачем ехать' },
  { id: 'city-must-see', label: 'Главные места' },
  { id: 'city-routes', label: 'Маршруты' },
  { id: 'lifehacks', label: 'Лайфхаки' },
  { id: 'city-suburbs', label: 'Пригороды' },
  { id: 'region-events', label: 'События региона' },
  { id: 'affiche', label: 'События' },
  { id: 'faq', label: 'FAQ' },
];

/** Mobile sticky labels/order (owner). No «О городе»; «Места» / «Заметки». */
const HUB_MOBILE_NAV: Array<{ id: string; label: string }> = [
  { id: 'sights', label: 'Зачем ехать' },
  { id: 'city-must-see', label: 'Места' },
  { id: 'city-routes', label: 'Маршруты' },
  { id: 'lifehacks', label: 'Лайфхаки' },
  { id: 'city-suburbs', label: 'Пригороды' },
  { id: 'affiche', label: 'События' },
  { id: 'blog', label: 'Заметки' },
  { id: 'faq', label: 'FAQ' },
];

/** Primary row before «Ещё» overflow on mobile. */
const HUB_MOBILE_PRIMARY_IDS = [
  'sights',
  'city-must-see',
  'city-routes',
  'lifehacks',
  'city-suburbs',
  'affiche',
] as const;

const SECTION_SCROLL_MT = HUB_SECTION_SCROLL_MT;
const HUB_STICKY_TOP = 'top-[calc(var(--site-header-height)+env(safe-area-inset-top,0px))]';
const FAQ_SUPPORT_EMAIL = 'hello@daibilet.ru';

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
  const hasRegionEvents =
    listCityRegionalEvents(hubSlug).length > 0 || listCityRegionalPastEvents(hubSlug).length > 0;
  const hasMore = hasDirections || hasVenues || moreArticles.length > 0;
  const hasCollections = hasDirections;
  const showSightsBlock = hasSights || hasHookFact || hasWeather || hasWhenToGo || hasIdentity;
  const hasWhyGoNav = hasIdentity || hasHookFact || hasWeather || hasWhenToGo;
  const hasMustSeeNav = Boolean(
    !isCityHubSectionHidden(hubConfig, 'sights') &&
      (guide?.mustSee?.length ||
        guide?.sights?.length ||
        (contentReady && (categories.length > 0 || (payload?.venues?.length || 0) > 0))),
  );
  const hasRoutesNav = Boolean(guide?.dayRoutePresets?.length);
  const hasSuburbsNav = Boolean(guide?.significantSuburbs?.length);

  const applyPlaceFocus = React.useCallback((focus: CityPlaceFocus | null) => {
    if (!focus?.slugs.length) {
      setPlaceFocus(null);
      return;
    }
    setPlaceFocus(focus);
    scrollToSection(focus.scrollTo === 'suburbs' ? 'city-suburbs' : 'city-must-see');
  }, []);
  // Story cards UI hidden (owner 2026-08-03); keep build helper for later - do not render.

  const hasFaqBlogSplit = hasFaq || footerArticles.length > 0;

  const tabs = React.useMemo(() => {
    const filled = new Set<string>();
    // Desktop keeps «О городе»; mobile sticky omits it (owner).
    filled.add('about');
    if (hasWhyGoNav) filled.add('sights');
    if (hasMustSeeNav) filled.add('city-must-see');
    if (hasRoutesNav) filled.add('city-routes');
    if (hasLifehacks) filled.add('lifehacks');
    if (hasSuburbsNav) filled.add('city-suburbs');
    if (hasRegionEvents) filled.add('region-events');
    filled.add('affiche');
    if (hasFaqBlogSplit) filled.add('faq');
    if (footerArticles.length > 0) filled.add('blog');
    const desktop = HUB_DESKTOP_NAV.filter((item) => filled.has(item.id));
    const mobile = HUB_MOBILE_NAV.filter((item) => filled.has(item.id));
    // Region events (desktop-only label) can overflow into mobile «Ещё».
    const mobileExtra: Array<{ id: string; label: string }> = [];
    if (hasRegionEvents && !mobile.some((item) => item.id === 'region-events')) {
      mobileExtra.push({ id: 'region-events', label: 'События региона' });
    }
    const desktopExtra: Array<{ id: string; label: string }> = [];
    if (footerArticles.length > 0) desktopExtra.push({ id: 'blog', label: 'Из блога' });
    return { desktop, desktopExtra, mobile, mobileExtra };
  }, [
    footerArticles.length,
    hasFaqBlogSplit,
    hasLifehacks,
    hasMustSeeNav,
    hasRegionEvents,
    hasRoutesNav,
    hasSuburbsNav,
    hasWhyGoNav,
  ]);

  return (
    <div
      className={`overflow-x-clip ${editorial ? 'bg-zinc-50 text-zinc-900' : 'bg-slate-50 text-slate-900'}`}
    >
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
            <CityStickyTabs
              desktopTabs={tabs.desktop}
              desktopExtraTabs={tabs.desktopExtra}
              mobileTabs={tabs.mobile}
              mobileExtraTabs={tabs.mobileExtra}
              editorial={editorial}
            />

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
                    {/* Two outer columns only: fact ~40% | fused weather+when-to-go ~60%. Never a third outer card. */}
                    <div
                      className={
                        hasHookFact && (hasWeather || hasWhenToGo)
                          ? 'flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-stretch'
                          : ''
                      }
                      data-city-hub-fact-weather={
                        hasHookFact && (hasWeather || hasWhenToGo) ? 'fact-fused' : undefined
                      }
                    >
                      {hasHookFact ? (
                        <div
                          className={
                            hasWeather || hasWhenToGo ? 'min-w-0 [&>*]:h-full' : ''
                          }
                        >
                          <CityHookFactCallout
                            hook={hookFactText}
                            tip={guide?.hookFactTip?.trim() || ''}
                            editorial={editorial}
                          />
                        </div>
                      ) : null}
                      {hasWeather || hasWhenToGo ? (
                        <div className={hasHookFact ? 'min-w-0 [&>*]:h-full' : ''}>
                          <CityWeatherWidget
                            citySlug={hubSlug}
                            cityIn={cityInPrepositional(city)}
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
                        onSelect={(focus) => {
                          // Identity highlights places in must-see/suburbs - no filter «сценарий» banner.
                          scrollToSection(
                            focus.scrollTo === 'suburbs' ? 'city-suburbs' : 'city-must-see',
                          );
                        }}
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
                  includeSuburbs
                  beforeSuburbs={
                    hasLifehacks ? (
                      <CityLifehacksSection
                        citySlug={hubSlug}
                        cityName={city.name}
                        editorial={editorial}
                        className={HUB_SECTION_GAP}
                        onPlaceFocus={applyPlaceFocus}
                        onAffiche={() => scrollToSection('affiche')}
                      />
                    ) : null
                  }
                />
              </div>
            ) : null}

            <CityRegionalEvents citySlug={hubSlug} editorial={editorial} />

            <section
              id="affiche"
              className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-200/80'} ${SECTION_SCROLL_MT}`}
            >
              <div
                className={`container-page ${HUB_SECTION_PAD_TOP_HALF} ${
                  hasCollections ? 'pb-2 sm:pb-3' : HUB_SECTION_PAD_BOTTOM_HALF
                }`}
              >
                <CityCatalogHeader editorial={editorial} />
                {contentReady ? (
                  <div
                    className={`sticky z-20 -mx-1 mb-5 bg-slate-50/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/90 top-[calc(var(--site-header-height)+env(safe-area-inset-top,0px)+3.5rem)]`}
                  >
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
              {hasCollections ? (
                contentReady ? (
                  <PopularDirections
                    city={city}
                    featuredDirections={featuredDirections}
                    categories={categories}
                    editorial={editorial}
                    nested
                    compactTop
                    onCategory={(value) => {
                      pickCategory(value);
                      scrollToSection('affiche');
                    }}
                  />
                ) : hasMore ? (
                  <CityContentLoadingState />
                ) : null
              ) : null}
            </section>

            {payload.regionNearby?.events?.length ? (
              <RegionNearbyStrip nearby={payload.regionNearby} editorial={editorial} />
            ) : null}

            {contentReady && (hasVenues || (admission && admission.items.length > 0)) ? (
              <section
                className={`border-b ${editorial ? 'border-zinc-200' : 'border-slate-200/80'}`}
              >
                {admission && admission.items.length > 0 ? (
                  <CityAdmissionBlock
                    admission={admission}
                    cityName={city.name}
                    editorial={editorial}
                    nested
                  />
                ) : null}
                {hasVenues ? (
                  <VenueHighlights
                    city={city}
                    venues={payload.venues}
                    topN={hubConfig?.venuesTopN}
                    editorial={editorial}
                    nested
                  />
                ) : null}
              </section>
            ) : null}

            {hasFaqBlogSplit ? (
              <CityFaqBlogSplit
                city={city}
                faqItems={hasFaq ? unifiedFaq : []}
                articles={footerArticles}
                editorial={editorial}
              />
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
    <CityHeroStrip
      city={city}
      stats={stats}
      guide={guide}
      hasTravel={hasTravel}
      hubConfig={hubConfig}
    />
  );
}

function CityStickyTabs({
  desktopTabs,
  desktopExtraTabs = [],
  mobileTabs,
  mobileExtraTabs = [],
  editorial = false,
}: {
  desktopTabs: Array<{ id: string; label: string }>;
  desktopExtraTabs?: Array<{ id: string; label: string }>;
  mobileTabs: Array<{ id: string; label: string }>;
  mobileExtraTabs?: Array<{ id: string; label: string }>;
  editorial?: boolean;
}) {
  const observedTabs = React.useMemo(() => {
    const seen = new Set<string>();
    return [...desktopTabs, ...desktopExtraTabs, ...mobileTabs, ...mobileExtraTabs].filter((tab) => {
      if (seen.has(tab.id)) return false;
      seen.add(tab.id);
      return true;
    });
  }, [desktopTabs, desktopExtraTabs, mobileTabs, mobileExtraTabs]);
  const mobilePrimary = mobileTabs.filter((tab) =>
    (HUB_MOBILE_PRIMARY_IDS as readonly string[]).includes(tab.id),
  );
  const mobileMore = [
    ...mobileTabs.filter((tab) => !(HUB_MOBILE_PRIMARY_IDS as readonly string[]).includes(tab.id)),
    ...mobileExtraTabs.filter((tab) => !mobileTabs.some((item) => item.id === tab.id)),
  ];
  const [activeId, setActiveId] = React.useState(observedTabs[0]?.id || 'affiche');
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  /** Пока идёт programmatic smooth-scroll - не даём observer перебить activeId. */
  const scrollLockUntilRef = React.useRef(0);

  React.useEffect(() => {
    if (!observedTabs.length) return;
    const elements = observedTabs
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
  }, [observedTabs]);

  React.useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const goTo = (id: string) => {
    const targetId = resolveSectionId(id);
    scrollLockUntilRef.current = Date.now() + 1200;
    setActiveId(targetId);
    setMoreOpen(false);
    scrollToSection(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${targetId}`);
    }
  };

  const tabClass = (active: boolean) =>
    editorial
      ? `shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors md:py-4 ${
          active ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-900'
        }`
      : `shrink-0 whitespace-nowrap border-b-2 px-2.5 py-3 text-sm font-medium transition sm:px-3 md:px-4 ${
          active
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-slate-600 hover:text-primary-700'
        }`;

  const renderTab = (tab: { id: string; label: string }) => {
    const active = activeId === tab.id;
    return (
      <a
        key={tab.id}
        href={`#${tab.id}`}
        onClick={(event) => {
          event.preventDefault();
          goTo(tab.id);
        }}
        className={tabClass(active)}
      >
        {tab.label}
      </a>
    );
  };

  if (!observedTabs.length) return null;

  const moreActive = mobileMore.some((tab) => tab.id === activeId);

  return (
    <nav
      aria-label="Разделы страницы города"
      data-city-hub-nav
      className={
        editorial
          ? `sticky ${HUB_STICKY_TOP} z-30 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-md`
          : `sticky ${HUB_STICKY_TOP} z-30 border-b border-slate-200 bg-white/95 backdrop-blur`
      }
    >
      <div
        className={
          editorial
            ? 'container-page hidden gap-6 overflow-x-auto py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-8 md:flex'
            : 'container-page hidden gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex'
        }
        data-city-hub-nav-desktop
      >
        {desktopTabs.map(renderTab)}
        {desktopExtraTabs.map(renderTab)}
      </div>
      <div
        className={
          editorial
            ? 'container-page flex items-end gap-3 overflow-x-auto py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden'
            : 'container-page flex items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden'
        }
        data-city-hub-nav-mobile
      >
        {mobilePrimary.map(renderTab)}
        {mobileMore.length ? (
          <div className="relative shrink-0" ref={moreRef}>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              data-city-hub-nav-more
              onClick={() => setMoreOpen((open) => !open)}
              className={`${tabClass(moreActive)} inline-flex items-center gap-0.5`}
            >
              Ещё
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${moreOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className={`absolute right-0 z-40 mt-1 min-w-[11rem] rounded-xl border py-1 shadow-lg ${
                  editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white'
                }`}
              >
                {mobileMore.map((tab) => (
                  <a
                    key={tab.id}
                    role="menuitem"
                    href={`#${tab.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      goTo(tab.id);
                    }}
                    className={`block px-3 py-2 text-sm ${
                      activeId === tab.id
                        ? editorial
                          ? 'font-semibold text-zinc-950'
                          : 'font-semibold text-primary-700'
                        : editorial
                          ? 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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
          : 'bg-amber-50/80 shadow-[0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-amber-100'
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${editorial ? 'bg-zinc-900' : 'bg-amber-400'}`}
        aria-hidden
      />
      <h2
        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${
          editorial ? 'text-zinc-500' : 'text-amber-800'
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
      <section className={CITY_NIGHT_HERO.section} aria-busy="true" aria-label="Загрузка">
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{ backgroundColor: CITY_NIGHT_HERO.navyDeep }}
          aria-hidden
        >
          <div className={`${CITY_NIGHT_HERO.photoFrame} bg-white/[0.04]`} />
          <div
            className={CITY_NIGHT_HERO.leftFillDesktop}
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftDesktop }}
          />
          <div
            className="absolute inset-0 md:hidden"
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftMobile }}
          />
        </div>
        <div className={CITY_NIGHT_HERO.content}>
          <div className={CITY_NIGHT_HERO.contentInner}>
            <div className="mb-4 h-4 w-48 rounded bg-white/20" />
            <div className={`h-10 max-w-md rounded sm:h-12 ${editorial ? 'bg-white/20' : 'bg-white/22'}`} />
            <div className="mt-3 h-4 max-w-xl rounded bg-white/16" />
            <div className="mt-5 flex gap-2">
              <div className="h-8 w-24 rounded-full bg-white/18" />
              <div className="h-8 w-28 rounded-full bg-white/14" />
              <div className="h-8 w-32 rounded-full bg-white/12" />
            </div>
            <div className="mt-6 flex gap-3">
              <div className="h-11 w-40 rounded-2xl bg-white/90" />
              <div className="h-11 w-36 rounded-2xl bg-white/20" />
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
  compactTop = false,
}: {
  city: PublicCityDto;
  featuredDirections: ReturnType<typeof resolveFeaturedDirections>;
  categories: Array<[string, number]>;
  onCategory: (category: string) => void;
  editorial?: boolean;
  nested?: boolean;
  /** ~50% less space above the block (hub rhythm tighten). */
  compactTop?: boolean;
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

  /** Nested under #affiche: strip under event rail, not a second major section. */
  const padY = nested || compactTop
    ? 'pt-3 sm:pt-4 pb-8 sm:pb-10'
    : 'py-10';

  const heading = nested ? (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p
        className={`text-sm font-semibold tracking-wide ${
          editorial ? 'text-zinc-700' : 'text-slate-700'
        }`}
      >
        Подборки
      </p>
      <Link
        href={citySlug ? `/podborki?city=${encodeURIComponent(citySlug)}` : '/podborki'}
        className={`text-sm font-semibold ${
          editorial ? 'text-zinc-700 hover:text-zinc-950' : 'text-primary-700 hover:text-primary-800'
        }`}
      >
        Все подборки →
      </Link>
    </div>
  ) : (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2
          className={
            editorial
              ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
              : 'text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl'
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
  );

  return (
    <div
      id="directions"
      className={`${padY} ${nested ? '' : SECTION_SCROLL_MT} ${
        nested
          ? ''
          : `border-b ${editorial ? 'border-zinc-200 bg-zinc-50/50' : 'border-slate-100 bg-slate-50/80'}`
      }`}
    >
      <div className="container-page">
        {heading}

        {landingItems.length ? (
          <div className={`${nested ? 'mt-3' : 'mt-6'} grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
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
          <div className={`${nested ? 'mt-3' : 'mt-5'} flex flex-wrap gap-2`}>
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
    </div>
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
  beforeSuburbs = null,
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
  /** Between routes and suburbs (scenarios → lifehacks → suburbs). */
  beforeSuburbs?: React.ReactNode;
}) {
  const fromSights: CityMustSeeItem[] =
    guide?.sights?.map((item) => ({
      name: item.title,
      desc: item.text,
      href: item.href,
      venueSlug: item.venueSlug,
      locationSlug: item.locationSlug,
      visitMinutes: item.visitMinutes,
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
    !(guide?.dayRoutePresets?.length) &&
    !beforeSuburbs
  ) {
    return null;
  }
  void sessions;
  const cityIn = cityInPrepositional(city);
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
  // H2 «Что посмотреть в …»; sticky-лейбл must-see - «Главные места» (#city-must-see).
  // hookFact renders above this section (between tabs and H2).
  const sectionTitle =
    places.length || !hasNamedScenarios
      ? `Что посмотреть ${cityIn}`
      : 'Готовые сценарии дня';

  return (
    <section
      className={`container-page ${compactTop ? 'pt-16 pb-16 sm:pt-20 sm:pb-20' : HUB_SECTION_PAD}`}
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
          id="city-must-see"
          className={`${SECTION_SCROLL_MT} ${
            editorial
              ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
              : 'text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl'
          }`}
        >
          {sectionTitle}
        </h2>
      )}
      {beforeSuburbs}
      {suburbs.length ? (
        <SuburbsCarousel
          places={suburbs}
          venues={venues}
          city={city}
          cityGenitive={cityGenitive}
          editorial={editorial}
          replaceDayOnApply
          navigateToMyDayOnApply
          className={HUB_SECTION_GAP}
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
  // <4 places: md+ horizontal grid (2→2 cols, 3→3). ≥4: single-row snap carousel.
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

  const showRailArrows = showPlacesRail && !sparseGrid;
  const routeCount = useDayRouteState().venues.length;

  return (
    <>
      <div id="city-must-see" className={SECTION_SCROLL_MT}>
        <CityHubSectionHeading title={heading} editorial={editorial} />
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
            className={`hidden shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium tabular-nums sm:inline-flex ${
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
      {/* Mobile: 1-card ~80/20 peek swipe. md+: sparse (<4) = capped card grid; ≥4 = single-row snap carousel. */}
      <HubCarouselChrome
        key={focusedMustSee.length ? `focus:${[...focusedSlugSet].join(',')}` : activeId}
        className="mt-6"
        scrollerRef={railRef}
        showArrows={showRailArrows}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => scrollPage(-1)}
        onNext={() => scrollPage(1)}
        prevLabel="Предыдущие места"
        nextLabel="Следующие места"
        prevDataAttr="data-city-must-see-prev"
        nextDataAttr="data-city-must-see-next"
        aria-label="Главные места"
        tabIndex={0}
        trackClassName={
          sparseGrid
            ? 'horizontal-snap-row flex flex-nowrap gap-2.5 snap-x snap-mandatory py-1 md:block md:overflow-visible md:py-1'
            : 'horizontal-snap-row flex flex-nowrap gap-2.5 snap-x snap-mandatory py-1 md:gap-6 md:[scrollbar-width:none] md:[-ms-overflow-style:none] md:[&::-webkit-scrollbar]:hidden'
        }
        trackProps={{
          'data-city-must-see-rail': '',
          'data-city-must-see-layout': sparseGrid ? 'sparse-grid' : 'carousel',
        }}
      >
        {/* Mobile: contents hoists cards into the flex scrollport so % = viewport. */}
        {/* md sparse: N-col capped grid (w-max, left). md carousel: same flex snap, one row. */}
        <ol
          className={
            sparseGrid
              ? `contents md:grid md:w-max md:max-w-full md:items-start md:justify-items-start md:gap-x-6 md:gap-y-5 ${sparseColsClass}`
              : 'contents'
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
          const categoryLabel = mustSeeFilterStopTypeTag(categoryId);
          const visitLabel = formatVisitDuration(place.visitMinutes);
          const priceLabel = dayRouteItem
            ? dayRouteStopPriceChipLabel(dayRouteItem, categoryLabel)
            : '';
          // Nested sub-spots (places[]) stay in suburb cards / articles / location PDP - not on hub must-see.
          return (
            <li
              key={`${place.name}:${index}`}
              className={
                sparseGrid
                  ? 'flex min-w-0 shrink-0 snap-start items-stretch pr-1 [flex:0_0_80%] md:w-auto md:min-w-0 md:max-w-none md:pr-0 md:[flex:none]'
                  : 'flex min-w-0 shrink-0 snap-start items-stretch pr-1 [flex:0_0_80%] md:pr-0 md:[flex:0_0_min(22rem,calc(50vw-3rem))]'
              }
              data-city-must-see-card
            >
              <article
                className={`flex h-full min-w-0 flex-1 flex-col rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)] ${
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
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {categoryLabel}
                      </span>
                      {visitLabel ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-100 text-slate-600'
                          }`}
                          data-city-visit-duration
                        >
                          <Clock className="h-3 w-3 shrink-0" aria-hidden />
                          {visitLabel}
                        </span>
                      ) : null}
                      {priceLabel ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            editorial ? 'bg-zinc-100 text-zinc-600' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {priceLabel}
                        </span>
                      ) : null}
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
      </HubCarouselChrome>
        </>
      ) : null}
      <div
        id={hasNamedScenarios ? 'city-routes' : undefined}
        className={`${showPlacesRail ? HUB_SECTION_GAP : 'mt-6'}${
          hasNamedScenarios ? ` ${SECTION_SCROLL_MT}` : ''
        }`}
      >
        {hasNamedScenarios && showPlacesRail ? (
          <CityHubSectionHeading
            className="mb-4"
            as="h3"
            title="Готовые сценарии"
            description="Соберите день из главных мест и пригородов"
            editorial={editorial}
          />
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
                ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
                : 'text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl'
            }
          >
            Площадки и локации
          </h3>
          <p className={`mt-2 max-w-3xl text-base leading-7 ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
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
      <CityHubSectionHeading
        title="Ближайшие события"
        description="Концерты, спектакли и экскурсии на ближайшие дни"
        editorial={editorial}
      />
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
                ? 'font-display text-3xl font-extrabold tracking-tight text-zinc-950'
                : 'font-display text-2xl font-extrabold tracking-tight text-slate-900'
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

function CityFaqBlogSplit({
  city,
  faqItems,
  articles,
  editorial = false,
}: {
  city: PublicCityDto;
  faqItems: CityFaqItem[];
  articles: BlogCardDto[];
  editorial?: boolean;
}) {
  const citySlug = city.slug || city.sourceSlug || '';
  const blogHref = citySlug ? `/blog?city=${encodeURIComponent(citySlug)}` : '/blog';
  const hasFaqCol = faqItems.length > 0;
  const hasBlogCol = articles.length > 0;
  if (!hasFaqCol && !hasBlogCol) return null;

  return (
    <section
      id="faq"
      className={`border-t py-10 sm:py-12 lg:py-14 ${SECTION_SCROLL_MT} ${
        editorial ? 'border-zinc-200 bg-white/70' : 'border-slate-100 bg-white/80'
      }`}
    >
      <div className="container-page">
        <div
          className={
            hasFaqCol && hasBlogCol
              ? 'grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 lg:items-start'
              : 'grid grid-cols-1'
          }
        >
          {hasFaqCol ? (
            <div className="min-w-0">
              <CityFaqSection
                cityName={city.name}
                items={faqItems}
                editorial={editorial}
                nested
              />
            </div>
          ) : null}
          {hasBlogCol ? (
            <div id="blog" className={`min-w-0 ${SECTION_SCROLL_MT}`}>
              <CityHubSectionHeading
                as="h3"
                title={`Из блога ${aboutCityPrepositional(city)}`}
                description="Маршруты, окрестности и советы местных"
                editorial={editorial}
                actions={
                  <Link
                    href={blogHref}
                    className={`shrink-0 text-sm font-semibold ${
                      editorial
                        ? 'text-zinc-700 hover:text-zinc-950'
                        : 'text-primary-700 hover:text-primary-800'
                    }`}
                  >
                    Все материалы →
                  </Link>
                }
              />
              <CityHubArticlesGrid articles={articles} editorial={editorial} layout="stack" />
            </div>
          ) : null}
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
  const [askOpen, setAskOpen] = React.useState(false);
  const [askQuestion, setAskQuestion] = React.useState('');
  const [askEmail, setAskEmail] = React.useState('');
  const [askStatus, setAskStatus] = React.useState<'idle' | 'sent' | 'error'>('idle');
  const cityGenitive = cityToGenitive(cityName);

  const submitAsk = (event: React.FormEvent) => {
    event.preventDefault();
    const question = askQuestion.trim();
    if (question.length < 8) {
      setAskStatus('error');
      return;
    }
    const subject = `Вопрос о городе: ${cityName}`;
    const body = [
      `Город: ${cityName}`,
      askEmail.trim() ? `Email: ${askEmail.trim()}` : null,
      '',
      'Вопрос:',
      question,
    ]
      .filter(Boolean)
      .join('\n');
    window.location.href = `mailto:${FAQ_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setAskStatus('sent');
  };

  const body = (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <CityHubSectionHeading
          as="h3"
          title="Частые вопросы"
          description={`Ответы о городе и афише ${cityGenitive}`}
          editorial={editorial}
        />
        <button
          type="button"
          onClick={() => {
            setAskOpen((open) => !open);
            setAskStatus('idle');
          }}
          className={
            editorial
              ? 'shrink-0 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50'
              : 'shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50'
          }
        >
          {askOpen ? 'Скрыть форму' : 'Задать вопрос'}
        </button>
      </div>

      {askOpen ? (
        <div
          className={`mb-6 rounded-2xl border p-4 sm:p-5 ${
            editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-white'
          }`}
        >
          {askStatus === 'sent' ? (
            <p className={`text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              Откройте почтовый клиент и отправьте письмо. Если вопрос покажется интересным - опубликуем
              ответ в FAQ.
            </p>
          ) : (
            <form onSubmit={submitAsk} className="space-y-3">
              <p className={`text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                Напишите вопрос о городе или афише. Если он покажется интересным - опубликуем его здесь.
              </p>
              <label className="block">
                <span className="sr-only">Ваш вопрос</span>
                <textarea
                  value={askQuestion}
                  onChange={(event) => {
                    setAskQuestion(event.target.value);
                    if (askStatus === 'error') setAskStatus('idle');
                  }}
                  rows={3}
                  required
                  placeholder="Например: куда сходить с детьми в выходные?"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${
                    editorial
                      ? 'border-zinc-200 focus:ring-zinc-300'
                      : 'border-slate-200 focus:ring-primary-200'
                  }`}
                />
              </label>
              <label className="block">
                <span className={`mb-1 block text-xs ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
                  Email - по желанию, если хотите ответ лично
                </span>
                <input
                  type="email"
                  value={askEmail}
                  onChange={(event) => setAskEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${
                    editorial
                      ? 'border-zinc-200 focus:ring-zinc-300'
                      : 'border-slate-200 focus:ring-primary-200'
                  }`}
                />
              </label>
              {askStatus === 'error' ? (
                <p className="text-sm text-red-600">Напишите вопрос чуть подробнее - хотя бы пару слов.</p>
              ) : null}
              <button
                type="submit"
                className={
                  editorial
                    ? 'rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800'
                    : 'rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700'
                }
              >
                Отправить вопрос
              </button>
            </form>
          )}
        </div>
      ) : null}

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
    </>
  );

  if (nested) {
    return <div className="max-w-none">{body}</div>;
  }

  return (
    <section
      id="faq"
      className={`py-8 sm:py-10 ${SECTION_SCROLL_MT} border-t ${
        editorial ? 'border-zinc-200' : 'border-slate-100'
      }`}
    >
      <div className="container-page">
        <div className="max-w-3xl">{body}</div>
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
        'Короткие ответы - в разделе «Лайфхаки» (если есть у города) и в блоке FAQ и блога внизу страницы.',
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

function hubStickyOffsetPx(target: HTMLElement): number {
  if (typeof window === 'undefined') return 120;
  const styles = getComputedStyle(document.documentElement);
  const headerRaw = styles.getPropertyValue('--site-header-height').trim();
  const rootFont = parseFloat(styles.fontSize || '16') || 16;
  const headerPx = headerRaw.endsWith('rem')
    ? parseFloat(headerRaw) * rootFont
    : parseFloat(headerRaw) || 64;
  const spacer = document.querySelector('.site-header-spacer') as HTMLElement | null;
  const headerBand = spacer?.getBoundingClientRect().height || headerPx;
  const hero = document.querySelector('[data-city-hero]');
  // Hero «О городе» sits above hub sticky - clear only fixed site header.
  if (hero && (hero === target || hero.contains(target))) {
    return headerBand + 8;
  }
  const hubNav = document.querySelector('[data-city-hub-nav]') as HTMLElement | null;
  const hubNavH = hubNav?.getBoundingClientRect().height || 56;
  return headerBand + hubNavH + 8;
}

function scrollToSection(id: string) {
  const targetId = resolveSectionId(id);
  const run = () => {
    const el = document.getElementById(targetId);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY - hubStickyOffsetPx(el);
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
