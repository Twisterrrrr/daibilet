'use client';

import * as React from 'react';
import { Anchor, ArrowRight, Briefcase, Bus, Cake, CalendarDays, CheckCircle2, ChevronDown, Clock, Eye, Headphones, Heart, HelpCircle, Lightbulb, Mail, MapPin, Mic, Moon, Music, Search, Shield, Ship, Sparkles, Star, Sun, Tag, Ticket, TrendingUp, Users, UtensilsCrossed, Wallet } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { BridgesLandingGuide, BridgesShipChecklist } from '@/components/landing/BridgesLandingGuide.client';
import {
  BridgesComparisonTable,
  BridgesHeroBlock,
  BridgesMobileStickyCta,
  BridgesScheduleStrip,
  BridgesTonightTips,
} from '@/components/landing/BridgesLandingSelling.client';
import {
  LandingHeroCtaBlock,
  resolveLandingHeroPrimaryLabel,
  resolveLandingHeroSoldEstimate,
  resolveLandingHeroTheme,
} from '@/components/landing/LandingHeroCtaBlock.client';
import { BridgesScheduleSection } from '@/components/landing/BridgesScheduleSection.client';
import { RiverScheduleSection, type RiverEventGroup } from '@/components/landing/RiverScheduleSection.client';
import { BusScheduleSection, type BusEventGroup } from '@/components/landing/BusScheduleSection.client';
import { DinnerScheduleSection, type DinnerEventGroup } from '@/components/landing/DinnerScheduleSection.client';
import { LandingCityLocations } from '@/components/landing/LandingCityLocations.client';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { LandingStickyHeader } from '@/components/landing/LandingStickyHeader.client';
import { LandingCardBadgeRow } from '@/components/landing/LandingCardBadgeRow';
import { LandingFilterRow } from '@/components/landing/LandingFilterRow.client';
import { LandingContextWidget } from '@/components/landing/LandingContextWidget.client';
import { LandingEmptyState } from '@/components/landing/LandingEmptyState.client';
import {
  resolveSeasonalCountdownKind,
  SeasonalHeroCountdown,
} from '@/components/landing/SeasonalHeroCountdown.client';
import { resolveLandingContentPack } from '@/data/landing-content-packs';
import { resolveLandingFaqItems } from '@/lib/landing-faq-items';
import { resolveLandingContextWidget } from '@/data/landing-context-widgets';
import {
  collectLandingBadgeFacets,
  deriveLandingCardBadges,
  sessionMatchesLandingBadge,
  type LandingCardBadgeId,
} from '@/lib/landing-card-badges';
import {
  CANONICAL_LANDING_SLUGS,
  canonicalLandingSlug,
  isBridgesNightLandingSlug,
  isRiverCruisesLandingSlug,
  isRiverPartyLandingSlug,
  landingFetchCandidates,
  landingSlugVariants,
} from '@/lib/landing-constants';
import {
  busLandingHref,
  isLandingCityAllowed,
  landingCategoryHref,
  landingPageHref,
  MULTI_CITY_LANDING_SLUGS,
  normalizeCitySlug,
  normalizeKnownCitySlug,
  partyLandingHref,
  PRIORITY_LISTING_CITY_SLUGS,
  resolveConcertGenreTag,
  riverLandingHref,
} from '@/lib/landing-routes';
import { LANDING_CITY_SLUGS } from '@/lib/landing-city';
import {
  filterUpcomingBridgeGroups,
  mapBridgesGroups,
  pickComparisonRows,
} from '@/lib/bridges-session-utils';
import { resolveLandingCopy, shouldUseLandingCopy } from '@/lib/landing-copy';
import { applyLandingSeoMeta, resolveLandingSeo } from '@/lib/landing-seo';
import { isLandingOffSeason } from '@/lib/landing-season';
import {
  isDateInsideLandingWindow,
  isSessionInsideLandingWindow,
  listLandingWindowDays,
  resolveLandingEventWindow,
  type LandingEventWindow,
} from '@/lib/landing-event-windows';
import { useLandingTodayReference } from '@/lib/use-landing-today-reference';
import { buildCategoryCityListingMeta } from '@/lib/seo-listing-meta';
import { LandingSeoBottom, landingBlocksHaveSeoText } from '@/components/LandingSeoBottom.client';
import { LandingSeeAlso } from '@/components/LandingSeeAlso';
import { LandingThinRelatedCards } from '@/components/LandingThinRelatedCards';
import { resolveRelatedListingLinks } from '@/lib/seo-internal-links';
import { buildBridgesProductJsonLd } from '@/lib/bridges-seo';
import { formatLandingTodayIso, formatLandingTodayLong } from '@/lib/datetime';
import { extractMenuLabel, extractFormatLabel, dinnerScheduleGridClass, collectDinnerMenuFacets, matchesMenuFilter } from '@/lib/dinner-helpers';
import { BRIDGES_LANDING } from '@/data/bridges-landing';
import {
  getSeasonalLanding,
  seasonalCityGuide,
  seasonalCityGuideBySlug,
  seasonalLandingRoot,
} from '@/data/seasonal-landings';
import {
  RIVER_CITY_ORDER,
  riverCityGuide,
  riverCityGuideBySlug,
  type RiverCitySpot,
} from '@/data/river-landings';
import { busCityGuide } from '@/data/bus-landings';
import { dinnerCityGuide, type DinnerPier, type DinnerMealFormat } from '@/data/dinner-landings';
import { formatMoney, formatMoneyRange, formatLandingBuyPrice, formatNumber } from '@/lib/format';
import {
  collectSessionStartsAtTimes,
  getSessionHour,
  isSameSessionDay,
  isSessionTomorrow,
  isSessionWeekend,
  resolveSessionDate,
  resolveSessionTime,
  resolveSessionTimeZoneForSession,
  parseSessionStartsAt,
  sessionMatchesTimeSlot,
} from '@/lib/datetime';
import { isOpenDate, FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession, resolveSessionPriceRange } from '@/lib/event-card-meta';
import { isBookingPlatformLabel, resolveEventCardLocationLabel } from '@/lib/event-location';
import { formatShipSecondaryLabel, resolveCruiseDisplayTitle } from '@/lib/cruise-display-title';
import { formatVacantSeats } from '@/lib/event-page-utils';
import { cityHref, eventHref, sessionVenueHref } from '@/lib/routes';
import { cityToDative } from '@/lib/city-declension';
import type { PublicLandingDto, PublicLandingPageDto, PublicSessionDto } from '@daibilet/contracts/public';

type LandingContentBlock = NonNullable<PublicLandingPageDto['blocks']>[number];

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening' | 'window' | `day:${string}`;
type SortFilter = 'price' | 'rating' | 'time';
type ViewMode = 'list' | 'table' | 'cards';
type LandingProfile = 'bus' | 'dinner' | 'river' | 'seasonal' | 'bridges' | 'default';
type MenuFilter = 'all' | 'set' | 'buffet';
type DinnerTimeFilter = 'all' | 'sunset' | 'night';
type DinnerBadgeFilter = LandingCardBadgeId | 'all';
type TimeSlotFilter = '' | 'morning' | 'day' | 'evening' | 'night';
const MIN_DISPLAY_PRICE_RUB = 100;

const BUS_CITY_META: Record<string, { slug: string; duration: string; prepositional: string }> = {
  Москва: { slug: 'moscow', duration: '1.5–3 часа', prepositional: 'Москве' },
  'Санкт-Петербург': { slug: 'saint-petersburg', duration: '2–4 часа', prepositional: 'Санкт-Петербургу' },
  Казань: { slug: 'kazan', duration: '2–3 часа', prepositional: 'Казани' },
  'Нижний Новгород': { slug: 'nizhny-novgorod', duration: '2–3 часа', prepositional: 'Нижнему Новгороду' },
  Самара: { slug: 'samara', duration: '2–2.5 часа', prepositional: 'Самаре' },
  Волгоград: { slug: 'volgograd', duration: '3–4 часа', prepositional: 'Волгограду' },
  Ярославль: { slug: 'yaroslavl', duration: '2–2.5 часа', prepositional: 'Ярославлю' },
  Сочи: { slug: 'sochi', duration: '3–5 часов', prepositional: 'Сочи' },
  Калининград: { slug: 'kaliningrad', duration: '2–3 часа', prepositional: 'Калининграду' },
  Екатеринбург: { slug: 'ekaterinburg', duration: '2–3 часа', prepositional: 'Екатеринбургу' },
  'Ростов-на-Дону': { slug: 'rostov-on-don', duration: '2–3 часа', prepositional: 'Ростову-на-Дону' },
};
function riverCruiseCityHref(citySlug: string) {
  return riverLandingHref(citySlug);
}

function busLandingRoot(_slug?: string) {
  return busLandingHref();
}

function riverLandingRoot(landingSlug: string) {
  if (isRiverPartyLandingSlug(landingSlug)) return partyLandingHref();
  if (isBridgesNightLandingSlug(landingSlug)) return landingCategoryHref(CANONICAL_LANDING_SLUGS.bridges);
  return riverLandingHref();
}

function matchesDinnerTimeFilter(session: PublicSessionDto, filter: DinnerTimeFilter): boolean {
  if (filter === 'all') return true;
  if (!session.startsAt) return true;
  const hour = getSessionHour(session.startsAt, resolveSessionTimeZoneForSession(session));
  if (filter === 'sunset') return hour >= 18 && hour < 21;
  if (filter === 'night') return hour >= 21;
  return true;
}

function resolveLandingCityPrep(cityName: string | null, profile: LandingProfile, landingSlug: string): string | null {
  if (!cityName) return profile === 'bus' || profile === 'river' || profile === 'dinner' ? 'России' : null;
  if (profile === 'bus') return BUS_CITY_META[cityName]?.prepositional || cityName;
  // Dative for «по …»; river/dinner share pier cities; never fall back to nominative.
  if (profile === 'river' || profile === 'dinner') {
    return riverCityGuide(cityName)?.cityNameDative || cityToDative(cityName);
  }
  if (profile === 'seasonal') {
    return seasonalCityGuide(landingSlug, cityName)?.cityNameDative || cityToDative(cityName);
  }
  return cityToDative(cityName);
}

function buildLandingSeoInput(
  landing: PublicLandingDto,
  slug: string,
  profile: LandingProfile,
  citySlug: string | undefined,
  stats: PublicLandingPageDto['stats'] | undefined,
  referenceDate: Date,
): Parameters<typeof resolveLandingSeo>[0] {
  const cityName = resolveLandingCityName(citySlug, slug);
  return {
    slug,
    profile,
    landingTitle: landing.title,
    cityName,
    cityPrep: resolveLandingCityPrep(cityName, profile, slug),
    stats,
    landingEvents: landing.events,
    referenceDate,
  };
}

function citySlugFromCityName(cityName: string | null): string | undefined {
  if (!cityName) return undefined;
  const entry = Object.entries(LANDING_CITY_SLUGS).find(([, name]) => name === cityName);
  return entry?.[0];
}

function landingSlugAliases(slug: string): string[] {
  return landingSlugVariants(canonicalLandingSlug(slug));
}

function inferCityFromSessionText(session: PublicSessionDto): string | null {
  const haystack = [session.title, session.venue, ...(session.tags || [])].join(' ').toLowerCase();
  const candidates = Array.from(
    new Set([...Object.values(LANDING_CITY_SLUGS), ...Object.keys(BUS_CITY_META)]),
  ).sort((a, b) => b.length - a.length);

  const cityStem = (city: string) => {
    const compact = city.toLowerCase().replace(/[^а-яё]/g, '');
    if (compact.length <= 5) return compact;
    return compact.slice(0, Math.max(5, compact.length - 2));
  };

  for (const city of candidates) {
    if (haystack.includes(city.toLowerCase())) return city;
    const stem = cityStem(city);
    if (stem.length >= 4 && haystack.includes(stem)) return city;
  }

  const match = haystack.match(/(?:^|\s)г\.?\s*([а-яё][а-яё\s-]{2,40})/i);
  if (!match) return null;

  const fragment = match[1].trim().replace(/["«»]/g, '');
  for (const city of candidates) {
    const normalized = city.toLowerCase();
    if (normalized.startsWith(fragment) || fragment.startsWith(normalized.slice(0, 6))) return city;
  }

  return null;
}

function resolveSessionCityName(session: PublicSessionDto): string {
  if (session.city && session.city !== 'Не указан') return session.city;
  if (session.destination && session.destination !== 'Не указан') return session.destination;
  return inferCityFromSessionText(session) || session.city || 'Не указан';
}

function sessionMatchesCity(session: PublicSessionDto, cityName: string): boolean {
  return resolveSessionCityName(session) === cityName;
}

function filterSessionsByCity(
  sessions: PublicSessionDto[],
  cityName: string | null,
  citySlug?: string | null,
): PublicSessionDto[] {
  const slug = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (slug) {
    return sessions.filter((session) => {
      const sessionSlug = String(session.citySlug || '')
        .trim()
        .toLowerCase();
      if (sessionSlug && sessionSlug === slug) return true;
      if (cityName && sessionMatchesCity(session, cityName)) return true;
      return false;
    });
  }
  if (!cityName) return sessions;
  return sessions.filter((session) => sessionMatchesCity(session, cityName));
}

function collectLandingSessions(_slug: string, _cityName: string | null): PublicSessionDto[] {
  return [];
}

function createSyntheticLanding(slug: string, cityName: string | null): PublicLandingDto | null {
  if (isBridgesNightLandingSlug(slug)) {
    return {
      slug,
      title: BRIDGES_LANDING.heroTitle,
      subtitle: 'Разводные мосты — ночные прогулки по Неве и каналам',
      heroTitle: BRIDGES_LANDING.heroTitle,
      heroSubtitle: BRIDGES_LANDING.heroSubtitle,
      city: 'Санкт-Петербург',
      seoTitle: `${BRIDGES_LANDING.heroTitle} | Дайбилет`,
      seoDescription: BRIDGES_LANDING.heroSubtitle,
      events: 0,
    } as unknown as PublicLandingDto;
  }

  if (isRiverPartyLandingSlug(slug)) {
    return {
      slug,
      title: 'Вечеринки и дискотеки на теплоходе',
      subtitle: 'DJ, живая музыка и ночные речные круизы',
      heroTitle: cityName
        ? `Вечеринки на теплоходе — ${cityName}`
        : 'Вечеринки и дискотеки на теплоходе',
      heroSubtitle: resolveLandingCopy(slug)?.lead || 'DJ-сеты, живая музыка и ночные круизы по рекам и каналам',
      seoTitle: cityName
        ? `Вечеринки на теплоходе — ${cityName} | Дайбилет`
        : 'Вечеринки на теплоходе | Дайбилет',
      seoDescription: 'Дискотеки, DJ и ночные речные круизы: сравните расписание и цены.',
      events: 0,
    } as unknown as PublicLandingDto;
  }

  const profile = getLandingProfile(slug);
  if (profile === 'default') return null;

  if (profile === 'dinner') {
    const guide = dinnerCityGuide(cityName, citySlugFromCityName(cityName));
    const title = cityName ? `Ужин на теплоходе — ${cityName}` : 'Ужин на теплоходе';
    return {
      slug,
      title,
      subtitle: guide?.heroSubtitle || 'Вечерние круизы с ужином на борту',
      heroTitle: guide?.heroTitle,
      heroSubtitle: guide?.heroSubtitle,
      seoTitle: guide?.heroTitle ? `${guide.heroTitle} | Дайбилет` : `${title} | Дайбилет`,
      seoDescription:
        'Ужин на теплоходе: сравните рестораны на воде, меню, цены и расписание вечерних круизов.',
      events: 0,
    } as unknown as PublicLandingDto;
  }

  if (profile === 'bus') {
    const prep = cityName ? BUS_CITY_META[cityName]?.prepositional || cityName : 'России';
    return {
      slug,
      title: cityName ? `Автобусные экскурсии — ${cityName}` : 'Автобусные экскурсии',
      subtitle: cityName
        ? `Обзорные автобусные экскурсии в ${cityName}`
        : 'Обзорные автобусные экскурсии по городам России',
      heroTitle: cityName
        ? `Обзорные автобусные экскурсии по ${prep} сегодня — цены, расписание и маршруты`
        : 'Обзорные автобусные экскурсии по России — цены, расписание и маршруты',
      heroSubtitle: cityName
        ? busCityGuide(cityName)?.heroSubtitle
        : 'От Калининграда до Сочи — сравните автобусные экскурсии в 11 городах России.',
      seoTitle: cityName ? `Автобусные экскурсии ${cityName} | Дайбилет` : 'Автобусные экскурсии | Дайбилет',
      seoDescription: 'Автобусные экскурсии: расписание, цены и маршруты.',
      events: 0,
    } as unknown as PublicLandingDto;
  }

  if (profile === 'river') {
    const riverGuide = cityName ? riverCityGuide(cityName) : null;
    const prep =
      riverGuide?.cityNameDative ||
      (cityName ? BUS_CITY_META[cityName]?.prepositional : undefined) ||
      cityName ||
      'России';
    return {
      slug,
      title: cityName ? `Речные прогулки — ${cityName}` : 'Речные прогулки',
      subtitle: cityName
        ? `Речные прогулки и экскурсии на теплоходе в ${cityName}`
        : 'Речные прогулки по городам России',
      heroTitle: cityName
        ? `Речные прогулки по ${prep} сегодня — цены, расписание и сравнение теплоходов`
        : 'Речные прогулки по России — цены, расписание и сравнение теплоходов',
      heroSubtitle: cityName
        ? riverGuide?.heroSubtitle
        : 'От Невы до Енисея — сравните предложения речных прогулок в 12 городах России.',
      seoTitle: cityName ? `Речные прогулки ${cityName} | Дайбилет` : 'Речные прогулки | Дайбилет',
      seoDescription: 'Речные прогулки: расписание, цены и теплоходы.',
      events: 0,
    } as unknown as PublicLandingDto;
  }

  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(slug);
    if (!meta) return null;
    const cityGuide = seasonalCityGuide(slug, cityName);
    return {
      slug,
      title: meta.breadcrumbLabel,
      subtitle: meta.nationalHeroSubtitle,
      heroTitle: cityGuide
        ? slug === 'new-year'
          ? `Новый год в ${cityGuide.cityNameDative}: куда сходить и купить билеты`
          : `${meta.breadcrumbLabel} в ${cityGuide.cityNameDative}: лучшие точки обзора и экскурсии`
        : meta.nationalHeroTitle,
      heroSubtitle: cityGuide?.heroSubtitle || meta.nationalHeroSubtitle,
      seoTitle: cityGuide
        ? slug === 'new-year'
          ? `Новый год в ${cityGuide.cityNameDative}: куда сходить и купить билеты | Дайбилет`
          : `${meta.breadcrumbLabel} в ${cityGuide.cityName}: точки обзора и экскурсии | Дайбилет`
        : `${meta.nationalHeroTitle} | Дайбилет`,
      seoDescription: meta.nationalHeroSubtitle,
      events: 0,
    } as unknown as PublicLandingDto;
  }

  return {
    slug,
    title: slug.replace(/-/g, ' '),
    subtitle: 'Расписание и цены',
    seoTitle: `${slug} | Дайбилет`,
    seoDescription: 'Расписание и цены на Дайбилет.',
    events: 0,
  } as PublicLandingDto;
}

function finalizeLandingPayload(payload: PublicLandingPageDto, slug: string, cityName: string | null, citySlug?: string | null): PublicLandingPageDto {
  const sessions = filterSessionsByCity(payload.sessions, cityName, citySlug);
  const apiEvents = Number(payload.stats?.events);
  const filteredSame = sessions.length === payload.sessions.length;
  const useApiCount = Number.isFinite(apiEvents) && apiEvents >= sessions.length && filteredSame;
  const eventCount = useApiCount ? apiEvents : sessions.length;
  return {
    ...payload,
    landing: {
      ...(payload.landing.slug === slug ? payload.landing : { ...payload.landing, slug }),
      events: eventCount,
    },
    sessions,
    stats: {
      ...buildLandingStats(sessions),
      events: eventCount,
      sessions: eventCount,
      // Prefer API price band when we kept uncapped count and did not refilter rows.
      ...(useApiCount
        ? {
            priceFrom: payload.stats?.priceFrom ?? null,
            priceTo: payload.stats?.priceTo ?? null,
          }
        : {}),
    },
  };
}

const EMPTY_LANDING_STATS: PublicLandingPageDto['stats'] = {
  events: 0,
  sessions: 0,
  cities: {},
  categories: {},
  venues: {},
  priceFrom: null,
  priceTo: null,
};

function buildLandingShellPage(slug: string, citySlug?: string): PublicLandingPageDto | null {
  const cityName = resolveLandingCityName(citySlug, slug);
  const landing = createSyntheticLanding(slug, cityName);
  if (!landing) return null;

  return {
    generatedAt: '',
    landing: landing.slug === slug ? landing : { ...landing, slug },
    sessions: [],
    relatedLandings: [],
    blocks: [],
    stats: EMPTY_LANDING_STATS,
  };
}

const BUS_CITY_ORDER = Object.keys(BUS_CITY_META);

type LandingCitySwitchItem = { name: string; slug: string; href: string };

/** City switch targets for multi-city landings - not derived from city-filtered stats. */
function resolveLandingCitySwitchItems(
  landingSlug: string,
  profile: LandingProfile,
): LandingCitySwitchItem[] {
  const slug = canonicalLandingSlug(landingSlug);
  if (!MULTI_CITY_LANDING_SLUGS.has(slug) || profile === 'bridges') return [];

  const items: LandingCitySwitchItem[] = [];
  const seen = new Set<string>();
  const push = (name: string, cityKey: string, href: string) => {
    const key = normalizeKnownCitySlug(cityKey) || cityKey;
    if (!key || seen.has(key) || !isLandingCityAllowed(slug, key)) return;
    const label = String(name || '').trim();
    if (!label || /^не указан$/i.test(label)) return;
    seen.add(key);
    items.push({ name: label, slug: key, href });
  };

  if (profile === 'bus') {
    for (const name of BUS_CITY_ORDER) {
      const meta = BUS_CITY_META[name];
      const cityKey = citySlugByName(name) || meta?.slug;
      if (!cityKey) continue;
      push(name, cityKey, busLandingHref(cityKey));
    }
    return items;
  }

  if (profile === 'river') {
    for (const name of RIVER_CITY_ORDER) {
      const guide = riverCityGuide(name);
      if (!guide?.slug) continue;
      push(name, guide.slug, riverLandingHref(guide.slug));
    }
    return items;
  }

  if (profile === 'seasonal') {
    const order = getSeasonalLanding(landingSlug)?.cityOrder || [];
    for (const name of order) {
      const guide = seasonalCityGuide(landingSlug, name);
      if (!guide?.slug) continue;
      push(name, guide.slug, landingCategoryHref(landingSlug, guide.slug));
    }
    if (items.length) return items;
  }

  for (const cityKey of PRIORITY_LISTING_CITY_SLUGS) {
    const name = resolveLandingCityName(cityKey);
    if (!name) continue;
    push(name, cityKey, landingCategoryHref(landingSlug, cityKey));
  }
  return items;
}

function landingCitySwitchAllHref(landingSlug: string, profile: LandingProfile): string {
  if (profile === 'bus') return busLandingRoot(landingSlug);
  if (profile === 'river') return riverLandingRoot(landingSlug);
  if (profile === 'seasonal') return seasonalLandingRoot(landingSlug);
  return landingCategoryHref(landingSlug);
}

function LandingMultiCitySwitch({
  landingSlug,
  profile,
  citySlug,
  tone = 'filter',
  className = '',
}: {
  landingSlug: string;
  profile: LandingProfile;
  citySlug?: string;
  tone?: 'hero' | 'filter';
  className?: string;
}) {
  const selectedCity = useSelectedCityOptional();
  const items = resolveLandingCitySwitchItems(landingSlug, profile);
  if (items.length < 2) return null;

  const current = normalizeKnownCitySlug(citySlug);
  const allHref = landingCitySwitchAllHref(landingSlug, profile);
  const chipBase =
    'inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all';
  const activeCls =
    tone === 'hero'
      ? 'border-primary-foreground bg-primary-foreground text-primary'
      : 'border-primary bg-primary text-primary-foreground';
  const idleCls =
    tone === 'hero'
      ? 'border-primary-foreground/35 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
      : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary';

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="navigation"
      aria-label="Сменить город"
    >
      <a
        href={allHref}
        className={`${chipBase} ${!current ? activeCls : idleCls}`}
        onClick={(event) => {
          // Clear header/storage city so chrome matches national aggregation URL.
          if (!selectedCity) return;
          event.preventDefault();
          selectedCity.setCity('all');
        }}
      >
        Все города
      </a>
      {items.map((item) => {
        const active = current === item.slug;
        return (
          <a
            key={item.slug}
            href={item.href}
            className={`${chipBase} ${active ? activeCls : idleCls}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.name}
          </a>
        );
      })}
    </div>
  );
}

function readLandingGenreFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const genre = resolveConcertGenreTag(params.get('genre') || params.get('tag'));
  return genre || 'all';
}

function readLandingTypeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const type = String(params.get('type') || '').trim();
  return type || 'all';
}

function isConcertsGenreLanding(slug: string): boolean {
  return canonicalLandingSlug(slug) === 'concerts-genre';
}

const CONCERT_GENRE_CHIP_TAGS = ['Джаз', 'Рок', 'Классика'] as const;

function getLandingProfile(slug: string): LandingProfile {
  const key = canonicalLandingSlug(slug);
  if (isBridgesNightLandingSlug(key)) return 'bridges';
  if (getSeasonalLanding(key)) return 'seasonal';
  if (isRiverPartyLandingSlug(key)) return 'default';
  if (key.includes('bus')) return 'bus';
  if (key.includes('dinner') || key.includes('ужин')) return 'dinner';
  if (isRiverCruisesLandingSlug(key)) return 'river';
  return 'default';
}

function isLovableLanding(profile: LandingProfile): boolean {
  return profile === 'bus' || profile === 'river' || profile === 'dinner' || profile === 'seasonal' || profile === 'bridges' || profile === 'default';
}

function matchesTimeSlotFilter(session: PublicSessionDto, slot: TimeSlotFilter): boolean {
  if (!slot) return true;
  return sessionMatchesTimeSlot(session, slot);
}

function citySlugByName(name: string): string | null {
  const riverGuide = riverCityGuide(name);
  if (riverGuide?.slug) return riverGuide.slug;
  const busMeta = BUS_CITY_META[name]?.slug;
  if (busMeta) return busMeta;
  const entry = Object.entries(LANDING_CITY_SLUGS).find(([, cityName]) => cityName === name);
  return normalizeCitySlug(entry?.[0] || null);
}

function resolveLandingCityName(citySlug?: string | null, landingSlug?: string) {
  const key = String(citySlug || '').trim().toLowerCase();
  if (!key) return null;
  if (LANDING_CITY_SLUGS[key]) return LANDING_CITY_SLUGS[key];
  if (landingSlug) {
    const seasonal = seasonalCityGuideBySlug(canonicalLandingSlug(landingSlug), key);
    if (seasonal?.cityName) return seasonal.cityName;
  }
  return riverCityGuideBySlug(key)?.cityName || null;
}

type EventGroup = {
  key: string;
  title: string;
  city: string;
  venue: string;
  category: string;
  tags: string[];
  representative: PublicSessionDto;
  sessions: PublicSessionDto[];
  priceFrom?: number | null;
  priceTo?: number | null;
  vacant?: number | null;
  firstStartsAt?: string | null;
};

export function LandingPageView({
  slug: rawSlug,
  citySlug,
  initialPayload,
  genre: initialGenre,
  thinRelatedSessions = [],
  seoOverrideHtml = null,
  seoOverrideHeading = null,
}: {
  slug: string;
  citySlug?: string;
  initialPayload: PublicLandingPageDto;
  genre?: string | null;
  thinRelatedSessions?: PublicSessionDto[];
  /** SeoOverride.customText HTML for bottom SEO block. */
  seoOverrideHtml?: string | null;
  seoOverrideHeading?: string | null;
}) {
  const slug = canonicalLandingSlug(rawSlug);
  const profile = getLandingProfile(slug);
  const todayReference = useLandingTodayReference();
  const shell = React.useMemo(() => initialPayload, [initialPayload]);
  const initialCachedPayload = React.useMemo(() => initialPayload, [initialPayload]);

  const [apiPayload, setApiPayload] = React.useState<PublicLandingPageDto | null>(() => initialCachedPayload);
  const [isSessionsLoading, setIsSessionsLoading] = React.useState(() => !initialCachedPayload?.sessions?.length);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [city, setCity] = React.useState('all');
  const [category, setCategory] = React.useState(() => {
    // Prefer URL on client so SSR can skip searchParams (ISR).
    if (typeof window !== 'undefined') {
      if (isConcertsGenreLanding(rawSlug)) return readLandingGenreFromUrl();
      const type = readLandingTypeFromUrl();
      if (type !== 'all') return type;
    }
    return resolveConcertGenreTag(initialGenre) || 'all';
  });
  const [dateFilter, setDateFilter] = React.useState<DateFilter>(() =>
    defaultLandingDateFilter(profile, slug),
  );
  const [sort, setSort] = React.useState<SortFilter>(profile === 'bus' || profile === 'dinner' ? 'price' : 'time');
  const [menuFilter, setMenuFilter] = React.useState<MenuFilter>('all');
  const [dinnerTimeFilter, setDinnerTimeFilter] = React.useState<DinnerTimeFilter>('all');
  const [dinnerBadgeFilter, setDinnerBadgeFilter] = React.useState<DinnerBadgeFilter>('all');
  const [contextChip, setContextChip] = React.useState<string | null>(null);
  const [timeSlot, setTimeSlot] = React.useState<TimeSlotFilter>('');
  const [mobileCtaVisible, setMobileCtaVisible] = React.useState(false);

  React.useEffect(() => {
    if (profile !== 'bridges') return;
    const onScroll = () => setMobileCtaVisible(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [profile]);

  React.useEffect(() => {
    const nextProfile = getLandingProfile(slug);
    setSort(nextProfile === 'bus' || nextProfile === 'dinner' ? 'price' : 'time');
    setDateFilter(defaultLandingDateFilter(nextProfile, slug));
    setMenuFilter('all');
    setDinnerTimeFilter('all');
    setDinnerBadgeFilter('all');
    setContextChip(null);
    setTimeSlot('');
    setCategory(() => {
      if (isConcertsGenreLanding(slug)) return readLandingGenreFromUrl();
      if (typeof window !== 'undefined') {
        const type = readLandingTypeFromUrl();
        if (type !== 'all') return type;
      }
      return resolveConcertGenreTag(initialGenre) || 'all';
    });
    setApiPayload(
      initialCachedPayload?.landing
        ? finalizeLandingPayload(initialCachedPayload, slug, resolveLandingCityName(citySlug, slug), citySlug)
        : initialCachedPayload,
    );
    setSessionsError(null);
    setIsSessionsLoading(!initialCachedPayload?.sessions?.length);
  }, [slug, citySlug, initialCachedPayload, initialGenre]);

  React.useEffect(() => {
    // SSR already hydrated the landing — do not force a no-store remount fetch.
    // Still finalize so city filter recomputes priceFrom/priceTo for hero stats.
    if (initialCachedPayload?.landing) {
      setApiPayload(finalizeLandingPayload(initialCachedPayload, slug, resolveLandingCityName(citySlug, slug), citySlug));
      setIsSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    setIsSessionsLoading(true);
    setSessionsError(null);
    const landingParams = new URLSearchParams();
    if (citySlug) landingParams.set('city', citySlug);
    const landingQuery = landingParams.toString();
    fetch(
      `/api/public/landings/${encodeURIComponent(slug)}${landingQuery ? `?${landingQuery}` : ''}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicLandingPageDto | null;
      })
      .then((data) => {
        if (disposed) return;
        if (data?.landing) {
          const resolved = finalizeLandingPayload(data, slug, resolveLandingCityName(citySlug, slug), citySlug);
          setApiPayload(resolved);
          setSessionsError(null);
          return;
        }
        throw new Error('landing not found');
      })
      .catch((error) => {
        if (disposed || controller.signal.aborted) return;
        setSessionsError('Не удалось загрузить расписание. Попробуйте обновить страницу.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!disposed) setIsSessionsLoading(false);
      });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [slug, citySlug, initialCachedPayload]);

  React.useEffect(() => {
    const cityName = resolveLandingCityName(citySlug);
    setCity(cityName || 'all');
  }, [citySlug]);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (isConcertsGenreLanding(slug)) {
      if (category === 'all') url.searchParams.delete('genre');
      else url.searchParams.set('genre', category);
      url.searchParams.delete('type');
    } else {
      if (category === 'all') url.searchParams.delete('type');
      else url.searchParams.set('type', category);
    }
    const next = `${url.pathname}${url.search}`;
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState({}, '', next);
    }
  }, [category, slug]);

  const payload = apiPayload || shell;
  const sessionsReady = Boolean(apiPayload);

  React.useEffect(() => {
    if (!payload?.landing) return;
    const canonicalPath = landingCategoryHref(slug, citySlug);
    const seoInput = buildLandingSeoInput(payload.landing, slug, profile, citySlug, payload.stats, todayReference);
    const seo = resolveLandingSeo(seoInput);
    const cityName = seoInput.cityName;
    const listingMeta = cityName
      ? buildCategoryCityListingMeta({
          landingSlug: slug,
          cityName,
          fallbackTitle: payload.landing.title,
          referenceDate: todayReference,
        })
      : null;
    applyLandingSeoMeta({
      ...seoInput,
      isOffSeason: isLandingOffSeason(slug),
      canonicalPath,
      breadcrumbItems:
        profile === 'bridges'
          ? [
              { name: 'Главная', path: '/' },
              { name: 'Санкт-Петербург', path: '/cities/saint-petersburg' },
              { name: 'Разводные мосты', path: canonicalPath },
            ]
          : profile === 'river' && citySlug
            ? [
                { name: 'Главная', path: '/' },
                { name: cityName || citySlug, path: `/cities/${citySlug}` },
                { name: 'Речные прогулки', path: canonicalPath },
              ]
            : profile === 'bus' && citySlug
              ? [
                  { name: 'Главная', path: '/' },
                  { name: cityName || citySlug, path: `/cities/${citySlug}` },
                  { name: 'Автобусные экскурсии', path: canonicalPath },
                ]
              : undefined,
      faqItems:
        profile === 'bridges'
          ? BRIDGES_LANDING.faq
          : profile === 'river' && cityName
            ? (riverCityGuide(cityName)?.faq ?? undefined)
            : profile === 'bus' && cityName
              ? (busCityGuide(cityName)?.faq ?? undefined)
              : undefined,
      jsonLdExtras:
        profile === 'bridges'
          ? [
              buildBridgesProductJsonLd({
                canonicalUrl:
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
                    : `https://daibilet.ru${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`,
                priceFrom: payload.stats?.priceFrom ?? null,
                priceTo: payload.stats?.priceTo ?? null,
                offerCount: payload.stats?.events ?? 0,
                description: listingMeta?.description || seo.description,
              }),
            ]
          : undefined,
    });
    if (typeof document !== 'undefined') {
      // H1 and <title> share the same human pattern from resolveLandingSeo.
      document.title = seo.title;
      if (listingMeta) {
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.setAttribute('content', listingMeta.description);
      }
    }
  }, [payload?.landing, payload?.stats, slug, profile, citySlug, todayReference]);

  const filteredSessions = React.useMemo(() => {
    if (!payload || !sessionsReady) return [];

    return payload.sessions.filter((session) => {
      if (!session.startsAt && !isOpenDate(session)) return false;
      const eventWindow = resolveLandingEventWindow(slug, todayReference);
      if (eventWindow) {
        const timeZone = resolveSessionTimeZoneForSession(session);
        const times = collectSessionStartsAtTimes(session);
        if (!times.length) return false;
        if (!times.some((startsAt) => isSessionInsideLandingWindow(startsAt, eventWindow, timeZone))) {
          return false;
        }
      }
      if (city !== 'all' && !sessionMatchesCity(session, city)) return false;
      if (category !== 'all' && session.category !== category && !session.tags.includes(category)) return false;
      if (profile === 'dinner' && !matchesMenuFilter(session, menuFilter)) return false;
      if (profile === 'dinner' && !matchesDinnerTimeFilter(session, dinnerTimeFilter)) return false;
      if (profile === 'dinner' && !sessionMatchesLandingBadge(session, dinnerBadgeFilter)) return false;
      if (contextChip) {
        const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е');
        const needles = normalize(contextChip)
          .split(/[,;]+/)
          .map((part) => part.trim())
          .filter(Boolean);
        const text = normalize(
          [session.title, session.category, ...(session.tags || []), ...(session.subcategories || [])].join(' '),
        );
        if (needles.length && !needles.some((needle) => text.includes(needle))) return false;
      }
      if ((profile === 'bus' || profile === 'river' || profile === 'seasonal' || profile === 'bridges') && !matchesTimeSlotFilter(session, timeSlot)) return false;
      if (profile !== 'bridges' && !matchesDateFilter(session, dateFilter, eventWindow, todayReference)) return false;
      return true;
    });
  }, [category, city, dateFilter, menuFilter, dinnerTimeFilter, dinnerBadgeFilter, contextChip, timeSlot, payload, profile, sessionsReady, slug, todayReference]);

  const allGroups = React.useMemo(
    () => (payload && sessionsReady ? groupLandingSessions(payload.sessions) : []),
    [payload, sessionsReady],
  );
  const dinnerMenuFacets = React.useMemo(
    () => (profile === 'dinner' && payload ? collectDinnerMenuFacets(payload.sessions) : []),
    [payload, profile],
  );
  const dinnerBadgeFacets = React.useMemo(() => {
    if (profile !== 'dinner' || !payload?.sessions.length) return [];
    return collectLandingBadgeFacets(payload.sessions, ['vip', 'live-music', 'guide', 'open-deck']).filter((facet) => {
      const count = payload.sessions.filter((session) => sessionMatchesLandingBadge(session, facet.id)).length;
      return count > 0 && count < payload.sessions.length;
    });
  }, [payload, profile]);
  const groups = React.useMemo(() => sortEventGroups(groupLandingSessions(filteredSessions), sort), [filteredSessions, sort]);
  const cityName = resolveLandingCityName(citySlug, slug);
  const contextWidget = React.useMemo(() => resolveLandingContextWidget(slug), [slug]);
  const contentPack = React.useMemo(() => resolveLandingContentPack(slug), [slug]);
  const bridgesRows = React.useMemo(() => {
    if (profile !== 'bridges' || !sessionsReady) return [];
    const upcoming = filterUpcomingBridgeGroups(allGroups);
    return mapBridgesGroups(upcoming.length ? upcoming : allGroups);
  }, [allGroups, profile, sessionsReady]);
  const bridgesComparison = React.useMemo(() => pickComparisonRows(bridgesRows), [bridgesRows]);

  const scrollToSchedule = React.useCallback((hint?: string) => {
    if (hint === 'budget') setSort('price');
    if (hint === 'classic' || hint === 'scenic') setSort('time');
    window.setTimeout(() => {
      document.getElementById('variants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);
  const seasonalMeta = profile === 'seasonal' ? getSeasonalLanding(slug) : null;
  const landingCopy = resolveLandingCopy(slug);
  const useLandingCopy = shouldUseLandingCopy(slug, profile, citySlug);

  if (!payload) {
    return <ErrorState message="Лендинг не найден." />;
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${profile === 'bridges' ? 'bridges-landing pb-20 md:pb-0' : ''}`}>
      
      <>
          {profile !== 'bridges' ? <LandingStickyHeader /> : null}
          <LandingHero
            landing={payload.landing}
            profile={profile}
            landingSlug={slug}
            citySlug={citySlug}
            visibleCount={allGroups.length}
            sessionsCount={payload.sessions.length}
            stats={payload.stats}
            sessionsReady={sessionsReady}
            todayReference={todayReference}
            onScrollToSchedule={() => scrollToSchedule()}
            bridgesHeroActions={
              profile === 'bridges' ? (
                <BridgesHeroBlock
                  priceFrom={payload.stats.priceFrom ?? null}
                  priceTo={payload.stats.priceTo ?? null}
                  visibleCount={allGroups.length}
                  soldEstimate={resolveLandingHeroSoldEstimate('bridges', allGroups.length, payload.sessions.length)}
                  sessionsReady={sessionsReady}
                  onPickTour={() => scrollToSchedule()}
                  onViewSchedule={() => document.getElementById('bridges-lift-schedule')?.scrollIntoView({ behavior: 'smooth' })}
                />
              ) : undefined
            }
          />
          {profile === 'bridges' ? <BridgesScheduleStrip /> : null}
          {profile === 'bridges' ? <BridgesTonightTips /> : null}
          {contextWidget ? (
            <div className="container-page">
              <LandingContextWidget
                config={contextWidget}
                activeChip={contextChip}
                onChipSelect={setContextChip}
              />
            </div>
          ) : null}
          {profile === 'seasonal' && !citySlug && seasonalMeta?.nationalIntro ? (
            <section className="container-page pb-4 pt-8">
              <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{seasonalMeta.nationalIntro}</p>
            </section>
          ) : null}
          {useLandingCopy && landingCopy?.body && profile !== 'bridges' ? (
            <section className="container-page pb-4 pt-8">
              <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{landingCopy.body}</p>
            </section>
          ) : null}
          {profile === 'bus' && citySlug ? (
            <LandingCityIntroGuide cityName={cityName} profile="bus" />
          ) : null}
          {profile === 'river' && citySlug ? (
            <LandingCityIntroGuide cityName={cityName} profile="river" />
          ) : null}
          {profile === 'seasonal' && citySlug && cityName ? (
            <LandingSeasonalCityGuide landingSlug={slug} cityName={cityName} />
          ) : null}
          {profile === 'dinner' && citySlug && !useLandingCopy ? (
            <LandingDinnerIntro cityName={cityName} citySlug={citySlug} />
          ) : null}
          {profile === 'dinner' && citySlug ? (
            <LandingDinnerPiers cityName={cityName} citySlug={citySlug} />
          ) : null}
          <section id="variants" className={`container-page scroll-mt-24 ${profile === 'dinner' ? 'py-6' : profile === 'bridges' ? 'py-10 md:py-12' : 'py-12'}`}>
        {profile === 'bridges' ? (
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[oklch(0.72_0.17_55)]">Рейсы сегодня</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              <time dateTime={formatLandingTodayIso(todayReference)}>
                Расписание рейсов на сегодня, {formatLandingTodayLong(todayReference)}
              </time>
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Все рейсы проходят под Дворцовым и Троицким. Сравните маршрут, причал и теплоход.
            </p>
          </div>
        ) : (
        <h2 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
          {profile === 'dinner' && dinnerCityGuide(cityName, citySlug)?.scheduleTitle
            ? dinnerCityGuide(cityName, citySlug)!.scheduleTitle
              : profile === 'seasonal' && seasonalMeta
              ? cityName
                ? `${seasonalMeta.scheduleTitle} - ${cityName}`
                : seasonalMeta.scheduleTitle
              : cityName
                ? `Расписание событий - ${cityName}`
                : 'Расписание событий'}
        </h2>
        )}
            {profile === 'dinner' ? (
              <LandingDinnerFilters
                dateFilter={dateFilter}
                sort={sort}
                groupsCount={groups.length}
                menuFilter={menuFilter}
                dinnerTimeFilter={dinnerTimeFilter}
                dinnerBadgeFilter={dinnerBadgeFilter}
                badgeFacets={dinnerBadgeFacets}
                menuFacets={dinnerMenuFacets}
                setDateFilter={setDateFilter}
                setSort={setSort}
                setMenuFilter={setMenuFilter}
                setDinnerTimeFilter={setDinnerTimeFilter}
                setDinnerBadgeFilter={setDinnerBadgeFilter}
                reset={() => {
                  setDateFilter(defaultLandingDateFilter(profile, slug));
                  setSort('price');
                  setMenuFilter('all');
                  setDinnerTimeFilter('all');
                  setDinnerBadgeFilter('all');
                  setCategory('all');
                }}
              />
            ) : profile === 'bridges' ? null : (
            <LandingFilters
              profile={profile}
              landingSlug={payload.landing.slug}
              landingCity={(payload.landing as PublicLandingDto & { city?: string }).city}
              citySlug={citySlug}
              stats={payload.stats}
              city={city}
              category={category}
              dateFilter={dateFilter}
              sort={sort}
              timeSlot={timeSlot}
              groupsCount={groups.length}
              setCity={setCity}
              setCategory={setCategory}
              setDateFilter={setDateFilter}
              setSort={setSort}
              setTimeSlot={setTimeSlot}
              hideSort={profile === 'river' || profile === 'bus'}
              reset={() => {
                setCity(cityName || 'all');
                setCategory('all');
                setDateFilter(defaultLandingDateFilter(profile, slug));
                setSort(profile === 'bus' ? 'price' : 'time');
                setTimeSlot('');
              }}
            />
            )}
            {isSessionsLoading ? (
              <LandingScheduleSkeleton profile={profile} />
            ) : sessionsError ? (
              <ScheduleErrorState message={sessionsError} />
            ) : profile === 'dinner' ? (
              <DinnerScheduleSection
                groups={groups as DinnerEventGroup[]}
                emptyKind={allGroups.length === 0 ? 'zero' : 'filtered'}
                cityName={cityName}
                onReset={() => {
                  setDateFilter('today');
                  setSort('price');
                  setMenuFilter('all');
                  setDinnerTimeFilter('all');
                  setDinnerBadgeFilter('all');
                  setCategory('all');
                }}
              />
            ) : profile === 'bridges' ? (
              <BridgesScheduleSection groups={groups} sort={sort} setSort={setSort} />
            ) : profile === 'river' ? (
              <RiverScheduleSection groups={groups as RiverEventGroup[]} />
            ) : profile === 'bus' ? (
              <BusScheduleSection groups={groups as BusEventGroup[]} />
            ) : (
            <LandingScheduleList
              groups={groups}
              profile={profile}
              emptyKind={allGroups.length === 0 ? 'zero' : 'filtered'}
              cityName={cityName}
              relatedSessions={thinRelatedSessions}
              relatedLinks={citySlug ? resolveRelatedListingLinks(slug, citySlug) : []}
              landingSlug={slug}
              onReset={() => {
                setCity(cityName || 'all');
                setCategory('all');
                setDateFilter(defaultLandingDateFilter(profile, slug));
                setSort('time');
                setTimeSlot('');
                setContextChip(null);
              }}
            />
            )}
            {!isSessionsLoading && profile === 'bus' && citySlug && cityName ? (
              <>
                <LandingCityLocations cityName={cityName} profile="bus" />
                <LandingOtherCitiesGrid landing={payload.landing} currentCityName={cityName} />
              </>
            ) : null}
            {!isSessionsLoading && profile === 'river' && citySlug && cityName ? (
              <>
                {groups.length <= 4 ? (
                  <LandingRiverFreeAlternatives cityName={cityName} />
                ) : null}
                <LandingCityLocations cityName={cityName} profile="river" />
                <LandingRiverOtherCitiesGrid landing={payload.landing} currentCityName={cityName} />
              </>
            ) : null}
            {!isSessionsLoading && profile === 'seasonal' && citySlug && cityName ? (
              <>
                {groups.length <= 4 ? (
                  <LandingSeasonalFreeAlternatives landingSlug={slug} cityName={cityName} />
                ) : null}
                <LandingSeasonalOtherCitiesGrid landingSlug={slug} currentCityName={cityName} />
              </>
            ) : null}
          </section>
          <div className="container-page">
            {citySlug && cityName ? (
              <>
                <LandingSeeAlso
                  cityName={cityName}
                  links={resolveRelatedListingLinks(slug, citySlug)}
                />
                <LandingThinRelatedCards
                  landingSlug={slug}
                  citySlug={citySlug}
                  cityName={cityName}
                  offerCount={payload.stats?.events ?? payload.sessions?.length ?? 0}
                  initialSessions={thinRelatedSessions}
                />
              </>
            ) : null}
            <LandingSeoBottom
              landingSlug={slug}
              citySlug={citySlug}
              seoInput={buildLandingSeoInput(payload.landing, slug, profile, citySlug, payload.stats, todayReference)}
              hasCmsSeoText={landingBlocksHaveSeoText(payload.blocks)}
              overrideHtml={seoOverrideHtml}
              overrideHeading={seoOverrideHeading}
            />
          </div>
          {profile === 'dinner' ? (
            <>
              <section className="container-page">
                <LandingDinnerAudience />
              </section>
              {citySlug ? (
                <section className="container-page pb-6">
                  <LandingDinnerRiverLink cityName={cityName} citySlug={citySlug} />
                </section>
              ) : null}
            </>
          ) : null}
          <div className="container-page">
            {sessionsReady && profile === 'bus' ? <LandingSchemaJsonLd groups={groups} cityName={cityName} /> : null}
            {!isLovableLanding(profile) ? (
              <LandingContentBlocks blocks={payload.blocks || []} landing={payload.landing} stats={payload.stats} />
            ) : null}
            {profile === 'default' || profile === 'bridges' || profile === 'seasonal' || contentPack ? (
              <LandingHowToChoose
                landing={payload.landing}
                stats={payload.stats}
                profile={profile}
                contentPack={contentPack}
              />
            ) : null}
            <LandingFaq
              landing={payload.landing}
              blocks={payload.blocks || []}
              profile={profile}
              citySlug={citySlug}
              landingSlug={slug}
              contentPack={contentPack}
            />
            {profile === 'bridges' ? (
              <BridgesShipChecklist />
            ) : contentPack?.checklist?.length ? (
              <LandingAttentionChecklist
                title={contentPack.checklistTitle}
                items={contentPack.checklist}
              />
            ) : null}
            <LandingReviews landing={payload.landing} profile={profile} landingSlug={slug} />
            {profile === 'bridges' ? (
              <div className="border-t border-border pt-12">
                <BridgesComparisonTable rows={bridgesComparison} />
                <BridgesLandingGuide />
              </div>
            ) : null}
            {profile !== 'bridges' ? (
            <div className="py-12 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>
                  {profile === 'dinner'
                    ? 'Бронирование через систему организатора. Мы помогаем сравнить предложения ужинов на теплоходах.'
                    : 'Покупка оформляется через билетную систему организатора. Мы помогаем сравнить предложения.'}
                </span>
              </div>
            </div>
            ) : null}
            {sessionsReady && profile === 'bus' && !citySlug ? (
              <LandingCitiesGrid landing={payload.landing} stats={payload.stats} />
            ) : sessionsReady && profile === 'river' && !citySlug ? (
              <LandingRiverCitiesGrid landing={payload.landing} />
            ) : sessionsReady && profile === 'seasonal' && !citySlug && seasonalMeta?.cityOrder.length ? (
              <LandingSeasonalCitiesGrid landingSlug={slug} />
            ) : sessionsReady && profile === 'dinner' ? null : sessionsReady ? (
              <div className={profile === 'bridges' ? 'mb-16 pb-10' : undefined}>
                <RelatedLandings landings={payload.relatedLandings} landing={payload.landing} stats={payload.stats} citySlug={citySlug} />
              </div>
            ) : null}
          </div>
          {profile === 'bridges' ? (
            <BridgesMobileStickyCta
              priceFrom={payload.stats.priceFrom ?? null}
              priceTo={payload.stats.priceTo ?? null}
              visible={mobileCtaVisible}
            />
          ) : null}
          
        </>
    </div>
  );
}

function LandingHero({
  landing,
  profile,
  landingSlug,
  citySlug,
  visibleCount,
  sessionsCount,
  stats,
  sessionsReady = true,
  todayReference,
  onScrollToSchedule,
  bridgesHeroActions,
}: {
  landing: PublicLandingDto;
  profile: LandingProfile;
  landingSlug: string;
  citySlug?: string;
  visibleCount: number;
  sessionsCount: number;
  stats: PublicLandingPageDto['stats'];
  sessionsReady?: boolean;
  todayReference: Date;
  onScrollToSchedule?: () => void;
  bridgesHeroActions?: React.ReactNode;
}) {
  const cityName = resolveLandingCityName(citySlug, landingSlug);
  const isBus = profile === 'bus';
  const isRiver = profile === 'river';
  const isDinner = profile === 'dinner';
  const isSeasonal = profile === 'seasonal';
  const isBridges = profile === 'bridges';
  const seasonalMeta = isSeasonal ? getSeasonalLanding(landingSlug) : null;
  const seasonalCity = seasonalMeta ? seasonalCityGuide(landingSlug, cityName) : null;
  const busGuide = cityName ? busCityGuide(cityName) : null;
  const riverGuide = cityName ? riverCityGuide(cityName) : null;
  const dinnerGuide = isDinner ? dinnerCityGuide(cityName, citySlug) : null;
  const landingCopy = resolveLandingCopy(landingSlug);
  const useCopy = shouldUseLandingCopy(landingSlug, profile, citySlug);
  const landingSeo = resolveLandingSeo(
    buildLandingSeoInput(landing, landingSlug, profile, citySlug, stats, todayReference),
  );
  const countdownKind = isSeasonal ? resolveSeasonalCountdownKind(landingSlug) : null;
  const heroTheme = resolveLandingHeroTheme({ profile, landingSlug, countdownKind });
  const heroSubtitle = isBridges
    ? BRIDGES_LANDING.heroSubtitle
    : useCopy && landingCopy?.lead
    ? landingCopy.lead
    : isSeasonal && seasonalMeta
    ? seasonalCity?.heroSubtitle || seasonalMeta.nationalHeroSubtitle
    : isDinner && dinnerGuide
    ? dinnerGuide.heroSubtitle
    : isBus && cityName && busGuide?.heroSubtitle
      ? busGuide.heroSubtitle
      : isBus && !cityName
        ? landing.heroSubtitle || 'От Калининграда до Сочи - сравните автобусные экскурсии в 11 городах России.'
        : isRiver && cityName && riverGuide?.heroSubtitle
          ? riverGuide.heroSubtitle
          : isRiver && !cityName
            ? landing.heroSubtitle || 'От Невы до Енисея - сравните предложения речных прогулок в 12 городах России.'
            : landing.heroSubtitle || landing.subtitle;
  const soldEstimate = resolveLandingHeroSoldEstimate(profile, visibleCount, sessionsCount);
  const countLabel = isBridges
    ? 'рейсов ночью'
    : countdownKind === 'new-year'
      ? 'событий'
      : isBus && cityName
        ? 'рейсов'
        : isBus
          ? 'экскурсий'
          : isRiver && cityName
            ? 'прогулок'
            : isDinner
              ? 'ужинов'
              : isSeasonal
                ? 'программ'
                : 'событий';
  const primaryLabel = resolveLandingHeroPrimaryLabel(profile, countdownKind);
  const secondaryLabel =
    countdownKind === 'new-year'
      ? 'Смотреть афишу'
      : isSeasonal && !citySlug
        ? 'К городам'
        : undefined;
  const priceOnCta = countdownKind === 'new-year' ? 'range' : 'from';

  return (
    <section className={`relative overflow-hidden ${heroTheme.className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div
          className="absolute left-1/2 top-24 h-96 w-[120%] -translate-x-1/2 rounded-[50%] blur-3xl"
          style={{ backgroundColor: isBridges ? 'var(--bridges-hero-glow)' : heroTheme.glow }}
        />
      </div>
      <div className="relative container-page pb-16 pt-10 md:pt-14">
        <div className="max-w-5xl">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-2">
              <a href="/" className="transition-colors hover:text-primary-foreground">Главная</a>
            </span>
            {isBus && !cityName ? (
              <span className="flex items-center gap-2">
                <span>/</span>
                <span className="text-primary-foreground">Автобусные экскурсии</span>
              </span>
            ) : isBus && cityName ? (
              <>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <a href={busLandingRoot(landing.slug)} className="transition-colors hover:text-primary-foreground">Автобусные экскурсии</a>
                </span>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <span className="text-primary-foreground">{cityName}</span>
                </span>
              </>
            ) : isDinner && dinnerGuide ? (
              <>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <a href={dinnerGuide.riverCruiseHref} className="transition-colors hover:text-primary-foreground">Речные прогулки</a>
                </span>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <span className="text-primary-foreground">{dinnerGuide.breadcrumbCurrent}</span>
                </span>
              </>
            ) : isSeasonal && !cityName && seasonalMeta ? (
              <span className="flex items-center gap-2">
                <span>/</span>
                <span className="text-primary-foreground">{seasonalMeta.breadcrumbLabel}</span>
              </span>
            ) : isSeasonal && cityName && seasonalMeta ? (
              <>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <a href={seasonalLandingRoot(landingSlug)} className="transition-colors hover:text-primary-foreground">{seasonalMeta.breadcrumbLabel}</a>
                </span>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <span className="text-primary-foreground">{cityName}</span>
                </span>
              </>
            ) : isBridges ? (
              <>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <a href="/cities/saint-petersburg" className="transition-colors hover:text-primary-foreground">
                    {BRIDGES_LANDING.cityName}
                  </a>
                </span>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <span className="text-primary-foreground">{BRIDGES_LANDING.breadcrumbLabel}</span>
                </span>
              </>
            ) : isRiver && !cityName ? (
              <span className="flex items-center gap-2">
                <span>/</span>
                <span className="text-primary-foreground">Речные прогулки</span>
              </span>
            ) : isRiver && cityName ? (
              <>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <a href={riverLandingRoot(landing.slug)} className="transition-colors hover:text-primary-foreground">Речные прогулки</a>
                </span>
                <span className="flex items-center gap-2">
                  <span>/</span>
                  <span className="text-primary-foreground">{cityName}</span>
                </span>
              </>
            ) : cityName ? (
              <span className="flex items-center gap-2">
                <span>/</span>
                <a
                  href={cityHref({
                    name: cityName,
                    slug: citySlug || citySlugFromCityName(cityName) || citySlugByName(cityName) || undefined,
                  })}
                  className="transition-colors hover:text-primary-foreground"
                >
                  {cityName}
                </a>
              </span>
            ) : null}
            {!isBus && !isDinner && !isRiver && !isSeasonal && !isBridges ? (
              <span className="flex items-center gap-2">
                <span>/</span>
                <span className="text-primary-foreground">{landing.title}</span>
              </span>
            ) : null}
          </nav>
          <h1 className="mb-5 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-primary-foreground md:text-4xl lg:text-5xl">
            {isBridges ? (
              <>
                <span className="block">{landingSeo.h1Lead.trim()}</span>
                <span className="mt-1 block text-[0.92em] md:mt-0 md:inline md:text-inherit">
                  {landingSeo.h1Today}
                  {landingSeo.h1Tail}
                </span>
              </>
            ) : (
              <>
                {landingSeo.h1Lead}
                {landingSeo.h1Today ? (
                  <span className="whitespace-nowrap">{landingSeo.h1Today}</span>
                ) : null}
                {landingSeo.h1Tail}
              </>
            )}
          </h1>
          {!isBridges && MULTI_CITY_LANDING_SLUGS.has(canonicalLandingSlug(landingSlug)) ? (
            <LandingMultiCitySwitch
              landingSlug={landingSlug}
              profile={profile}
              citySlug={citySlug}
              tone="hero"
              className="mb-5 md:hidden"
            />
          ) : null}
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/75">{heroSubtitle}</p>
          <ul className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
            <li className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              Билет на email после оплаты
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4 shrink-0" aria-hidden />
              Возврат по правилам организатора
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Ticket className="h-4 w-4 shrink-0" aria-hidden />
              Электронный вход - без очереди в кассу
            </li>
          </ul>
          {bridgesHeroActions}
          {!isBridges && onScrollToSchedule ? (
            <LandingHeroCtaBlock
              priceFrom={stats.priceFrom ?? null}
              priceTo={stats.priceTo ?? null}
              visibleCount={visibleCount}
              countLabel={countLabel}
              soldEstimate={soldEstimate}
              sessionsReady={sessionsReady}
              primaryLabel={primaryLabel}
              secondaryLabel={secondaryLabel}
              priceOnCta={priceOnCta}
              leading={
                countdownKind ? <SeasonalHeroCountdown kind={countdownKind} /> : undefined
              }
              onPrimary={onScrollToSchedule}
              onSecondary={
                secondaryLabel
                  ? countdownKind === 'new-year'
                    ? onScrollToSchedule
                    : () => document.getElementById('landing-cities')?.scrollIntoView({ behavior: 'smooth' })
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LandingCityIntroGuide({
  cityName,
  profile,
  customGuide,
}: {
  cityName: string | null;
  profile: 'bus' | 'river';
  customGuide?: { intro: string; spots: RiverCitySpot[]; tips: string[] };
}) {
  const guide = customGuide || (profile === 'bus' ? busCityGuide(cityName) : riverCityGuide(cityName));
  if (!guide || !cityName) return null;

  const spots: RiverCitySpot[] = guide.spots;

  return (
    <section className="container-page space-y-8 py-8">
      <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
      <div className="grid gap-6 md:grid-cols-2">
        {spots.length > 0 ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Eye className="h-5 w-5 text-primary" />
              Лучшие точки обзора
            </div>
            <ul className="space-y-3">
              {spots.map((spot) => (
                <li key={spot.title} className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{spot.title}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          spot.badgeTone === 'free'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {spot.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{spot.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {guide.tips.length > 0 ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Lightbulb className="h-5 w-5 text-primary" />
              Советы
            </div>
            <ul className="space-y-3">
              {guide.tips.map((tip, index) => (
                <li key={tip} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LandingSeasonalCityGuide({ landingSlug, cityName }: { landingSlug: string; cityName: string }) {
  const guide = seasonalCityGuide(landingSlug, cityName);
  if (!guide) return null;
  return <LandingCityIntroGuide cityName={cityName} profile="river" customGuide={guide} />;
}

function LandingSeasonalCitiesGrid({ landingSlug }: { landingSlug: string }) {
  const meta = getSeasonalLanding(landingSlug);
  if (!meta?.cityOrder.length) return null;

  return (
    <div id="landing-cities" className="scroll-mt-24 py-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">{meta.breadcrumbLabel} по городам</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {meta.cityOrder.map((name) => {
            const guide = meta.cities[name];
            if (!guide) return null;
            return (
              <a
                key={name}
                href={landingCategoryHref(landingSlug, guide.slug)}
                className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground">{name}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingSeasonalOtherCitiesGrid({ landingSlug, currentCityName }: { landingSlug: string; currentCityName: string }) {
  const meta = getSeasonalLanding(landingSlug);
  if (!meta) return null;
  const cities = meta.cityOrder.filter((name) => name !== currentCityName);
  if (!cities.length) return null;

  return (
    <div className="mt-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">{meta.breadcrumbLabel} в других городах</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cities.map((name) => {
            const guide = meta.cities[name];
            if (!guide) return null;
            return (
              <a
                key={name}
                href={landingCategoryHref(landingSlug, guide.slug)}
                className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground">{name}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingSeasonalFreeAlternatives({ landingSlug, cityName }: { landingSlug: string; cityName: string }) {
  const guide = seasonalCityGuide(landingSlug, cityName);
  const freeSpots = guide?.spots.filter((spot) => spot.badgeTone === 'free') || [];
  if (!freeSpots.length) return null;

  return (
    <div className="mt-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Бесплатные альтернативы — {cityName}</h3>
        <ul className="space-y-3">
          {freeSpots.map((spot) => (
            <li key={spot.title} className="flex items-start gap-3 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <span>
                <span className="font-medium text-foreground">{spot.title}</span>
                {' — '}
                {spot.description}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LandingDinnerIntro({ cityName, citySlug }: { cityName: string | null; citySlug?: string }) {
  const guide = dinnerCityGuide(cityName, citySlug);
  if (!guide) return null;

  return (
    <section className="container-page py-8">
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <h2 className="mb-3 text-xl font-bold text-foreground md:text-2xl">{guide.introTitle}</h2>
        <p className="max-w-4xl leading-relaxed text-muted-foreground">{guide.introText}</p>
      </div>
    </section>
  );
}

function LandingDinnerPiers({ cityName, citySlug }: { cityName: string | null; citySlug?: string }) {
  const guide = dinnerCityGuide(cityName, citySlug);
  if (!guide || (!guide.piers.length && !guide.mealFormats.length)) return null;

  return (
    <section className="container-page space-y-8 py-6">
      {guide.piers.length ? (
        <div>
          <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">Причалы отправления</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {guide.piers.map((pier) => (
              <article key={pier.name} className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-1 text-base font-semibold text-foreground">{pier.name}</h3>
                <p className="mb-2 text-sm leading-relaxed text-muted-foreground">{pier.description}</p>
                {pier.transport ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    🚇 {pier.transport}
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {guide.mealFormats.length ? (
        <div>
          <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">Форматы питания</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {guide.mealFormats.map((fmt) => (
              <article key={fmt.name} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{fmt.name}</h3>
                  {fmt.badge ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{fmt.badge}</span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{fmt.description}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LandingDinnerFilters({
  dateFilter,
  sort,
  groupsCount,
  menuFilter,
  dinnerTimeFilter,
  dinnerBadgeFilter,
  badgeFacets,
  menuFacets,
  setDateFilter,
  setSort,
  setMenuFilter,
  setDinnerTimeFilter,
  setDinnerBadgeFilter,
  reset,
}: {
  dateFilter: DateFilter;
  sort: SortFilter;
  groupsCount: number;
  menuFilter: MenuFilter;
  dinnerTimeFilter: DinnerTimeFilter;
  dinnerBadgeFilter: DinnerBadgeFilter;
  badgeFacets: Array<{ id: LandingCardBadgeId; label: string }>;
  menuFacets: Array<{ value: Exclude<MenuFilter, 'all'>; label: string }>;
  setDateFilter: (value: DateFilter) => void;
  setSort: (value: SortFilter) => void;
  setMenuFilter: (value: MenuFilter) => void;
  setDinnerTimeFilter: (value: DinnerTimeFilter) => void;
  setDinnerBadgeFilter: (value: DinnerBadgeFilter) => void;
  reset: () => void;
}) {
  const sortTabs: Array<{ label: string; value: SortFilter }> = [
    { label: 'По цене', value: 'price' },
    { label: 'По времени', value: 'time' },
  ];
  const dateLabel = dateFilter === 'today' ? 'Сегодня' : dateFilter === 'tomorrow' ? 'Завтра' : null;
  const menuChip = (value: MenuFilter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setMenuFilter(value)}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        menuFilter === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="hidden items-center gap-1 border-b border-border sm:flex">
        {sortTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSort(tab.value)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${sort === tab.value ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
            {sort === tab.value ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" /> : null}
          </button>
        ))}
      </div>

      <div className="hidden flex-wrap items-center gap-2 max-w-fit lg:flex">
        <div className="flex items-center gap-1.5">
          {(['today', 'tomorrow'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateFilter(value)}
              className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                dateFilter === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              {value === 'today' ? 'Сегодня' : 'Завтра'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
              dateFilter === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Другая дата
          </button>
        </div>
        {menuFacets.length ? (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              {menuChip('all', 'Любое меню')}
              {menuFacets.map((facet) => menuChip(facet.value, facet.label))}
            </div>
          </>
        ) : null}
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDinnerTimeFilter(dinnerTimeFilter === 'sunset' ? 'all' : 'sunset')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              dinnerTimeFilter === 'sunset' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            Закат (18–21)
          </button>
          <button
            type="button"
            onClick={() => setDinnerTimeFilter(dinnerTimeFilter === 'night' ? 'all' : 'night')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              dinnerTimeFilter === 'night' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            Ночь (21+)
          </button>
        </div>
      </div>

      {badgeFacets.length ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setDinnerBadgeFilter('all')}
              className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                dinnerBadgeFilter === 'all'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              Все форматы
            </button>
          {badgeFacets.map((facet) => (
            <button
              key={facet.id}
              type="button"
              onClick={() => setDinnerBadgeFilter(dinnerBadgeFilter === facet.id ? 'all' : facet.id)}
              className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                dinnerBadgeFilter === facet.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              {facet.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 lg:hidden">
        <div className="flex items-center gap-1.5">
          {(['today', 'tomorrow'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateFilter(value)}
              className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                dateFilter === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              {value === 'today' ? 'Сегодня' : 'Завтра'}
            </button>
          ))}
        </div>
        {menuFacets.length ? (
          <div className="flex flex-wrap gap-2">
            {menuChip('all', 'Меню: любое')}
            {menuFacets.map((facet) => menuChip(facet.value, facet.label))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <select
            value={dinnerTimeFilter}
            onChange={(event) => setDinnerTimeFilter(event.target.value as DinnerTimeFilter)}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">Любое время</option>
            <option value="sunset">Закат (18–21)</option>
            <option value="night">Ночь (21+)</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortFilter)}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {sortTabs.map((tab) => (
              <option key={tab.value} value={tab.value}>{tab.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 mt-6 flex flex-wrap items-center gap-3">
        {dateLabel ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            📅 {dateLabel}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {groupsCount > 0 ? `${formatNumber(groupsCount)} рейсов` : 'Нет вариантов по выбранным фильтрам'}
        </span>
        {groupsCount === 0 ? (
          <button type="button" onClick={reset} className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LandingDinnerScheduleList({
  groups,
  onReset,
  emptyKind = 'filtered',
  cityName,
  relatedSessions = [],
  relatedLinks = [],
}: {
  groups: EventGroup[];
  onReset: () => void;
  emptyKind?: 'zero' | 'filtered';
  cityName?: string | null;
  relatedSessions?: PublicSessionDto[];
  relatedLinks?: import('@/lib/seo-internal-links').SeoLink[];
}) {
  if (!groups.length) {
    return (
      <LandingEmptyState
        kind={emptyKind}
        cityName={cityName}
        relatedSessions={relatedSessions}
        relatedLinks={relatedLinks}
        onReset={onReset}
      />
    );
  }

  const menuHits = groups.filter((g) => extractMenuLabel(g.representative)).length;
  const showMenuColumn = menuHits >= Math.max(1, Math.ceil(groups.length / 2));
  const formatLabels = groups.map((g) => extractFormatLabel(g.representative.tags));
  const showFormatColumn = formatLabels.some((f) => f !== 'Стандарт');
  const desktopGrid = dinnerScheduleGridClass(showMenuColumn, showFormatColumn);

  return (
    <>
      <div className={`mb-2 hidden items-center gap-4 px-5 py-2 md:grid ${desktopGrid}`}>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Прогулка</span>
        {showMenuColumn ? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Меню</span> : null}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Цена</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Время</span>
        {showFormatColumn ? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Формат</span> : null}
        <span />
      </div>
      <div className="space-y-3">
        {groups.map((group, index) => (
          <LandingDinnerScheduleRow
            key={group.key}
            group={group}
            isOptimal={index === pickOptimalIndex(groups)}
            showMenuColumn={showMenuColumn}
            showFormatColumn={showFormatColumn}
          />
        ))}
      </div>
    </>
  );
}

function LandingDinnerScheduleRow({
  group,
  isOptimal,
  showMenuColumn,
  showFormatColumn,
}: {
  group: EventGroup;
  isOptimal: boolean;
  showMenuColumn: boolean;
  showFormatColumn: boolean;
}) {
  const session = group.representative;
  const slot = session.upcomingSlots?.[0];
  const time = resolveSessionTime(session, slot);
  const cruise = resolveCruiseDisplayTitle({ title: group.title, tags: session.tags });
  const shipName = formatShipSecondaryLabel(cruise.shipName);
  const displayTitle = cruise.excursionTitle;
  const menu = extractMenuLabel(session);
  const format = extractFormatLabel(session.tags);
  const badges = deriveLandingCardBadges(session);
  const href = eventHref(session);
  const priceLabel =
    typeof group.priceFrom === 'number' && group.priceFrom >= MIN_DISPLAY_PRICE_RUB
      ? formatLandingBuyPrice(group.priceFrom, group.priceTo)
      : 'Купить';
  const vacant = session.vacant ?? group.vacant;
  const soldOut = typeof vacant === 'number' && vacant <= 0;
  const buyButtonClass =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90';

  return (
    <div className={`rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md md:p-5 ${isOptimal ? 'best-deal-ring' : 'border-border'}`}>
      {isOptimal ? (
        <div className="mb-3 md:hidden">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">⭐ Оптимальный выбор</span>
        </div>
      ) : null}
      <div
        className={`hidden items-center gap-4 md:grid ${dinnerScheduleGridClass(showMenuColumn, showFormatColumn)}`}
      >
        <div className="min-w-0">
          {isOptimal ? <div className="mb-1 text-xs font-bold text-primary">⭐ Оптимальный выбор</div> : null}
          <div className="truncate font-semibold text-foreground">
            <a href={href} className="hover:text-primary">{displayTitle}</a>
          </div>
          {shipName ? <div className="truncate text-sm text-muted-foreground">{shipName}</div> : null}
          <LandingCardBadgeRow badges={badges} className="mt-1.5" />
        </div>
        {showMenuColumn ? <div className="text-sm text-foreground">{menu || 'Не указано'}</div> : null}
        <div className="text-sm font-semibold text-foreground">{priceLabel}</div>
        <div className="text-sm text-foreground">{time}</div>
        {showFormatColumn ? <div className="text-sm text-muted-foreground">{format}</div> : null}
        <div>
          {soldOut ? (
            <button type="button" disabled className="inline-flex cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
              Распродано
            </button>
          ) : (
            <LandingPurchaseButton session={session} label="Билет" className={buyButtonClass} showArrow />
          )}
        </div>
      </div>
      <div className="space-y-2 md:hidden">
        <div className="font-semibold text-foreground">
          <a href={href} className="hover:text-primary">{displayTitle}</a>
        </div>
        {shipName ? <div className="text-sm text-muted-foreground">{shipName}</div> : null}
        <LandingCardBadgeRow badges={badges} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {menu ? <span>{menu}</span> : null}
          <span>{time}</span>
          {showFormatColumn ? <span>{format}</span> : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">{priceLabel}</span>
          {soldOut ? (
            <button type="button" disabled className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
              Распродано
            </button>
          ) : (
            <LandingPurchaseButton session={session} label={priceLabel} className={buyButtonClass} />
          )}
        </div>
      </div>
    </div>
  );
}

function LandingDinnerAudience() {
  const items = [
    { icon: Heart, title: 'Романтическое свидание', text: 'Столик у панорамного окна, закат над Кремлём и живая музыка — идеальный вечер для двоих.' },
    { icon: Cake, title: 'День рождения', text: 'Многие теплоходы предлагают праздничные пакеты: торт, декор, персональное поздравление от капитана.' },
    { icon: Users, title: 'Туристы и гости столицы', text: 'Главные достопримечательности Москвы за одну вечернюю прогулку + ужин из русской кухни.' },
    { icon: Briefcase, title: 'Корпоратив и деловой ужин', text: 'VIP-зоны, отдельные палубы и персональное обслуживание для бизнес-мероприятий.' },
  ];

  return (
    <section className="py-10">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Для кого подойдёт ужин на теплоходе</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingDinnerRiverLink({ cityName, citySlug }: { cityName: string | null; citySlug?: string }) {
  const guide = dinnerCityGuide(cityName, citySlug);
  if (!guide) return null;

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-6">
      <Anchor className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">Ищете обычную речную прогулку без ужина? Посмотрите все варианты:</p>
      </div>
      <a href={guide.riverCruiseHref} className="whitespace-nowrap rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
        {guide.riverCruiseLabel}
      </a>
    </div>
  );
}

function LandingScenarioGuide({
  landing,
  stats,
  groups,
}: {
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
  groups: EventGroup[];
}) {
  const scenario = landingScenario(landing);
  const topCities = topEntries(stats.cities, 4);
  const topVenues = topEntries(stats.venues, 4);
  const firstGroup = groups[0];

  return (
    <section className="border-b border-slate-100 bg-slate-50/70">
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-primary-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {scenario.eyebrow}
          </div>
          <h2 className="mt-3 max-w-4xl text-2xl font-bold text-slate-950">{scenario.title}</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">{scenario.text}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {scenario.cards.map((card) => (
              <div key={card.title} className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <span className="text-primary-600">{card.icon}</span>
                  {card.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {topCities.map(([name, count]) => (
              <button key={name} type="button" onClick={() => scrollToSchedule()} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:text-primary-700">
                {name} · {formatNumber(count)}
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-lg bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <h3 className="text-base font-semibold text-slate-950">{scenario.asideTitle}</h3>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <ScenarioFact icon={<Ticket className="h-4 w-4" />} label="Вариантов" value={formatNumber(stats.events)} />
            <ScenarioFact icon={<CalendarDays className="h-4 w-4" />} label="Ближайших сеансов" value={formatNumber(stats.sessions)} />
            <ScenarioFact icon={<MapPin className="h-4 w-4" />} label="Цена" value={formatMoneyRange(stats.priceFrom, stats.priceTo)} />
          </div>
          {topVenues.length ? (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase text-slate-400">Популярные площадки</div>
              <div className="mt-2 grid gap-2">
                {topVenues.slice(0, 3).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate text-slate-700">{name}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {firstGroup ? (
            <LandingPurchaseButton
              session={firstGroup.representative}
              label="Купить ближайший вариант"
              className="mt-5 inline-flex w-full min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            />
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function ScenarioFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2 text-slate-500">
        <span className="text-primary-600">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function landingScenario(landing: PublicLandingDto) {
  const key = `${landing.slug} ${landing.title} ${landing.subtitle}`.toLowerCase();
  if (key.includes('salute') || key.includes('9') || key.includes('салют')) {
    return {
      eyebrow: 'Праздничный сценарий',
      title: 'Выберите город, место просмотра и удобное время',
      text: 'Для событий вроде салюта важны не только цена и дата, но и точка старта, видимость, длительность программы и то, насколько быстро можно перейти к покупке.',
      asideTitle: 'Быстрая покупка к дате',
      cards: [
        { icon: <CalendarDays className="h-5 w-5" />, title: 'Дата и время', text: 'Фильтр по ближайшим датам помогает не прокручивать десятки одинаковых слотов.' },
        { icon: <MapPin className="h-5 w-5" />, title: 'Точка старта', text: 'Сравнивайте площадки и маршруты, особенно если событие привязано к конкретному виду или району.' },
        { icon: <Ticket className="h-5 w-5" />, title: 'Билет от поставщика', text: 'Оплата остается в официальном виджете, а здесь собрана витрина для быстрого выбора.' },
      ],
    };
  }

  if (isRiverCruisesLandingSlug(landing.slug) || key.includes('bridge') || key.includes('мост') || key.includes('теплоход') || key.includes('речн')) {
    return {
      eyebrow: 'Маршруты и форматы',
      title: 'Сравните прогулки по маршруту, причалу, времени и цене',
      text: 'Для речных прогулок важны причал отправления, длительность, время суток и наличие ближайших рейсов. Поэтому таблица ниже показывает сгруппированные события со слотами, а не сотни одинаковых карточек.',
      asideTitle: 'Что проверить перед покупкой',
      cards: [
        { icon: <MapPin className="h-5 w-5" />, title: 'Причал', text: 'Выбирайте удобную точку отправления и смотрите площадку до перехода в виджет.' },
        { icon: <Clock className="h-5 w-5" />, title: 'Время', text: 'Дневные, вечерние и ночные рейсы лучше сравнивать отдельно, особенно для мостов.' },
        { icon: <Ticket className="h-5 w-5" />, title: 'Цена', text: 'В каталоге показываем цены не ниже 100 рублей, чтобы не подменять основной тариф младенческим.' },
      ],
    };
  }

  return {
    eyebrow: 'Подборка Дайбилет',
    title: 'Сначала отфильтруйте варианты, затем переходите к покупке',
    text: 'Лендинг работает как тематическая витрина: собирает события из импорта, группирует повторы в одну карточку и дает быстрые фильтры по городу, дате, формату и цене.',
    asideTitle: 'Сводка по подборке',
    cards: [
      { icon: <Search className="h-5 w-5" />, title: 'Фильтры', text: 'Город, категория, дата и сортировка помогают быстро сузить выдачу.' },
      { icon: <MapPin className="h-5 w-5" />, title: 'Площадки', text: 'Переходы на страницы площадок и городов усиливают SEO и помогают с навигацией.' },
      { icon: <Shield className="h-5 w-5" />, title: 'Покупка', text: 'Финансовый контур остается у билетной системы, Дайбилет хранит только нужные статусы.' },
    ],
  };
}

function scrollToSchedule() {
  document.getElementById('variants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function LandingEditorialIntro({
  landing,
  stats,
  groups,
}: {
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
  groups: EventGroup[];
}) {
  const topCities = topEntries(stats.cities, 5);
  const topCategories = topEntries(stats.categories, 4);
  const topVenues = topEntries(stats.venues, 4);
  const sample = groups[0]?.representative;

  return (
    <section className="container-page py-10">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase text-primary-700">
            <Sparkles className="h-3.5 w-3.5" />
            Быстрый выбор
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-950">Что есть в подборке</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
            {landing.subtitle} Мы собираем варианты из билетных систем, группируем одинаковые события по карточкам и оставляем покупку в официальном виджете поставщика.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <EditorialFact icon={<TrendingUp className="h-5 w-5" />} title="Варианты" text={`${formatNumber(stats.events)} карточек с расписанием и ценами`} />
            <EditorialFact icon={<MapPin className="h-5 w-5" />} title="География" text={topCities.length ? topCities.map(([name]) => name).join(', ') : 'подборка по доступным городам'} />
            <EditorialFact icon={<Ticket className="h-5 w-5" />} title="Цена" text={formatMoneyRange(stats.priceFrom, stats.priceTo)} />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-950">Советы перед покупкой</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <li className="flex gap-2">
              <Clock className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              Сначала отфильтруйте дату: сегодня, завтра, выходные или вечер.
            </li>
            <li className="flex gap-2">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              Сравните город и площадку: это особенно важно для прогулок, экскурсий и больших мероприятий.
            </li>
            <li className="flex gap-2">
              <Shield className="mt-1 h-4 w-4 shrink-0 text-primary-600" />
              Оплата и билет проходят в виджете билетной системы, Дайбилет хранит только статус и факт покупки.
            </li>
          </ul>
          {sample ? (
            <a href={eventHref(sample)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
              Открыть пример карточки <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <LandingMiniList title="Города" items={topCities} empty="Города появятся после синхронизации" />
        <LandingMiniList title="Форматы" items={topCategories} empty="Форматы появятся после типизации" />
        <LandingMiniList title="Площадки" items={topVenues} empty="Площадки появятся после импорта" />
      </div>
    </section>
  );
}

function EditorialFact({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span className="text-primary-600">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function LandingMiniList({ title, items, empty }: { title: string; items: Array<[string, number]>; empty: string }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map(([name, count]) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Tag className="h-3.5 w-3.5 text-primary-600" />
              {name}
              <span className="text-slate-400">{formatNumber(count)}</span>
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">{empty}</span>
        )}
      </div>
    </section>
  );
}

function LandingHowToChoose({
  landing,
  stats,
  profile = 'default',
  contentPack = null,
}: {
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
  profile?: LandingProfile;
  contentPack?: ReturnType<typeof resolveLandingContentPack>;
}) {
  const key = `${landing.slug} ${landing.title}`.toLowerCase();
  const isRiver = profile === 'bridges' || isRiverCruisesLandingSlug(landing.slug) || key.includes('bridge') || key.includes('мост');
  const topVenues = topEntries(stats.venues, 3).map(([name]) => name).join(', ');
  const packSteps = contentPack?.howToSteps?.length
    ? contentPack.howToSteps.map((step) => ({
        icon: <CheckCircle2 className="h-6 w-6 text-primary" />,
        title: step.title,
        text: step.text,
      }))
    : null;

  const steps =
    packSteps ||
    (isRiver
      ? [
          { icon: <Clock className="h-6 w-6 text-primary" />, title: 'Выберите время', text: 'Самые зрелищные рейсы стартуют в 23:30-00:30, когда мосты разводятся один за другим.' },
          { icon: <MapPin className="h-6 w-6 text-primary" />, title: 'Определите причал', text: topVenues ? `Популярные: ${topVenues}. Ближайший к вам причал сэкономит время.` : 'Выберите удобную точку отправления на набережной.' },
          { icon: <Ship className="h-6 w-6 text-primary" />, title: 'Сравните теплоходы', text: 'Обратите внимание на вместимость, наличие крытой палубы и бортового кафе.' },
          { icon: <Wallet className="h-6 w-6 text-primary" />, title: 'Сравните цены', text: `Цены ${formatMoneyRange(stats.priceFrom, stats.priceTo)}. Смотрите маршрут, причал и комфорт борта.` },
        ]
      : [
          { icon: <Clock className="h-6 w-6 text-primary" />, title: 'Выберите дату', text: 'Используйте фильтры «сегодня», «завтра» и «вечером» для быстрого поиска.' },
          { icon: <MapPin className="h-6 w-6 text-primary" />, title: 'Уточните город', text: Object.keys(stats.cities).length > 1 ? 'Начните с города, затем сравните площадки и маршруты.' : 'Проверьте адрес старта и удобство маршрута.' },
          { icon: <Ticket className="h-6 w-6 text-primary" />, title: 'Сверьте формат', text: 'Читайте возраст, длительность и что входит в билет до оплаты.' },
          { icon: <Wallet className="h-6 w-6 text-primary" />, title: 'Сравните цены', text: `В подборке ${formatMoneyRange(stats.priceFrom, stats.priceTo)}. Оплата - в виджете организатора.` },
        ]);

  const title = contentPack?.howToTitle || (isRiver ? 'Как выбрать прогулку' : 'Как выбрать событие');
  const lead = contentPack?.howToLead || (isRiver ? '4 простых шага к идеальному рейсу' : '4 простых шага к удобной покупке');

  return (
    <section id="how-to-choose" className="py-16">
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
      <p className="mb-10 text-center text-muted-foreground">{lead}</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-md">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">{step.icon}</div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Шаг {index + 1}</div>
            <h3 className="mb-2 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingAttentionChecklist({ title, items }: { title: string; items: string[] }) {
  return (
    <section id="attention-checklist" className="py-12">
      <div className="mb-6 flex items-center justify-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
      </div>
      <ul className="mx-auto grid max-w-3xl gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LandingFaq({
  landing,
  blocks,
  profile,
  citySlug,
  landingSlug,
  contentPack = null,
}: {
  landing: PublicLandingDto;
  blocks: LandingContentBlock[];
  profile: LandingProfile;
  citySlug?: string;
  landingSlug?: string;
  contentPack?: ReturnType<typeof resolveLandingContentPack>;
}) {
  const slugKey = landingSlug || landing.slug;
  const items = resolveLandingFaqItems({ slug: slugKey, profile, citySlug, blocks });
  const seasonalMeta = profile === 'seasonal' ? getSeasonalLanding(slugKey) : null;
  const faqSubtitle = contentPack?.faqSubtitle
    ? contentPack.faqSubtitle
    : profile === 'dinner'
    ? 'Ответы на популярные вопросы об ужинах на теплоходе'
    : profile === 'bus'
      ? 'Ответы на популярные вопросы об автобусных экскурсиях'
      : profile === 'bridges'
        ? BRIDGES_LANDING.faqSubtitle
      : profile === 'seasonal' && seasonalMeta
        ? seasonalMeta.faqSubtitle
        : profile === 'river' || landing.slug.toLowerCase().includes('bridge')
          ? resolveLandingCityName(citySlug)
            ? 'Ответы на популярные вопросы о речных прогулках'
            : 'Ответы на популярные вопросы о речных прогулках'
          : `Ответы на популярные вопросы о ${landing.title.toLowerCase()}`;

  return (
    <section id="faq" className="py-16">
      <h2 className="mb-2 text-center text-2xl font-bold text-slate-900 md:text-3xl">Частые вопросы</h2>
      <p className="mb-10 text-center text-slate-600">{faqSubtitle}</p>
      <div className="mx-auto max-w-3xl space-y-2">
        {items.map((item, index) => {
          // items is typed as { question, answer }, but these guards also accept the
          // legacy { title, text } shape. Read through a widened view so both
          // shapes type-check.
          const faqItem = item as { question?: string; answer?: string; title?: string; text?: string };
          const question = String(faqItem.question || faqItem.title);
          const answer = String(faqItem.answer || faqItem.text);
          return (
            <details
              key={`${question}:${index}`}
              className="group rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
            >
              <summary className="flex cursor-pointer list-none select-none items-center justify-between p-4">
                <span className="flex items-center gap-2 pr-4 text-sm font-medium text-slate-900">
                  <HelpCircle className="h-4 w-4 shrink-0 text-primary-600" />
                  {question}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              {answer ? <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{answer}</div> : null}
            </details>
          );
        })}
      </div>
    </section>
  );
}

function LandingContentBlocks({
  blocks,
  landing,
  stats,
}: {
  blocks: LandingContentBlock[];
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
}) {
  if (!blocks.length) return null;
  const sorted = [...blocks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="container-page grid gap-5 py-7">
        {sorted.map((block) => (
          <LandingContentBlock key={block.id || `${block.type}:${block.sortOrder}`} block={block} landing={landing} stats={stats} />
        ))}
      </div>
    </div>
  );
}

function LandingContentBlock({
  block,
  landing,
  stats,
}: {
  block: LandingContentBlock;
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
}) {
  if (block.type === 'TRUST_BADGES') return <TrustBadgesBlock block={block} />;
  if (block.type === 'VALUE_PROPS' || block.type === 'HIGHLIGHTS' || block.type === 'INFO_ICONS') return <ValuePropsBlock block={block} />;
  if (block.type === 'CITY_GRID') return <CityGridBlock block={block} />;
  if (block.type === 'FAQ') return null;
  if (block.type === 'CTA_BANNER') return <CtaBlock block={block} landing={landing} stats={stats} />;
  if (block.type === 'STORY' || block.type === 'SEO_TEXT' || block.type === 'RAW_RICH_TEXT') return <StoryBlock block={block} />;
  return <StoryBlock block={block} />;
}

function TrustBadgesBlock({ block }: { block: LandingContentBlock }) {
  const items = blockItems(block);
  if (!items.length) return null;
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.title}:${index}`} className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <CheckCircle2 className="h-4 w-4 text-primary-600" />
            {item.title}
          </div>
          {item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p> : null}
        </div>
      ))}
    </section>
  );
}

function ValuePropsBlock({ block }: { block: LandingContentBlock }) {
  const items = blockItems(block);
  return (
    <section className="grid gap-4 rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <BlockHeader block={block} />
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.slice(0, 6).map((item, index) => (
            <div key={`${item.title}:${index}`} className="rounded-lg bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">{item.title}</div>
              {item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CityGridBlock({ block }: { block: LandingContentBlock }) {
  const items = blockItems(block);
  if (!items.length) return null;
  return (
    <section className="grid gap-4 rounded-xl bg-slate-950 p-5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
      <BlockHeader block={block} tone="dark" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <a key={`${item.title}:${index}`} href={`/?city=${encodeURIComponent(item.title)}`} className="rounded-lg bg-white/10 p-4 transition hover:bg-white/15">
            <div className="font-semibold">{item.title}</div>
            <div className="mt-1 text-sm text-white/65">{formatNumber(Number(item.count || 0))} событий</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function StoryBlock({ block }: { block: LandingContentBlock }) {
  if (!block.title && !block.subtitle && !block.body) return null;
  return (
    <section className="grid gap-3 py-2 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        {block.eyebrow ? <div className="text-xs font-bold uppercase text-primary-700">{block.eyebrow}</div> : null}
        {block.title ? <h2 className="mt-1 text-2xl font-bold text-slate-950">{block.title}</h2> : null}
      </div>
      <div>
        {block.subtitle ? <p className="text-base font-medium leading-7 text-slate-700">{block.subtitle}</p> : null}
        {block.body ? <p className="mt-2 text-sm leading-7 text-slate-600">{block.body}</p> : null}
      </div>
    </section>
  );
}

function FaqBlock({ block }: { block: LandingContentBlock }) {
  const items = blockItems(block);
  if (!items.length) return null;
  return (
    <section className="grid gap-4 rounded-xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <BlockHeader block={block} fallbackTitle="Частые вопросы" />
      <div className="grid gap-2">
        {items.map((item, index) => (
          <details key={`${item.question}:${index}`} className="rounded-lg bg-slate-50 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-950">
              <HelpCircle className="h-4 w-4 text-primary-600" />
              {item.question || item.title}
            </summary>
            {item.answer || item.text ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer || item.text}</p> : null}
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaBlock({
  block,
  landing,
  stats,
}: {
  block: LandingContentBlock;
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
}) {
  return (
    <section className="rounded-xl bg-primary-600 p-5 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-white/70">{block.eyebrow || 'К покупке'}</div>
          <h2 className="mt-1 text-2xl font-bold">{block.title || landing.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{block.body || `Доступно ${formatNumber(stats.events)} вариантов. Отфильтруйте дату, город и цену в таблице ниже.`}</p>
        </div>
        <a href="#variants" className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary hover:bg-primary/10">
          Выбрать билет
        </a>
      </div>
    </section>
  );
}

function BlockHeader({ block, fallbackTitle, tone = 'light' }: { block: LandingContentBlock; fallbackTitle?: string; tone?: 'light' | 'dark' }) {
  const muted = tone === 'dark' ? 'text-white/65' : 'text-slate-500';
  return (
    <div>
      {block.eyebrow ? <div className={`text-xs font-bold uppercase ${tone === 'dark' ? 'text-white/60' : 'text-primary-700'}`}>{block.eyebrow}</div> : null}
      {block.title || fallbackTitle ? <h2 className="text-2xl font-bold">{block.title || fallbackTitle}</h2> : null}
      {block.subtitle ? <p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>{block.subtitle}</p> : null}
    </div>
  );
}

function blockItems(block: LandingContentBlock): Array<Record<string, string | number>> {
  const items = block.payload?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      title: String(item.title ?? ''),
      text: String(item.text ?? ''),
      question: String(item.question ?? ''),
      answer: String(item.answer ?? ''),
      count: typeof item.count === 'number' ? item.count : Number(item.count || 0),
    }))
    .filter((item) => item.title || item.question);
}

function LandingFilters({
  profile,
  landingSlug,
  landingCity,
  citySlug,
  stats,
  city,
  category,
  dateFilter,
  sort,
  timeSlot,
  groupsCount,
  setCity,
  setCategory,
  setDateFilter,
  setSort,
  setTimeSlot,
  hideSort = false,
}: {
  profile: LandingProfile;
  landingSlug?: string;
  landingCity?: string | null;
  citySlug?: string;
  stats: PublicLandingPageDto['stats'];
  city: string;
  category: string;
  dateFilter: DateFilter;
  sort: SortFilter;
  timeSlot: TimeSlotFilter;
  groupsCount: number;
  setCity: (value: string) => void;
  setCategory: (value: string) => void;
  setDateFilter: (value: DateFilter) => void;
  setSort: (value: SortFilter) => void;
  setTimeSlot: (value: TimeSlotFilter) => void;
  reset: () => void;
  hideSort?: boolean;
}) {
  const isBus = profile === 'bus';
  const isRiver = profile === 'river';
  const isBridges = profile === 'bridges';
  const isSeasonal = profile === 'seasonal';
  // Hide time slot when only one slot is meaningful (e.g. bridges → night only).
  const hasMultipleTimeSlots = !isBridges;
  const showTimeSlot = (profile === 'bus' || profile === 'river' || isSeasonal || isBridges) && hasMultipleTimeSlots;
  const currentCityName = resolveLandingCityName(citySlug);
  const cityOptions = Object.entries(stats.cities).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const switchItems =
    landingSlug && !isBridges ? resolveLandingCitySwitchItems(landingSlug, profile) : [];
  const orderedCityNames = switchItems.length
    ? switchItems.map((item) => item.name)
    : isSeasonal && landingSlug
      ? resolveSeasonalCityNames(landingSlug, cityOptions)
      : cityOptions.map(([name]) => name);
  const meaningfulCityCount = Object.keys(stats.cities).filter(
    (name) => name && !/^не указан$/i.test(name.trim()),
  ).length;
  // Multi-city ЧПУ: always offer switch (even on /…/moscow) - not intentional to hide on mobile/city pages.
  // National non-multi: only when payload has several cities and landing is not city-locked.
  const showCityFilter = isBridges
    ? false
    : switchItems.length > 1
      ? true
      : !landingCity && meaningfulCityCount > 1;
  // Show max4 city chips inline; overflow into "Ещё N" dropdown.
  const MAX_INLINE_CITIES = 4;
  const visibleCityNames = orderedCityNames.slice(0, MAX_INLINE_CITIES);
  const overflowCityNames = orderedCityNames.slice(MAX_INLINE_CITIES);
  const sortTabs: Array<{ label: string; value: SortFilter }> = isBus || isRiver || isSeasonal
    ? [
        { label: 'По цене', value: 'price' },
        { label: 'По рейтингу', value: 'rating' },
        { label: 'По времени', value: 'time' },
      ]
    : [
        { label: 'По времени', value: 'time' },
        { label: 'По цене', value: 'price' },
        { label: 'По рейтингу', value: 'rating' },
      ];
  const eventWindow = landingSlug ? resolveLandingEventWindow(landingSlug) : null;
  const dateChips = resolveLandingDateChips({
    profile,
    landingSlug,
    eventWindow,
    isSeasonal: isSeasonal || isBus || isRiver || isBridges,
  });
  const countLabel = isBus && currentCityName ? 'экскурсий' : isBus ? 'экскурсий' : isRiver && currentCityName ? 'прогулок' : isSeasonal ? 'программ' : 'рейсов';

  const timeSlotSelect = (
    <select
      value={timeSlot || 'all'}
      onChange={(event) => setTimeSlot(event.target.value === 'all' ? '' : (event.target.value as TimeSlotFilter))}
      className="inline-btn h-9 w-[170px] rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="all">Любое время</option>
      {!isBridges ? <option value="morning">Утро (до 12:00)</option> : null}
      {!isBridges ? <option value="day">День (12–18)</option> : null}
      {!isBridges ? <option value="evening">Вечер (18–22)</option> : null}
      <option value="night">Ночь (после 22)</option>
    </select>
  );

  const selectCity = (value: string) => {
    if (isBus && landingSlug) {
      if (value === 'all') {
        window.location.href = busLandingRoot(landingSlug);
        return;
      }
      const slugKey = citySlugByName(value) || BUS_CITY_META[value]?.slug;
      if (slugKey && value !== currentCityName) {
        window.location.href = busLandingHref(slugKey);
        return;
      }
    }
    if (isRiver && landingSlug) {
      if (value === 'all') {
        window.location.href = riverLandingRoot(landingSlug);
        return;
      }
      const slugKey = citySlugByName(value) || riverCityGuide(value)?.slug;
      if (slugKey && value !== currentCityName) {
        window.location.href = riverLandingHref(slugKey);
        return;
      }
    }
    if (isSeasonal && landingSlug) {
      if (value === 'all') {
        window.location.href = seasonalLandingRoot(landingSlug);
        return;
      }
      const slugKey = seasonalCityGuide(landingSlug, value)?.slug;
      if (slugKey && value !== currentCityName) {
        window.location.href = landingCategoryHref(landingSlug, slugKey);
        return;
      }
    }
    // Остальные MULTI_CITY ЧПУ (выставки, стендап, экскурсии…): смена города = смена URL.
    const multiCitySlug = landingSlug ? canonicalLandingSlug(landingSlug) : '';
    if (multiCitySlug && MULTI_CITY_LANDING_SLUGS.has(multiCitySlug)) {
      if (value === 'all') {
        window.location.href = landingCategoryHref(landingSlug!);
        return;
      }
      const slugKey =
        citySlugByName(value) ||
        normalizeKnownCitySlug(value) ||
        normalizeCitySlug(value);
      if (slugKey) {
        if (value === currentCityName && citySlug && normalizeKnownCitySlug(citySlug) === normalizeKnownCitySlug(slugKey)) {
          return;
        }
        window.location.href = landingCategoryHref(landingSlug!, slugKey);
        return;
      }
    }
    setCity(value);
  };

  const isConcerts = landingSlug ? isConcertsGenreLanding(landingSlug) : false;
  const genreChip = (value: string, label: string, active: boolean) => (
    <button
      key={value}
      type="button"
      onClick={() => setCategory(value)}
      className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
      }`}
    >
      {label}
    </button>
  );
  const genreChipRow = isConcerts ? (
    <>
      <div className="mx-1 h-6 w-px bg-border" />
      {genreChip('all', 'Все жанры', category === 'all')}
      {CONCERT_GENRE_CHIP_TAGS.map((tag) => genreChip(tag, tag, category === tag))}
    </>
  ) : null;

  const cityChip = (value: string, label: string, active: boolean) => (
    <button
      key={value}
      type="button"
      onClick={() => selectCity(value)}
      className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="sticky top-[var(--site-header-height)] z-20 -mx-1 space-y-3 rounded-xl border border-border/70 bg-background/95 px-3 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:space-y-4">
      <LandingFilterRow
        dateChips={dateChips}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        showCityFilter={showCityFilter}
        cityChip={cityChip}
        visibleCityNames={visibleCityNames}
        overflowCityNames={overflowCityNames}
        city={city}
        selectCity={selectCity}
        showTimeSlot={showTimeSlot}
        timeSlotSelect={timeSlotSelect}
        genreChipRow={genreChipRow}
        category={category}
        setCategory={setCategory}
        categories={stats.categories}
        sort={sort}
        setSort={(v) => setSort(v as SortFilter)}
        sortTabs={sortTabs}
        hideSort={hideSort}
      />
      </div>

      <div className="mb-4 mt-2 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{formatNumber(groupsCount)} {countLabel}</span>
        <span className="text-xs font-medium text-primary">⭐ Оптимальный выбор выделен</span>
      </div>
    </div>
  );
}