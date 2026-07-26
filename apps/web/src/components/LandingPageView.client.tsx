'use client';

import * as React from 'react';
import { Anchor, ArrowRight, Briefcase, Bus, Cake, CalendarDays, CheckCircle2, ChevronDown, Clock, Eye, Headphones, Heart, HelpCircle, Lightbulb, Mail, MapPin, Mic, Moon, Music, Quote, Search, Shield, Ship, Sparkles, Star, Sun, Tag, Ticket, TrendingUp, Users, UtensilsCrossed, Wallet } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { BridgesLandingGuide, BridgesShipChecklist } from '@/components/landing/BridgesLandingGuide.client';
import {
  BridgesComparisonTable,
  BridgesHeroBlock,
  BridgesMobileStickyCta,
  BridgesScheduleStrip,
  BridgesTonightTips,
} from '@/components/landing/BridgesLandingSelling.client';
import { BridgesScheduleSection } from '@/components/landing/BridgesScheduleSection.client';
import { LandingCityLocations } from '@/components/landing/LandingCityLocations.client';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { LandingStickyHeader } from '@/components/landing/LandingStickyHeader.client';
import { LandingCardBadgeRow } from '@/components/landing/LandingCardBadgeRow';
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
  landingCategoryHref,
  landingPageHref,
  MULTI_CITY_LANDING_SLUGS,
  normalizeCitySlug,
  normalizeKnownCitySlug,
  partyLandingHref,
  resolveConcertGenreTag,
  riverLandingHref,
} from '@/lib/landing-routes';
import {
  filterUpcomingBridgeGroups,
  mapBridgesGroups,
  pickComparisonRows,
} from '@/lib/bridges-session-utils';
import { resolveLandingCopy, shouldUseLandingCopy } from '@/lib/landing-copy';
import { applyLandingSeoMeta, resolveLandingSeo, useLandingTodayReference } from '@/lib/landing-seo';
import { buildCategoryCityListingMeta } from '@/lib/seo-listing-meta';
import { LandingSeoBottom, landingBlocksHaveSeoText } from '@/components/LandingSeoBottom.client';
import { LandingSeeAlso } from '@/components/LandingSeeAlso';
import { LandingThinRelatedCards } from '@/components/LandingThinRelatedCards';
import { resolveRelatedListingLinks } from '@/lib/seo-internal-links';
import { buildBridgesProductJsonLd } from '@/lib/bridges-seo';
import { formatLandingTodayIso, formatLandingTodayLong } from '@/lib/datetime';
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
import { formatMoney, formatNumber } from '@/lib/format';
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
import { formatVacantSeats } from '@/lib/event-page-utils';
import { eventHref, sessionVenueHref } from '@/lib/routes';
import type { PublicLandingDto, PublicLandingPageDto, PublicSessionDto } from '@daibilet/contracts/public';

type LandingContentBlock = NonNullable<PublicLandingPageDto['blocks']>[number];

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'evening';
type SortFilter = 'price' | 'rating' | 'time';
type ViewMode = 'list' | 'table' | 'cards';
type LandingProfile = 'bus' | 'dinner' | 'river' | 'seasonal' | 'bridges' | 'default';
type MenuFilter = 'all' | 'set' | 'buffet';
type DinnerTimeFilter = 'all' | 'sunset' | 'night';
type DinnerBadgeFilter = LandingCardBadgeId | 'all';
type TimeSlotFilter = '' | 'morning' | 'day' | 'evening' | 'night';
const MIN_DISPLAY_PRICE_RUB = 100;

const LANDING_CITY_SLUGS: Record<string, string> = {
  moscow: 'Москва',
  moskva: 'Москва',
  msk: 'Москва',
  spb: 'Санкт-Петербург',
  'saint-petersburg': 'Санкт-Петербург',
  'sankt-peterburg': 'Санкт-Петербург',
  kazan: 'Казань',
  'nizhny-novgorod': 'Нижний Новгород',
  'nizhniy-novgorod': 'Нижний Новгород',
  samara: 'Самара',
  volgograd: 'Волгоград',
  yaroslavl: 'Ярославль',
  krasnoyarsk: 'Красноярск',
  perm: 'Пермь',
  novosibirsk: 'Новосибирск',
  tver: 'Тверь',
  rostov: 'Ростов-на-Дону',
  'rostov-on-don': 'Ростов-на-Дону',
  sochi: 'Сочи',
  kaliningrad: 'Калининград',
  ekaterinburg: 'Екатеринбург',
  'rostov-na-donu': 'Ростов-на-Дону',
};

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

type BusCitySpot = { title: string; badge: string; badgeTone?: 'ticket' | 'free'; description: string };
type BusCityGuide = { intro: string; heroSubtitle: string; spots: BusCitySpot[]; tips: string[] };

const BUS_CITY_GUIDES: Partial<Record<string, BusCityGuide>> = {
  'Санкт-Петербург': {
    intro: 'Петербург — город, созданный для обзорных экскурсий. Автобусные туры охватывают Невский проспект, Дворцовую площадь, Исаакиевский собор, Петропавловскую крепость и пригороды (Петергоф, Пушкин). Ночные рейсы с разводными мостами — отдельный жанр.',
    heroSubtitle: 'Невский проспект, Эрмитаж, Петропавловка и белые ночи — классика с комфортом.',
    spots: [
      { title: 'Классический обзорный', badge: 'Билет', badgeTone: 'ticket', description: 'Невский → Дворцовая → Исаакий → Петропавловка. 2.5–3 часа.' },
      { title: 'Ночной Петербург + мосты', badge: 'Билет', badgeTone: 'ticket', description: 'Подсветка + остановка у разводного моста. После 23:00.' },
      { title: 'Петергоф / Пушкин', badge: 'Билет', badgeTone: 'ticket', description: 'Загородная экскурсия на полдня.' },
      { title: 'Маршрут автобуса №7', badge: 'Бесплатно', badgeTone: 'free', description: 'Общественный транспорт по Невскому — бесплатная альтернатива.' },
    ],
    tips: [
      'Ночной рейс с мостами — бронируйте за неделю в сезон белых ночей',
      'Петергоф лучше посещать в будни — меньше очередей',
      'Двухэтажный автобус ходит по Невскому — отличные фото',
      'Тёплая одежда нужна даже летом для ночных рейсов',
    ],
  },
  Москва: {
    intro: 'Москва за один день: от Красной площади до Москва-Сити. Автобусные туры — лучший способ увидеть масштаб столицы без долгих переходов.',
    heroSubtitle: 'Кремль, Воробьёвы горы, Сити и Храм Христа Спасителя — всё в одной поездке.',
    spots: [
      { title: 'Классический обзорный', badge: 'Билет', badgeTone: 'ticket', description: 'Красная площадь → Воробьёвы горы → Сити. 3 часа.' },
      { title: 'Hop-on/Hop-off', badge: 'Билет', badgeTone: 'ticket', description: 'Целый день по фиксированным остановкам.' },
    ],
    tips: ['Берите утренний рейс — меньше пробок', 'Двухэтажный автобус — лучший обзор с верхней палубы'],
  },
};

function busCityGuide(cityName: string | null): BusCityGuide | null {
  if (!cityName) return null;
  return BUS_CITY_GUIDES[cityName] || {
    intro: `Обзорные автобусные экскурсии в ${cityName}: сравните маршруты, цены и расписание на сегодня.`,
    heroSubtitle: `Главные достопримечательности ${cityName} — с комфортом и аудиогидом.`,
    spots: [],
    tips: ['Бронируйте заранее в высокий сезон', 'Проверяйте точку посадки на карточке экскурсии'],
  };
}

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

type DinnerCityGuide = {
  heroTitle: string;
  heroSubtitle: string;
  breadcrumbCurrent: string;
  introTitle: string;
  introText: string;
  scheduleTitle: string;
  riverCruiseHref: string;
  riverCruiseLabel: string;
};

const DINNER_CITY_GUIDES: Partial<Record<string, DinnerCityGuide>> = {
  Москва: {
    heroTitle: 'Ужин на теплоходе по Москве-реке сегодня — цены и расписание',
    heroSubtitle: 'Сравните рестораны на воде и выберите лучший вечерний круиз по Москве-реке.',
    breadcrumbCurrent: 'Ужин на теплоходе — Москва',
    introTitle: 'Ужин на теплоходе — ресторан с видом на Кремль',
    introText:
      'Москва-река — идеальная декорация для вечернего ужина. Вы проплываете мимо Кремля, Храма Христа Спасителя и Москва-Сити, пока шеф-повар готовит блюда на борту. Это не просто прогулка — это полноценный ресторанный опыт на воде: от сет-меню из 5 блюд до фуршетов с живой музыкой.',
    scheduleTitle: 'Теплоходы с ужином — Москва',
    riverCruiseHref: riverLandingHref('moscow'),
    riverCruiseLabel: 'Все речные прогулки по Москве',
  },
  'Санкт-Петербург': {
    heroTitle: 'Ужин на теплоходе по Неве сегодня — цены и расписание',
    heroSubtitle: 'Сравните рестораны на воде и выберите лучший вечерний круиз по Неве.',
    breadcrumbCurrent: 'Ужин на теплоходе — Санкт-Петербург',
    introTitle: 'Ужин на теплоходе — ресторан с видом на разводные мосты',
    introText:
      'Нева вечером — лучший фон для ужина на воде. Панорамные окна, живая музыка и подсветка дворцов создают атмосферу, которую не повторить в обычном ресторане.',
    scheduleTitle: 'Теплоходы с ужином — Санкт-Петербург',
    riverCruiseHref: riverLandingHref('saint-petersburg'),
    riverCruiseLabel: 'Все речные прогулки по Петербургу',
  },
};

function dinnerCityGuide(cityName: string | null, citySlug?: string): DinnerCityGuide | null {
  if (!cityName) return null;
  if (DINNER_CITY_GUIDES[cityName]) return DINNER_CITY_GUIDES[cityName]!;
  const slugKey = citySlug || citySlugByName(cityName) || 'moscow';
  return {
    heroTitle: `Ужин на теплоходе в ${cityName} — цены и расписание`,
    heroSubtitle: `Сравните рестораны на воде и выберите лучший вечерний круиз в ${cityName}.`,
    breadcrumbCurrent: `Ужин на теплоходе — ${cityName}`,
    introTitle: `Ужин на теплоходе в ${cityName}`,
    introText: `Вечерний круиз с ужином на борту — удобный способ совместить гастрономию и обзор города с воды.`,
    scheduleTitle: `Теплоходы с ужином — ${cityName}`,
    riverCruiseHref: riverCruiseCityHref(slugKey),
    riverCruiseLabel: `Все речные прогулки в ${cityName}`,
  };
}

function matchesMenuFilter(session: PublicSessionDto, menu: MenuFilter): boolean {
  if (menu === 'all') return true;
  const text = [session.title, session.category, ...(session.tags || [])].join(' ').toLowerCase();
  if (menu === 'set') return /сет|set-menu|дегуста/i.test(text);
  if (menu === 'buffet') return /фуршет|buffet/i.test(text);
  return true;
}

function matchesDinnerTimeFilter(session: PublicSessionDto, filter: DinnerTimeFilter): boolean {
  if (filter === 'all') return true;
  if (!session.startsAt) return true;
  const hour = getSessionHour(session.startsAt, resolveSessionTimeZoneForSession(session));
  if (filter === 'sunset') return hour >= 18 && hour < 21;
  if (filter === 'night') return hour >= 21;
  return true;
}

function extractMenuLabel(tags: string[]): string {
  const text = (tags || []).join(' ').toLowerCase();
  if (/фуршет/i.test(text)) return 'Фуршет';
  if (/сет/i.test(text)) return 'Сет-меню';
  return 'Ужин';
}

function extractFormatLabel(tags: string[]): string {
  const text = (tags || []).join(' ').toLowerCase();
  if (/vip/i.test(text)) return 'VIP';
  if (/романт/i.test(text)) return 'Романтика';
  if (/корпоратив/i.test(text)) return 'Корпоратив';
  return 'Стандарт';
}

function resolveLandingCityPrep(cityName: string | null, profile: LandingProfile, landingSlug: string): string | null {
  if (!cityName) return profile === 'bus' || profile === 'river' ? 'России' : null;
  if (profile === 'bus') return BUS_CITY_META[cityName]?.prepositional || cityName;
  if (profile === 'river') return riverCityGuide(cityName)?.cityNameDative || cityName;
  if (profile === 'seasonal') {
    return seasonalCityGuide(landingSlug, cityName)?.cityNameDative || cityName;
  }
  return cityName;
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

function filterSessionsByCity(sessions: PublicSessionDto[], cityName: string | null): PublicSessionDto[] {
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
    const prep = riverGuide?.cityNameDative || cityName || 'России';
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

function finalizeLandingPayload(payload: PublicLandingPageDto, slug: string, cityName: string | null): PublicLandingPageDto {
  const sessions = filterSessionsByCity(payload.sessions, cityName);
  return {
    ...payload,
    landing: payload.landing.slug === slug ? payload.landing : { ...payload.landing, slug },
    sessions,
    stats: buildLandingStats(sessions),
  };
}

const EMPTY_LANDING_STATS: PublicLandingPageDto['stats'] = {
  events: 0,
  sessions: 0,
  cities: {},
  categories: {},
  venues: {},
  priceFrom: null,
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

function readLandingGenreFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const genre = resolveConcertGenreTag(params.get('genre') || params.get('tag'));
  return genre || 'all';
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
}: {
  slug: string;
  citySlug?: string;
  initialPayload: PublicLandingPageDto;
  genre?: string | null;
  thinRelatedSessions?: PublicSessionDto[];
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
  const [category, setCategory] = React.useState(() => resolveConcertGenreTag(initialGenre) || 'all');
  const [dateFilter, setDateFilter] = React.useState<DateFilter>(defaultLandingDateFilter(profile));
  const [sort, setSort] = React.useState<SortFilter>(profile === 'bus' || profile === 'dinner' ? 'price' : 'time');
  const [menuFilter, setMenuFilter] = React.useState<MenuFilter>('all');
  const [dinnerTimeFilter, setDinnerTimeFilter] = React.useState<DinnerTimeFilter>('all');
  const [dinnerBadgeFilter, setDinnerBadgeFilter] = React.useState<DinnerBadgeFilter>('all');
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
    setDateFilter(defaultLandingDateFilter(nextProfile));
    setMenuFilter('all');
    setDinnerTimeFilter('all');
    setDinnerBadgeFilter('all');
    setTimeSlot('');
    setCategory(resolveConcertGenreTag(initialGenre) || 'all');
    setApiPayload(initialCachedPayload);
    setSessionsError(null);
    setIsSessionsLoading(!initialCachedPayload?.sessions?.length);
  }, [slug, citySlug, initialCachedPayload]);

  React.useEffect(() => {
    // SSR already hydrated the landing — do not force a no-store remount fetch.
    if (initialCachedPayload?.landing) {
      setApiPayload(initialCachedPayload);
      setIsSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    setIsSessionsLoading(true);
    setSessionsError(null);
    fetch(`/api/public/landings/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as PublicLandingPageDto | null;
      })
      .then((data) => {
        if (disposed) return;
        if (data?.landing) {
          const resolved = finalizeLandingPayload(data, slug, resolveLandingCityName(citySlug, slug));
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
    if (!isConcertsGenreLanding(slug)) return;
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('genre');
    else url.searchParams.set('genre', category);
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
        })
      : null;
    applyLandingSeoMeta({
      ...seoInput,
      canonicalPath,
      breadcrumbItems:
        profile === 'bridges'
          ? [
              { name: 'Главная', path: '/' },
              { name: 'Санкт-Петербург', path: '/cities/saint-petersburg' },
              { name: 'Разводные мосты', path: canonicalPath },
            ]
          : undefined,
      faqItems: profile === 'bridges' ? BRIDGES_LANDING.faq : undefined,
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
    if (listingMeta && typeof document !== 'undefined') {
      document.title = listingMeta.title;
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', listingMeta.description);
    }
  }, [payload?.landing, payload?.stats, slug, profile, citySlug, todayReference]);

  const filteredSessions = React.useMemo(() => {
    if (!payload || !sessionsReady) return [];

    return payload.sessions.filter((session) => {
      if (!session.startsAt && !isOpenDate(session)) return false;
      if (city !== 'all' && !sessionMatchesCity(session, city)) return false;
      if (category !== 'all' && session.category !== category && !session.tags.includes(category)) return false;
      if (profile === 'dinner' && !matchesMenuFilter(session, menuFilter)) return false;
      if (profile === 'dinner' && !matchesDinnerTimeFilter(session, dinnerTimeFilter)) return false;
      if (profile === 'dinner' && !sessionMatchesLandingBadge(session, dinnerBadgeFilter)) return false;
      if ((profile === 'bus' || profile === 'river' || profile === 'seasonal' || profile === 'bridges') && !matchesTimeSlotFilter(session, timeSlot)) return false;
      if (profile !== 'bridges' && !matchesDateFilter(session, dateFilter)) return false;
      return true;
    });
  }, [category, city, dateFilter, menuFilter, dinnerTimeFilter, dinnerBadgeFilter, timeSlot, payload, profile, sessionsReady]);

  const allGroups = React.useMemo(
    () => (payload && sessionsReady ? groupLandingSessions(payload.sessions) : []),
    [payload, sessionsReady],
  );
  const groups = React.useMemo(() => sortEventGroups(groupLandingSessions(filteredSessions), sort), [filteredSessions, sort]);
  const cityName = resolveLandingCityName(citySlug, slug);
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
            bridgesHeroActions={
              profile === 'bridges' ? (
                <BridgesHeroBlock
                  priceFrom={payload.stats.priceFrom ?? null}
                  priceTo={payload.stats.priceTo ?? null}
                  visibleCount={allGroups.length}
                  soldEstimate={Math.max(allGroups.length * 1850, payload.sessions.length * 420)}
                  sessionsReady={sessionsReady}
                  onPickTour={() => scrollToSchedule()}
                  onViewSchedule={() => document.getElementById('bridges-lift-schedule')?.scrollIntoView({ behavior: 'smooth' })}
                />
              ) : undefined
            }
          />
          {profile === 'bridges' ? <BridgesScheduleStrip /> : null}
          {profile === 'bridges' ? <BridgesTonightTips /> : null}
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
                ? `${seasonalMeta.scheduleTitle} — ${cityName}`
                : seasonalMeta.scheduleTitle
              : cityName
                ? `Расписание событий — ${cityName}`
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
                badgeFacets={collectLandingBadgeFacets(payload.sessions)}
                setDateFilter={setDateFilter}
                setSort={setSort}
                setMenuFilter={setMenuFilter}
                setDinnerTimeFilter={setDinnerTimeFilter}
                setDinnerBadgeFilter={setDinnerBadgeFilter}
                reset={() => {
                  setDateFilter('all');
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
              reset={() => {
                setCity(cityName || 'all');
                setCategory('all');
                setDateFilter(defaultLandingDateFilter(profile));
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
              <LandingDinnerScheduleList groups={groups} onReset={() => {
                setDateFilter('today');
                setSort('price');
                setMenuFilter('all');
                setDinnerTimeFilter('all');
                setDinnerBadgeFilter('all');
                setCategory('all');
              }} />
            ) : profile === 'bridges' ? (
              <BridgesScheduleSection groups={groups} sort={sort} setSort={setSort} />
            ) : (
            <LandingScheduleList groups={groups} profile={profile} />
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
            {profile === 'default' || profile === 'bridges' ? (
              <LandingHowToChoose landing={payload.landing} stats={payload.stats} profile={profile} />
            ) : null}
            <LandingFaq landing={payload.landing} blocks={payload.blocks || []} profile={profile} citySlug={citySlug} landingSlug={slug} />
            {profile === 'bridges' ? <BridgesShipChecklist /> : null}
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
  sessionsCount: _sessionsCount,
  stats,
  sessionsReady = true,
  todayReference,
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
  bridgesHeroActions?: React.ReactNode;
}) {
  void _sessionsCount;
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
        ? landing.heroSubtitle || 'От Калининграда до Сочи — сравните автобусные экскурсии в 11 городах России.'
        : isRiver && cityName && riverGuide?.heroSubtitle
          ? riverGuide.heroSubtitle
          : isRiver && !cityName
            ? landing.heroSubtitle || 'От Невы до Енисея — сравните предложения речных прогулок в 12 городах России.'
            : landing.heroSubtitle || landing.subtitle;
  const countLabel = isBridges
    ? 'прогулок'
    : isBus && cityName
      ? 'рейсов'
      : isBus
        ? 'экскурсий'
        : isRiver && cityName
          ? 'прогулок'
          : isSeasonal
            ? 'программ'
            : 'событий';
  const heroClass = isBridges
    ? 'gradient-bridges-hero text-primary-foreground'
    : isSeasonal && landingSlug.includes('salute')
      ? 'gradient-salute-hero'
      : 'gradient-hero-lovable';

  return (
    <section className={`relative overflow-hidden ${heroClass}`}>
      {isBridges ? (
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div
            className="absolute left-1/2 top-24 h-96 w-[120%] -translate-x-1/2 rounded-[50%] blur-3xl"
            style={{ backgroundColor: 'var(--bridges-hero-glow)' }}
          />
        </div>
      ) : null}
      <div className={`relative container-page ${isBridges ? 'pb-16 pt-10 md:pt-14' : 'py-16 md:py-24'}`}>
        <div className={isBridges ? 'max-w-5xl' : 'max-w-4xl'}>
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
                <a href="/cities" className="transition-colors hover:text-primary-foreground">{cityName}</a>
              </span>
            ) : null}
            {!isBus && !isDinner && !isRiver && !isSeasonal && !isBridges ? (
              <span className="flex items-center gap-2">
                <span>/</span>
                <span className="text-primary-foreground">{landing.title}</span>
              </span>
            ) : null}
          </nav>
          <h1 className={`mb-5 font-semibold leading-tight tracking-tight text-primary-foreground ${isBridges ? 'max-w-4xl text-3xl md:text-4xl lg:text-5xl' : 'mb-4 text-3xl font-extrabold md:text-5xl'}`}>
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
          <p className={`${isBridges ? 'mb-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/75' : 'mb-5 max-w-3xl text-base leading-relaxed text-primary-foreground/80 md:text-lg'}`}>{heroSubtitle}</p>
          <ul className={`mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm ${isBridges ? 'text-primary-foreground/80' : 'text-primary-foreground/85'}`}>
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
          {!isBridges ? (
          <div className={`flex flex-wrap gap-3 ${bridgesHeroActions ? 'mt-6' : ''}`}>
            {sessionsReady ? (
              <>
                <div className="flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                  <TrendingUp className="h-4 w-4" />
                  {formatNumber(visibleCount)} {countLabel}
                </div>
                {stats.priceFrom ? (
                  <div className="flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                    от {formatMoney(stats.priceFrom).replace(/^от\s+/i, '')}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium text-primary-foreground/90 backdrop-blur-sm">
                Загружаем актуальное расписание…
              </div>
            )}
          </div>
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
    <div className="py-8">
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

function LandingDinnerFilters({
  dateFilter,
  sort,
  groupsCount,
  menuFilter,
  dinnerTimeFilter,
  dinnerBadgeFilter,
  badgeFacets,
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

      <div className="hidden flex-wrap items-center gap-2 lg:flex">
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
        <div className="mx-1 h-6 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          {menuChip('all', 'Любое меню')}
          {menuChip('set', 'Сет-меню')}
          {menuChip('buffet', 'Фуршет')}
        </div>
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
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
        <div className="flex flex-wrap gap-2">
          {menuChip('all', 'Меню: любое')}
          {menuChip('set', 'Сет-меню')}
          {menuChip('buffet', 'Фуршет')}
        </div>
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

function LandingDinnerScheduleList({ groups, onReset }: { groups: EventGroup[]; onReset: () => void }) {
  if (!groups.length) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">Нет рейсов на выбранную дату</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={onReset} className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
            Сбросить фильтры
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 hidden items-center gap-4 px-5 py-2 md:grid md:grid-cols-[1.5fr_0.7fr_0.6fr_0.5fr_0.6fr_auto]">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Теплоход</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Меню</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Цена</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Время</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Формат</span>
        <span />
      </div>
      <div className="space-y-3">
        {groups.map((group, index) => (
          <LandingDinnerScheduleRow key={group.key} group={group} isOptimal={index === pickOptimalIndex(groups)} />
        ))}
      </div>
    </>
  );
}

function LandingDinnerScheduleRow({ group, isOptimal }: { group: EventGroup; isOptimal: boolean }) {
  const session = group.representative;
  const slot = session.upcomingSlots?.[0];
  const time = resolveSessionTime(session, slot);
  const shipName = session.tags?.find((tag) => /теплоход|катер|яхт|palace|ривер|монарх|нео/i.test(tag)) || group.title;
  const menu = extractMenuLabel(session.tags);
  const format = extractFormatLabel(session.tags);
  const badges = deriveLandingCardBadges(session);
  const href = eventHref(session);
  const priceLabel = group.priceFrom ? formatMoney(group.priceFrom).replace(/^от\s+/i, '') : 'Купить';
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
      <div className="hidden items-center gap-4 md:grid md:grid-cols-[1.5fr_0.7fr_0.6fr_0.5fr_0.6fr_auto]">
        <div className="min-w-0">
          {isOptimal ? <div className="mb-1 text-xs font-bold text-primary">⭐ Оптимальный выбор</div> : null}
          <div className="truncate font-semibold text-foreground">
            <a href={href} className="hover:text-primary">{shipName}</a>
          </div>
          <div className="truncate text-sm text-muted-foreground">
            <a href={href} className="hover:text-primary">{group.title}</a>
          </div>
          <LandingCardBadgeRow badges={badges} className="mt-1.5" />
        </div>
        <div className="text-sm text-foreground">{menu}</div>
        <div className="text-sm font-semibold text-foreground">{priceLabel}</div>
        <div className="text-sm text-foreground">{time}</div>
        <div className="text-sm text-muted-foreground">{format}</div>
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
          <a href={href} className="hover:text-primary">{shipName}</a>
        </div>
        <div className="text-sm text-muted-foreground">
          <a href={href} className="hover:text-primary">{group.title}</a>
        </div>
        <LandingCardBadgeRow badges={badges} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{menu}</span>
          <span>{time}</span>
          <span>{format}</span>
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
            <ScenarioFact icon={<MapPin className="h-4 w-4" />} label="Цена" value={formatMoney(stats.priceFrom)} />
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
            <EditorialFact icon={<Ticket className="h-5 w-5" />} title="Цена" text={`от ${formatMoney(stats.priceFrom).replace(/^от\s+/i, '')}`} />
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

function LandingHowToChoose({ landing, stats, profile = 'default' }: { landing: PublicLandingDto; stats: PublicLandingPageDto['stats']; profile?: LandingProfile }) {
  const key = `${landing.slug} ${landing.title}`.toLowerCase();
  const isRiver = profile === 'bridges' || isRiverCruisesLandingSlug(landing.slug) || key.includes('bridge') || key.includes('мост');
  const topVenues = topEntries(stats.venues, 3).map(([name]) => name).join(', ');

  const steps = isRiver
    ? [
        { icon: <Clock className="h-6 w-6 text-primary" />, title: 'Выберите время', text: 'Самые зрелищные рейсы стартуют в 23:30–00:30, когда мосты разводятся один за другим.' },
        { icon: <MapPin className="h-6 w-6 text-primary" />, title: 'Определите причал', text: topVenues ? `Популярные: ${topVenues}. Ближайший к вам причал сэкономит время.` : 'Выберите удобную точку отправления на набережной.' },
        { icon: <Ship className="h-6 w-6 text-primary" />, title: 'Сравните теплоходы', text: 'Обратите внимание на вместимость, наличие крытой палубы и бортового кафе.' },
        { icon: <Wallet className="h-6 w-6 text-primary" />, title: 'Сравните цены', text: `Цены от ${formatMoney(stats.priceFrom).replace(/^от\s+/i, '')}. Ищите пометку «Оптимальный выбор» — лучшее соотношение цены и рейтинга.` },
      ]
    : [
        { icon: <Clock className="h-6 w-6 text-primary" />, title: 'Выберите дату', text: 'Используйте фильтры «сегодня», «завтра» и «вечером» для быстрого поиска.' },
        { icon: <MapPin className="h-6 w-6 text-primary" />, title: 'Уточните город', text: Object.keys(stats.cities).length > 1 ? 'Начните с города, затем сравните площадки и маршруты.' : 'Проверьте адрес старта и удобство маршрута.' },
        { icon: <Star className="h-6 w-6 text-primary" />, title: 'Сравните рейтинг', text: 'Смотрите отзывы и количество проданных билетов у организаторов.' },
        { icon: <Wallet className="h-6 w-6 text-primary" />, title: 'Сравните цены', text: `В подборке цена от ${formatMoney(stats.priceFrom).replace(/^от\s+/i, '')}. Оплата — в виджете организатора.` },
      ];

  return (
    <section id="how-to-choose" className="py-16">
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground md:text-3xl">Как выбрать прогулку</h2>
      <p className="mb-10 text-center text-muted-foreground">4 простых шага к идеальному рейсу</p>
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

function LandingFaq({
  landing,
  blocks,
  profile,
  citySlug,
  landingSlug,
}: {
  landing: PublicLandingDto;
  blocks: LandingContentBlock[];
  profile: LandingProfile;
  citySlug?: string;
  landingSlug?: string;
}) {
  const faqBlock = blocks.find((block) => block.type === 'FAQ');
  const slugKey = landingSlug || landing.slug;
  const items: Array<Record<string, string | number>> = faqBlock
    ? blockItems(faqBlock)
    : defaultLandingFaq(slugKey, profile, citySlug).map((item) => ({ question: item.question, answer: item.answer }));
  const seasonalMeta = profile === 'seasonal' ? getSeasonalLanding(slugKey) : null;
  const faqSubtitle = profile === 'dinner'
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
          const question = String(item.question || item.title);
          const answer = String(item.answer || item.text);
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

function defaultLandingFaq(slug: string, profile: LandingProfile = 'default', citySlug?: string) {
  const key = slug.toLowerCase();
  if (profile === 'bridges') return BRIDGES_LANDING.faq;
  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(key);
    const cityName = resolveLandingCityName(citySlug, key);
    const cityGuide = seasonalCityGuide(key, cityName);
    if (cityGuide?.faq.length) return cityGuide.faq;
    if (meta?.defaultFaq.length) return meta.defaultFaq;
  }
  if (profile === 'bus' || key.includes('bus')) {
    if (normalizeCitySlug(citySlug) === 'saint-petersburg') {
      return [
        { question: 'Есть ли экскурсия с разводными мостами?', answer: 'Да — ночной рейс «Ночной Петербург + разводные мосты» стартует после 23:00 и включает остановку у разводного моста.' },
        { question: 'Стоит ли ехать в Петергоф?', answer: 'Да, если есть полдня. Автобусная экскурсия в Петергоф — один из самых популярных загородных маршрутов. В будни меньше очередей.' },
      ];
    }
    return [
      { question: 'Сколько длится обзорная экскурсия?', answer: 'Обычно 2–3 часа. Загородные маршруты (Петергоф, Куршская коса, Красная Поляна) — от 4 до 6 часов.' },
      { question: 'Есть ли аудиогид?', answer: 'На большинстве рейсов доступен аудиогид на русском и английском. Иконка наушников в карточке — признак аудиосопровождения.' },
      { question: 'Можно ли с детьми?', answer: 'Да, обзорные автобусные экскурсии подходят для семей. Для длительных маршрутов лучше брать детей от 5–6 лет.' },
      { question: 'Чем автобусная экскурсия лучше пешей?', answer: 'За 2–3 часа вы увидите больше достопримечательностей без усталости. Удобно в жару, дождь и с маленькими детьми.' },
    ];
  }
  if (profile === 'dinner' || key.includes('dinner')) {
    return [
      { question: 'Ужин включён в стоимость билета?', answer: 'Да, на большинстве рейсов ужин или фуршет включены в стоимость. Уточняйте формат меню в карточке рейса.' },
      { question: 'Можно ли принести свой алкоголь?', answer: 'Обычно нет — на борту работает бар с винной картой. Исключения возможны на VIP-рейсах, уточняйте у организатора.' },
      { question: 'Где посадка на теплоход?', answer: 'Точка посадки указана в карточке рейса. Популярные причалы: Китай-город, Парк Горького, Крымская набережная.' },
      { question: 'Что если плохая погода?', answer: 'Теплоходы с ужином обычно имеют крытые палубы и работают в любую погоду. Рейс отменяют только при штормовом ветре.' },
      { question: 'Нужно ли бронировать заранее?', answer: 'Да, особенно на выходные и праздники. Столики у окна разбирают за 3–7 дней.' },
      { question: 'Есть ли дресс-код?', answer: 'Smart casual — без пляжной одежды. На VIP-рейсах возможен dress code: коктейльные платья и рубашки.' },
    ];
  }
  if (profile === 'river' || isRiverCruisesLandingSlug(slug) || key.includes('bridge')) {
    const cityName = resolveLandingCityName(citySlug);
    const guide = riverCityGuide(cityName);
    if (guide?.faq.length) return guide.faq;
    if (key.includes('bridge') || normalizeCitySlug(citySlug) === 'saint-petersburg') {
      return [
        { question: 'Когда разводят мосты в Санкт-Петербурге?', answer: 'В навигационный сезон разводка начинается около 01:00–02:30. Рейсы в 23:30–00:30 позволяют увидеть несколько мостов подряд.' },
        { question: 'Стоит ли брать ночную прогулку или дневную?', answer: 'Ночная — для разводки мостов и подсветки. Дневная — для архитектуры и фото при дневном свете.' },
        { question: 'Можно ли с детьми?', answer: 'Да, большинство рейсов допускают детей. Уточняйте возрастные ограничения у конкретного организатора.' },
        { question: 'Что взять с собой?', answer: 'Тёплую одежду — на воде прохладнее. Фотоаппарат и power bank приветствуются.' },
        { question: 'Как купить билет?', answer: 'Нажмите на цену в расписании — откроется официальный виджет билетной системы организатора.' },
      ];
    }
    return [
      { question: 'Когда начинается навигация?', answer: 'В большинстве городов — с апреля–мая по октябрь. Точные даты зависят от погоды и уровня воды.' },
      { question: 'Что взять с собой?', answer: 'Тёплую одежду — на воде всегда прохладнее. Солнцезащитные очки и вода летом.' },
      { question: 'Можно ли с детьми?', answer: 'Да, большинство речных прогулок подходят для семей. На борту обычно есть крытые зоны.' },
      { question: 'Как купить билет?', answer: 'Нажмите на цену в расписании — откроется официальный виджет билетной системы организатора.' },
    ];
  }
  if (key.includes('yard') || key.includes('paradn') || key === 'spb-yards') {
    return [
      { question: 'Чем отличаются парадные, дворы и коммуналки?', answer: 'Парадные — исторические входные группы домов, дворы — закрытые дворы-колодцы, коммуналки — квартиры с общими зонами. Маршруты часто комбинируют несколько форматов.' },
      { question: 'Нужна ли специальная обувь?', answer: 'Удобная обувь для пешей прогулки 1,5–2,5 часа. В некоторых домах могут попросить надеть бахилы — их обычно выдают на месте.' },
      { question: 'Можно ли с детьми?', answer: 'Да, многие маршруты рассчитаны на семейную аудиторию. Уточняйте возрастные ограничения в карточке события.' },
      { question: 'Как купить билет?', answer: 'Выберите дату и время в расписании — покупка откроется в виджете билетной системы организатора.' },
    ];
  }
  if (key.includes('family') || key.includes('kids') || key.includes('detyam')) {
    return [
      { question: 'С какого возраста подходят детские шоу?', answer: 'Зависит от программы — возраст указан в карточке события или на странице организатора.' },
      { question: 'Чем отличается от новогодних программ?', answer: 'Эта подборка шире: цирк, анимация, детские спектакли и семейные шоу круглый год, не только в декабре.' },
      { question: 'Нужны ли взрослые билеты?', answer: 'Обычно да — детский билет сопровождается взрослым. Точные правила — в виджете при покупке.' },
    ];
  }
  if (key.includes('concert')) {
    return [
      { question: 'Чем эта подборка отличается от стендапа?', answer: 'Здесь — музыкальные концерты: рок, джаз, классика, эстрада. Стендап и комедия — в отдельной подборке.' },
      { question: 'Можно ли выбрать жанр?', answer: 'Используйте фильтр «Формат» и сортировку по дате или цене, чтобы сузить выдачу.' },
      { question: 'Где проходит оплата?', answer: 'В официальном виджете билетной системы организатора после выбора сеанса.' },
    ];
  }
  if (key.includes('moscow-museum') || key === 'moscow-museums') {
    return [
      { question: 'Это только один музей?', answer: 'Подборка собирает мастер-классы и музейные программы в Москве — прежде всего студии и выставочные форматы.' },
      { question: 'Нужна ли подготовка для мастер-класса?', answer: 'Обычно нет — материалы предоставляет организатор. Одежду, которую не жалко испачкать, лучше уточнить в описании.' },
      { question: 'Как купить билет?', answer: 'Выберите сеанс в расписании — оплата в виджете организатора.' },
    ];
  }
  if (key.includes('active') || key.includes('sport') || key.includes('autosport')) {
    return [
      { question: 'Нужны ли права для участия?', answer: 'Для зрителей — нет. Для заездов и master-class drive уточняйте требования у организатора в карточке события.' },
      { question: 'Можно ли с детьми?', answer: 'Зависит от формата — на автоспортивных событиях часто есть возрастные ограничения из соображений безопасности.' },
    ];
  }
  return [
    { question: 'Как выбрать подходящий вариант?', answer: 'Используйте фильтры по дате, городу и сортировке по цене или времени.' },
    { question: 'Где происходит оплата?', answer: 'Оплата проходит в официальном виджете билетной системы организатора.' },
    { question: 'Можно ли вернуть билет?', answer: 'Условия возврата зависят от организатора — они указаны при оформлении заказа.' },
  ];
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
}) {
  const isBus = profile === 'bus';
  const isRiver = profile === 'river';
  const isBridges = profile === 'bridges';
  const isSeasonal = profile === 'seasonal';
  const showTimeSlot = profile === 'bus' || profile === 'river' || isSeasonal || isBridges;
  const currentCityName = resolveLandingCityName(citySlug);
  const cityOptions = Object.entries(stats.cities).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const orderedCityNames = isBus
    ? filterCityOrderByStats(BUS_CITY_ORDER, stats.cities)
    : isRiver
      ? filterCityOrderByStats(RIVER_CITY_ORDER, stats.cities)
      : isSeasonal && landingSlug
        ? resolveSeasonalCityNames(landingSlug, cityOptions)
        : cityOptions.map(([name]) => name);
  const meaningfulCityCount = Object.keys(stats.cities).filter(
    (name) => name && !/^не указан$/i.test(name.trim()),
  ).length;
  const showCityFilter = isBridges
    ? false
    : isBus || isRiver || isSeasonal
    ? orderedCityNames.length > 1
    : !landingCity && meaningfulCityCount > 1;
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
  const dateChips: Array<{ label: string; value: DateFilter }> = [
    { label: 'Сегодня', value: 'today' },
    { label: 'Завтра', value: 'tomorrow' },
    { label: 'Любая дата', value: 'all' },
    ...(isSeasonal || isBus || isRiver || isBridges ? [] : [{ label: 'Вечером', value: 'evening' as DateFilter }]),
  ];
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
      className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
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
      className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
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

      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        {dateChips.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {dateChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setDateFilter(chip.value)}
                className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                  dateFilter === chip.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        {showCityFilter ? (
          <>
            {dateChips.length > 0 ? <div className="mx-1 h-6 w-px bg-border" /> : null}
            {cityChip('all', 'Все города', city === 'all')}
            {orderedCityNames.map((name) => cityChip(name, name, city === name))}
          </>
        ) : null}
        {showTimeSlot ? (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            {timeSlotSelect}
          </>
        ) : null}
        {genreChipRow}
        {!isBus && !isConcerts && Object.keys(stats.categories).length > 1 ? (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 w-[170px] rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Все форматы</option>
              {Object.entries(stats.categories)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, count]) => (
                  <option key={name} value={name}>{name} · {count}</option>
                ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="hidden space-y-3 sm:block lg:hidden">
        {dateChips.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {dateChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setDateFilter(chip.value)}
                className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                  dateFilter === chip.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        {showCityFilter ? (
          <div className="flex flex-wrap items-center gap-2">
            {cityChip('all', 'Все города', city === 'all')}
            {orderedCityNames.map((name) => cityChip(name, name, city === name))}
          </div>
        ) : null}
        {showTimeSlot ? (
          <div className="flex items-center gap-2">
            {timeSlotSelect}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 sm:hidden">
        {dateChips.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {dateChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setDateFilter(chip.value)}
                className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                  dateFilter === chip.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        {showCityFilter ? (
          <select
            value={city}
            onChange={(event) => selectCity(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">Все города</option>
            {orderedCityNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : null}
        {showTimeSlot ? timeSlotSelect : null}
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Сортировать:</span>
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

      <div className="mb-4 mt-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{formatNumber(groupsCount)} {countLabel}</span>
        <span className="text-xs font-medium text-primary">⭐ Оптимальный выбор выделен</span>
      </div>
    </div>
  );
}

function LandingScheduleList({ groups, profile }: { groups: EventGroup[]; profile: LandingProfile }) {
  if (!groups.length) return <EmptyFilteredState />;
  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <LandingScheduleRow key={group.key} group={group} isOptimal={index === pickOptimalIndex(groups)} profile={profile} />
      ))}
    </div>
  );
}

function pickOptimalIndex(groups: EventGroup[]): number {
  if (!groups.length) return -1;
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  groups.forEach((group, index) => {
    const price = group.priceFrom ?? Number.MAX_SAFE_INTEGER;
    const rating = group.sessions.length;
    const score = price - rating * 50;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

function amenityIcons(tags: string[]) {
  const normalized = (tags || []).join(' ').toLowerCase();
  const icons: Array<{ title: string; node: React.ReactNode }> = [];
  if (/экскурсовод|гид|guide/i.test(normalized)) icons.push({ title: 'Экскурсовод', node: <Mic className="h-3.5 w-3.5" /> });
  if (/аудио|audio/i.test(normalized)) icons.push({ title: 'Аудиогид', node: <Headphones className="h-3.5 w-3.5" /> });
  if (/музык|dj|ди-джей/i.test(normalized)) icons.push({ title: 'Музыка/DJ', node: <Music className="h-3.5 w-3.5" /> });
  if (/еда|напит|кафе|бар|ужин/i.test(normalized)) icons.push({ title: 'Еда и напитки', node: <UtensilsCrossed className="h-3.5 w-3.5" /> });
  if (/палуб|открыт/i.test(normalized)) icons.push({ title: 'Открытая палуба', node: <Sun className="h-3.5 w-3.5" /> });
  return icons.slice(0, 5);
}

function LandingScheduleRow({ group, isOptimal, profile }: { group: EventGroup; isOptimal: boolean; profile: LandingProfile }) {
  const session = group.representative;
  const slot = session.upcomingSlots?.[0];
  const time = resolveSessionTime(session, slot);
  const date = resolveSessionDate(session, slot);
  const flexibleSchedule = isFlexibleScheduleSession(session);
  const duration = extractDurationTag(session.tags);
  const vacant = session.vacant ?? group.vacant;
  const soldOut = typeof vacant === 'number' && vacant <= 0;
  const badges = deriveLandingCardBadges(session);
  const isBus = profile === 'bus';
  const shipName = isBus
    ? session.tags?.find((tag) => /city sightseeing|hop-on|оператор/i.test(tag)) || null
    : session.tags?.find((tag) => /теплоход|катер|яхт/i.test(tag)) || session.category;
  const amenities = amenityIcons(session.tags);
  const href = eventHref(session);
  const priceLabel = group.priceFrom ? formatMoney(group.priceFrom).replace(/^от\s+/i, '') : 'Купить';
  const buyButtonClass =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]';
  const buyButtonClassMobile = 'inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-[0.98]';

  const vacantClass =
    soldOut ? '' : typeof vacant === 'number' && vacant <= 5 ? 'text-urgency' : 'text-success';

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 bg-card hover:shadow-md md:p-5 ${isOptimal ? 'best-deal-ring' : 'border-border'}`}>
      {isOptimal ? (
        <div className="mb-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">⭐ Оптимальный выбор</span>
        </div>
      ) : null}

      <div className="hidden gap-4 md:flex md:items-center">
        {!flexibleSchedule ? (
          <div className="w-28 shrink-0">
            <div className="text-2xl font-bold text-foreground">{time}</div>
            <div className="text-sm text-muted-foreground">{date}</div>
          </div>
        ) : (
          <div className="w-40 shrink-0 text-sm font-medium leading-snug text-foreground">{FLEXIBLE_SCHEDULE_LABEL}</div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="truncate font-semibold text-foreground">
            <a href={href} className="hover:text-primary">
              {group.title}
            </a>
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {duration ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {duration}
              </span>
            ) : null}
            {group.venue ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {group.venue}
              </span>
            ) : null}
            {shipName ? (
              <span className="flex items-center gap-1">
                <Ship className="h-3.5 w-3.5" />
                {shipName}
              </span>
            ) : null}
          </div>
          <LandingCardBadgeRow badges={badges} />
          {amenities.length ? (
            <div className="flex items-center gap-1.5">
              {amenities.map((item) => (
                <span key={item.title} title={item.title} className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:text-foreground">
                  {item.node}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-4 lg:gap-[120px]">
          {!soldOut && typeof vacant === 'number' ? (
            <div className={`flex items-center gap-1 text-xs font-medium ${vacantClass}`}>
              <Users className="h-3.5 w-3.5" />
              Осталось {formatVacantSeats(vacant)}
            </div>
          ) : null}
          {soldOut ? (
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-lg bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground">
              Распродано
            </button>
          ) : (
            <LandingPurchaseButton session={session} label={priceLabel} className={buyButtonClass} showArrow />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start gap-3">
          {!flexibleSchedule ? (
            <div className="shrink-0">
              <div className="text-xl font-bold text-foreground">{time}</div>
              <div className="text-xs text-muted-foreground">{date}</div>
            </div>
          ) : (
            <div className="shrink-0 text-sm font-medium text-foreground">{FLEXIBLE_SCHEDULE_LABEL}</div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight text-foreground">
              <a href={href} className="hover:text-primary">
                {group.title}
              </a>
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {duration ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span> : null}
          {group.venue ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{group.venue}</span> : null}
        </div>
        <LandingCardBadgeRow badges={badges} />
        <div className="flex items-center justify-between gap-3">
          {!soldOut && typeof vacant === 'number' ? (
            <div className={`flex items-center gap-1 text-xs font-medium ${vacantClass}`}>
              <Users className="h-3 w-3" />
              Осталось {vacant}
            </div>
          ) : (
            <div />
          )}
          {soldOut ? (
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
              Распродано
            </button>
          ) : (
            <LandingPurchaseButton session={session} label={priceLabel} className={buyButtonClassMobile} />
          )}
        </div>
      </div>
    </div>
  );
}

function extractDurationTag(tags: string[]): string | null {
  const match = (tags || []).find((tag) => /\d+\s*(мин|ч|час)/i.test(tag));
  return match || null;
}

function LandingReviews({
  landing,
  profile,
  landingSlug,
}: {
  landing: PublicLandingDto;
  profile?: LandingProfile;
  landingSlug?: string;
}) {
  const reviews = defaultLandingReviews(landingSlug || landing.slug, profile);
  return (
    <section id="reviews" className="py-16">
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground md:text-3xl">Отзывы пассажиров</h2>
      <p className="mb-10 text-center text-muted-foreground">Что говорят наши гости</p>
      <div className="grid gap-6 md:grid-cols-3">
        {reviews.map((review) => (
          <div key={review.author} className="flex flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
            <Quote className="mb-3 h-7 w-7 text-primary/20" />
            <p className="mb-4 flex-1 text-sm leading-relaxed text-foreground/80">{review.text}</p>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">{review.author}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 ${index < ('stars' in review ? review.stars ?? 5 : 5) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function defaultLandingReviews(slug: string, profile?: LandingProfile) {
  const key = slug.toLowerCase();
  if (profile === 'bridges') return BRIDGES_LANDING.reviews;
  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(key);
    if (meta?.reviews.length) return meta.reviews;
  }
  if (profile === 'dinner' || key.includes('dinner')) {
    return [
      { text: 'Ужин на «Ривер Палас» — лучший вечер в Москве! Кремль с воды, живой джаз, потрясающая еда.', author: 'Анна К.', stars: 5 },
      { text: 'Романтический круиз на «Риверсайд» — идеальный подарок для жены. Просекко, закат, панорамные окна.', author: 'Дмитрий С.', stars: 5 },
      { text: 'VIP-ужин на «Монархе» — другой уровень. Дегустационный сет и персональный сомелье.', author: 'Марина П.', stars: 5 },
      { text: 'Фуршет на «Нео» — весело, вкусно, демократично. Отличный вариант для компании.', author: 'Игорь Л.', stars: 4 },
    ];
  }
  if (key.includes('bus')) {
    return [
      { text: 'Hop-on/hop-off в Москве — идеальный первый день. Увидели всё за одну поездку!', author: 'Анна К.', stars: 5 },
      { text: 'Ночной Петербург с мостами — атмосферно. Гид рассказывал так, что мурашки.', author: 'Дмитрий С.', stars: 5 },
      { text: 'Куршская коса из Калининграда — лучшая экскурсия в жизни. Дюны нереальные!', author: 'Ольга М.', stars: 5 },
      { text: 'Мамаев курган — до слёз. Обязательно берите экскурсию, без гида половину не поймёте.', author: 'Игорь Л.', stars: 5 },
      { text: 'Граница Европы и Азии — забавное фото, а экскурсия по Екатеринбургу — настоящее открытие!', author: 'Марина П.', stars: 5 },
      { text: 'Красная Поляна из Сочи — от моря до гор за час. Дети в восторге!', author: 'Павел Н.', stars: 5 },
    ];
  }
  if (profile === 'river' || isRiverCruisesLandingSlug(slug) || key.includes('bridge')) {
    return [
      { text: 'Прогулка по Москве-реке — обязательный пункт для гостей столицы! Кремль с воды — совсем другое впечатление.', author: 'Анна К.', stars: 5 },
      { text: 'Разводные мосты с теплохода — магия Петербурга. Бронируйте заранее, места разлетаются!', author: 'Дмитрий С.', stars: 5 },
      { text: 'Круиз до Свияжска из Казани — целое приключение на день. Рекомендую!', author: 'Марина П.', stars: 5 },
      { text: 'Жигулёвские горы с воды — потрясающе. Самара недооценена туристами!', author: 'Игорь Л.', stars: 5 },
      { text: 'Енисей впечатляет масштабом. Совсем другие реки в Сибири — мощные, широкие.', author: 'Елена Б.', stars: 5 },
      { text: 'Казачий круиз по Дону — вкусная кухня, живая музыка, южный колорит!', author: 'Павел Н.', stars: 5 },
    ];
  }
  if (key.includes('salute')) {
    return [
      { text: 'Смотрели салют с теплохода — фейерверк отражается в воде, 360° обзор.', author: 'Наталья М.' },
      { text: 'Автобусный тур перед салютом — и экскурсия, и лучшие точки обзора.', author: 'Алексей Р.' },
      { text: 'Третий год подряд на салюте с воды — каждый раз как в первый.', author: 'Максим Л.' },
    ];
  }
  return [
    { text: 'Удобно сравнить варианты по времени и цене в одном месте.', author: 'Ирина В.' },
    { text: 'Билет купили через виджет за пару минут — всё прошло без сюрпризов.', author: 'Павел Н.' },
    { text: 'Нашли подходящий сеанс на сегодня — не пришлось обходить десятки сайтов.', author: 'Сергей К.' },
  ];
}

function LandingSchemaJsonLd({ groups, cityName }: { groups: EventGroup[]; cityName?: string | null }) {
  const events = groups.slice(0, 5).map((group) => {
    const session = group.representative;
    const slot = session.upcomingSlots?.[0];
    const locality = cityName || group.city;
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: group.title,
      startDate: slot?.startsAt || session.startsAt || undefined,
      location: {
        '@type': 'Place',
        name: group.venue || group.city,
        address: {
          '@type': 'PostalAddress',
          addressLocality: locality,
          addressCountry: 'RU',
        },
      },
      offers: group.priceFrom
        ? {
            '@type': 'Offer',
            price: group.priceFrom,
            priceCurrency: 'RUB',
            availability: 'https://schema.org/InStock',
          }
        : undefined,
      description: cityName
        ? `Автобусная экскурсия в ${cityName} — ${group.title}`
        : `Автобусная экскурсия — ${group.title}`,
    };
  }).filter((item) => item.startDate);

  if (!events.length) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(events) }} />;
}

function LandingCitiesGrid({ landing }: { landing: PublicLandingDto; stats: PublicLandingPageDto['stats'] }) {
  return (
    <div className="py-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Автобусные экскурсии по городам</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {BUS_CITY_ORDER.map((name) => {
            const meta = BUS_CITY_META[name];
            const slugKey = citySlugByName(name) || meta.slug;
            const href = busLandingHref(slugKey);
            return (
              <a
                key={name}
                href={href}
                className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <Bus className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{meta.duration}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingOtherCitiesGrid({ landing, currentCityName }: { landing: PublicLandingDto; currentCityName: string | null }) {
  const cities = BUS_CITY_ORDER.filter((name) => name !== currentCityName);
  if (!cities.length) return null;

  return (
    <div className="mt-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Автобусные экскурсии в других городах</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cities.map((name) => {
            const meta = BUS_CITY_META[name];
            const slugKey = citySlugByName(name) || meta.slug;
            const href = busLandingHref(slugKey);
            return (
              <a
                key={name}
                href={href}
                className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <Bus className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{meta.duration}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingRiverCitiesGrid({ landing }: { landing: PublicLandingDto }) {
  return (
    <div className="py-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Речные прогулки по городам</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {RIVER_CITY_ORDER.map((name) => {
            const guide = riverCityGuide(name);
            if (!guide) return null;
            const href = riverLandingHref(guide.slug);
            return (
              <a
                key={name}
                href={href}
                className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <Ship className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{guide.riverName}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingRiverOtherCitiesGrid({ landing, currentCityName }: { landing: PublicLandingDto; currentCityName: string | null }) {
  const cities = RIVER_CITY_ORDER.filter((name) => name !== currentCityName);
  if (!cities.length) return null;

  return (
    <div className="mt-8">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Речные прогулки в других городах</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cities.map((name) => {
            const guide = riverCityGuide(name);
            if (!guide) return null;
            const href = riverLandingHref(guide.slug);
            return (
              <a
                key={name}
                href={href}
                className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <Ship className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{guide.riverName}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LandingRiverFreeAlternatives({ cityName }: { cityName: string | null }) {
  const guide = riverCityGuide(cityName);
  const freeSpots = guide?.spots.filter((spot) => spot.badgeTone === 'free') || [];
  if (!freeSpots.length || !cityName) return null;

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

function LandingEventsTable({ groups }: { groups: EventGroup[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Ближайшие слоты</th>
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Город</th>
            <th className="px-4 py-3 font-semibold">Площадка</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3 font-semibold">Места</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1.5">
                  {group.sessions.slice(0, 3).map((session) => (
                    <span key={session.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {session.dateLabel} · {session.timeLabel}
                    </span>
                  ))}
                  {group.sessions.length > 3 ? <span className="rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">+{group.sessions.length - 3}</span> : null}
                </div>
              </td>
              <td className="min-w-[320px] px-4 py-3 align-top">
                <a href={eventHref(group.representative)} className="font-medium text-slate-950 hover:text-primary-700">{group.title}</a>
                <div className="mt-1 text-xs text-slate-500">{group.category} · {group.tags[0] ?? 'событие'}</div>
              </td>
              <td className="px-4 py-3 align-top">
                {group.representative.citySlug ? <a href={`/cities/${group.representative.citySlug}`} className="font-medium text-slate-700 hover:text-primary-700">{group.city}</a> : group.city}
              </td>
              <td className="max-w-[240px] px-4 py-3 align-top text-slate-600">
                {(() => {
                  const venueLink = sessionVenueHref(group.representative);
                  return venueLink ? (
                    <a href={venueLink} className="hover:text-primary-700">
                      {group.venue}
                    </a>
                  ) : (
                    group.venue
                  );
                })()}
              </td>
              <td className="px-4 py-3 align-top font-semibold text-slate-950">{formatMoney(group.priceFrom)}</td>
              <td className="px-4 py-3 align-top text-slate-600">{group.vacant ?? '-'}</td>
              <td className="px-4 py-3 align-top"><BuyLink session={group.representative} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!groups.length ? <EmptyFilteredState /> : null}
    </div>
  );
}

function LandingEventsGrid({ groups }: { groups: EventGroup[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.slice(0, 60).map((group) => (
        <EventCard key={group.key} session={group.representative} compact landingActions />
      ))}
      {!groups.length ? <EmptyFilteredState /> : null}
    </div>
  );
}

function BuyLink({ session }: { session: PublicSessionDto }) {
  return (
    <LandingPurchaseButton
      session={session}
      label="Купить"
      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
    />
  );
}

function LandingContext({ landing, stats }: { landing: PublicLandingDto; stats: PublicLandingPageDto['stats'] }) {
  const topVenues = Object.entries(stats.venues).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-semibold text-slate-950">Контекст лендинга</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{landing.subtitle}</p>
      <div className="mt-4 grid gap-2">
        {topVenues.map(([venue, count]) => (
          <div key={venue} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-slate-700">{venue}</span>
            <span className="shrink-0 font-semibold text-slate-950">{formatNumber(count)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedLandings({
  landings,
  landing,
  stats,
  citySlug,
}: {
  landings: PublicLandingDto[];
  landing: PublicLandingDto;
  stats: PublicLandingPageDto['stats'];
  citySlug?: string;
}) {
  const cityEntries = Object.entries(stats.cities).sort((a, b) => b[1] - a[1]);
  const citySlugByName = Object.fromEntries(
    Object.entries(LANDING_CITY_SLUGS).map(([slugKey, name]) => [name, normalizeCitySlug(slugKey) || slugKey]),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {cityEntries.length > 1 && !citySlug ? (
        <section>
          <h3 className="text-lg font-bold text-slate-950">{landing.title} по городам</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {cityEntries.map(([name, count]) => {
              const slugKey = citySlugByName[name];
              const href = slugKey ? landingCategoryHref(landing.slug, slugKey) : `#landing-schedule`;
              return (
                <a key={name} href={href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:text-primary-700">
                  {name}
                  <span className="ml-1 text-slate-400">{formatNumber(count)}</span>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {landings.length ? (
        <section>
          <h3 className="text-lg font-bold text-slate-950">Похожие подборки</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {landings.slice(0, 6).map((item) => (
              <a key={item.slug} href={landingPageHref(item.slug)} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm">
                <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatNumber(item.events)} событий · {formatMoney(item.priceFrom)}
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function HeroStat({ label, value, raw = false }: { label: string; value: number | string; raw?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <div className="text-2xl font-bold">{raw ? value : formatNumber(Number(value))}</div>
      <div className="mt-1 text-xs font-medium text-white/60">{label}</div>
    </div>
  );
}

function ChipRow({ items, active, onChange }: { items: Array<{ label: string; value: string }>; active: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === item.value
              ? 'bg-primary-600 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EmptyFilteredState() {
  return (
    <div className="grid min-h-[220px] place-items-center p-6 text-center">
      <div>
        <Search className="mx-auto h-7 w-7 text-slate-300" />
        <div className="mt-3 text-sm font-semibold text-slate-950">По этим фильтрам вариантов нет</div>
        <div className="mt-1 text-sm text-slate-500">Снимите город, формат или дату.</div>
      </div>
    </div>
  );
}

function LandingScheduleSkeleton({ profile }: { profile: LandingProfile }) {
  const rows = profile === 'dinner' ? 4 : 6;
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Загрузка расписания">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="hidden gap-4 md:flex md:items-center">
            <div className="w-28 shrink-0 space-y-2">
              <div className="h-7 w-16 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="h-4 w-1/3 rounded bg-muted" />
            </div>
            <div className="h-10 w-28 rounded-lg bg-muted" />
          </div>
          <div className="space-y-2 md:hidden">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
      {message}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="container-page py-12">
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-700">{message}</div>
    </section>
  );
}


function buildLandingStats(sessions: PublicSessionDto[]): PublicLandingPageDto['stats'] {
  const { priceFrom, priceTo } = resolveSessionPriceRange(sessions);
  return {
    events: groupLandingSessions(sessions).length,
    sessions: sessions.length,
    cities: countBy(sessions.map((session) => session.city)),
    categories: countBy(sessions.flatMap((session) => [session.category, ...session.tags.slice(0, 2)]).filter(Boolean)),
    venues: countBy(sessions.map((session) => session.venue)),
    priceFrom,
    priceTo,
  };
}

function groupLandingSessions(sessions: PublicSessionDto[]): EventGroup[] {
  const groups = new Map<string, PublicSessionDto[]>();

  for (const session of sessions) {
    const key = session.groupKey || [session.title, session.city, session.venue].map((value) => normalizeKey(value)).join('|');
    const list = groups.get(key) || [];
    list.push(session);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, groupSessions]) => {
    const sortedSessions = [...groupSessions].sort(
      (a, b) => parseSessionStartsAt(a.startsAt).getTime() - parseSessionStartsAt(b.startsAt).getTime(),
    );
    const representative = sortedSessions[0];
    const { priceFrom, priceTo } = resolveSessionPriceRange(sortedSessions);
    const vacantValues = sortedSessions.map((session) => session.vacant).filter((vacant): vacant is number => Number.isFinite(vacant));

    return {
      key,
      title: representative.title,
      city: representative.city,
      venue: representative.venue,
      category: representative.category,
      tags: representative.tags,
      representative,
      sessions: sortedSessions,
      priceFrom,
      priceTo,
      vacant: Number.isFinite(representative.vacant) ? representative.vacant : vacantValues.length ? Math.min(...vacantValues) : null,
      firstStartsAt: representative.startsAt,
    };
  });
}

function sortEventGroups(groups: EventGroup[], sort: SortFilter): EventGroup[] {
  const sorted = [...groups];

  if (sort === 'price') {
    return sorted.sort((a, b) => (a.priceFrom || Number.MAX_SAFE_INTEGER) - (b.priceFrom || Number.MAX_SAFE_INTEGER));
  }

  if (sort === 'rating') {
    return sorted.sort((a, b) => b.sessions.length - a.sessions.length || (a.priceFrom || 0) - (b.priceFrom || 0));
  }

  return sorted.sort((a, b) => new Date(a.firstStartsAt || 0).getTime() - new Date(b.firstStartsAt || 0).getTime());
}

function defaultLandingDateFilter(_profile: LandingProfile): DateFilter {
  return 'all';
}

function filterCityOrderByStats(order: string[], cities: Record<string, number>): string[] {
  const withEvents = new Set(
    Object.entries(cities)
      .filter(([, count]) => count > 0)
      .map(([name]) => name),
  );
  return order.filter((name) => withEvents.has(name));
}

function resolveSeasonalCityNames(landingSlug: string, cityOptions: Array<[string, number]>): string[] {
  const withEvents = new Set(cityOptions.filter(([, count]) => count > 0).map(([name]) => name));
  const order = getSeasonalLanding(landingSlug)?.cityOrder || [];
  if (order.length) return order.filter((name) => withEvents.has(name));
  return cityOptions
    .map(([name]) => name)
    .filter((name) => name && !/^не указан$/i.test(name.trim()));
}

function matchesDateFilter(session: PublicSessionDto, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  if (isOpenDate(session)) return true;
  const timeZone = resolveSessionTimeZoneForSession(session);
  const times = collectSessionStartsAtTimes(session);
  if (!times.length) return false;

  if (filter === 'evening') {
    return (
      session.timeBucket === 'evening' ||
      session.timeBucket === 'night' ||
      times.some((startsAt) => getSessionHour(startsAt, timeZone) >= 18)
    );
  }

  return times.some((startsAt) => {
    if (filter === 'today') return isSameSessionDay(startsAt, new Date(), timeZone);
    if (filter === 'tomorrow') return isSessionTomorrow(startsAt, timeZone);
    if (filter === 'weekend') return isSessionWeekend(startsAt, timeZone);
    return true;
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    if (!value) return acc;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(values: Record<string, number>, limit: number): Array<[string, number]> {
  return Object.entries(values)
    .filter(([name, count]) => Boolean(name) && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function normalizeKey(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function navigateHome(section: string) {
  if (section === 'events') {
    window.location.href = '/events';
    return;
  }
  if (section === 'cities' || section === 'destinations') {
    window.location.href = '/cities';
    return;
  }
  if (section === 'orders') {
    window.location.href = '/account/purchases';
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
  window.location.href = section === 'top' ? '/' : `/#${section}`;
}
