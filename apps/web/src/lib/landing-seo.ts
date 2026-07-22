import * as React from 'react';

import { getSeasonalLanding } from '@/data/seasonal-landings';
import { formatBridgesSeoDescription, formatBridgesSeoTitle } from '@/lib/bridges-seo';
import { canonicalLandingSlug, isBridgesNightLandingSlug, isRiverPartyLandingSlug } from '@/lib/landing-constants';
import type { LandingProfileKind } from '@/lib/landing-copy';
import {
  formatLandingTodayParts,
  msUntilNextMidnight,
  SITE_TIME_ZONE,
} from '@/lib/datetime';

export type LandingSeoStats = {
  events?: number;
  sessions?: number;
  priceFrom?: number | null;
  priceTo?: number | null;
};

export type LandingSeoInput = {
  slug: string;
  profile: LandingProfileKind;
  landingTitle: string;
  cityName?: string | null;
  /** Предложный падеж: «по Москве», «по России». */
  cityPrep?: string | null;
  stats?: LandingSeoStats;
  landingEvents?: number;
  referenceDate?: Date;
  timeZone?: string;
  canonicalPath?: string | null;
  faqItems?: Array<{ question: string; answer: string }>;
  breadcrumbItems?: Array<{ name: string; path: string }>;
  /** Дополнительные JSON-LD блоки (Product, Event и т.д.). */
  jsonLdExtras?: Array<Record<string, unknown>>;
};

export type LandingSeo = {
  h1: string;
  /** Текст до «сегодня, …» — для разметки hero. */
  h1Lead: string;
  /** «сегодня, 5 июля» — не переносить отдельно от слова «сегодня». */
  h1Today: string;
  /** «: цены, расписание…» */
  h1Tail: string;
  title: string;
  description: string;
};

function roundPrice(price?: number | null): number {
  if (!price || price <= 0) return 100;
  return Math.round(price);
}

function resolveEventsCount(input: LandingSeoInput): number {
  const count =
    input.stats?.events ??
    input.stats?.sessions ??
    input.landingEvents ??
    0;
  return count > 0 ? count : 0;
}

function eventsPhrase(count: number, unit: string): string {
  if (count <= 0) return '';
  return `Более ${count} ${unit}. `;
}

function pricePhrase(price?: number | null): string {
  const value = roundPrice(price ?? null);
  return `от ${value} рублей. `;
}

function buildH1Parts(base: string, short: string, suffix: string) {
  const cleaned = base.replace(/\s*сегодня[^:]*$/i, '').trim();
  const h1Lead = `${cleaned} `;
  const h1Today = `сегодня, ${short}`;
  const h1Tail = `: ${suffix}`;
  return {
    h1Lead,
    h1Today,
    h1Tail,
    h1: `${h1Lead}${h1Today}${h1Tail}`,
  };
}

function seoResult(
  base: string,
  short: string,
  suffix: string,
  title: string,
  description: string,
): LandingSeo {
  return { ...buildH1Parts(base, short, suffix), title, description };
}

export function resolveLandingSeo(input: LandingSeoInput): LandingSeo {
  const slug = canonicalLandingSlug(input.slug);
  const profile = input.profile;
  const cityName = input.cityName?.trim() || null;
  const prep = input.cityPrep?.trim() || cityName || 'России';
  const timeZone = input.timeZone || SITE_TIME_ZONE;
  const { short, full } = formatLandingTodayParts(input.referenceDate, timeZone);
  const events = resolveEventsCount(input);
  const priceFrom = input.stats?.priceFrom ?? null;

  if (profile === 'river') {
    if (cityName) {
      return seoResult(
        `Речные прогулки по ${prep}`,
        short,
        'цены, расписание и сравнение теплоходов',
        `Речные прогулки по ${prep} сегодня — купить билеты на теплоход, расписание на ${full}`,
        `Актуальное расписание и билеты на речные прогулки по ${prep} на сегодня. ` +
          eventsPhrase(events, 'маршрутов') +
          pricePhrase(priceFrom) +
          'Сравнение теплоходов, круизы с ужином и ночные рейсы. Покупайте онлайн на Дайбилет!',
      );
    }
    return seoResult(
      'Речные прогулки по России',
      short,
      'цены, расписание и сравнение теплоходов',
      `Речные прогулки по России сегодня — купить билеты на теплоход, расписание на ${full}`,
      'Актуальное расписание речных прогулок по городам России на сегодня. ' +
        eventsPhrase(events, 'маршрутов') +
        pricePhrase(priceFrom) +
        'Сравнение теплоходов в 12 городах. Покупайте онлайн на Дайбилет!',
    );
  }

  if (profile === 'bus') {
    if (cityName) {
      return seoResult(
        `Обзорные автобусные экскурсии по ${prep}`,
        short,
        'цены, расписание и маршруты',
        `Автобусные экскурсии ${cityName} сегодня — купить билеты, расписание на ${full}`,
        `Актуальное расписание автобусных экскурсий по ${prep} на сегодня. ` +
          eventsPhrase(events, 'маршрутов') +
          pricePhrase(priceFrom) +
          'Обзорные туры, Hop-On Hop-Off и двухэтажные автобусы. Покупайте онлайн на Дайбилет!',
      );
    }
    return seoResult(
      'Обзорные автобусные экскурсии по России',
      short,
      'цены, расписание и маршруты',
      `Автобусные экскурсии по России сегодня — купить билеты, расписание на ${full}`,
      'Актуальное расписание автобусных экскурсий в городах России на сегодня. ' +
        eventsPhrase(events, 'маршрутов') +
        pricePhrase(priceFrom) +
        'Сравнение обзорных туров в 11 городах. Покупайте онлайн на Дайбилет!',
    );
  }

  if (profile === 'dinner') {
    const riverLabel =
      cityName === 'Москва'
        ? 'Москве-реке'
        : cityName === 'Санкт-Петербург'
          ? 'Неве'
          : prep;
    const h1Base = cityName
      ? cityName === 'Москва' || cityName === 'Санкт-Петербург'
        ? `Ужин на теплоходе по ${riverLabel}`
        : `Ужин на теплоходе в ${cityName}`
      : 'Ужин на теплоходе';
    return seoResult(
      h1Base,
      short,
      'цены и расписание',
      `Ужин на теплоходе ${cityName ? `— ${cityName}` : 'в Москве'} сегодня — забронировать круиз, расписание на ${full}`,
      `Актуальное расписание ужинов на теплоходе ${cityName ? `в ${cityName}` : 'в Москве'} на сегодня. ` +
        eventsPhrase(events, 'программ') +
        pricePhrase(priceFrom) +
        'Сет-меню, фуршеты и вечерние круизы с видом на город. Покупайте онлайн на Дайбилет!',
    );
  }

  if (profile === 'bridges' || isBridgesNightLandingSlug(slug)) {
    const priceFrom = input.stats?.priceFrom ?? null;
    const h1 = buildH1Parts(
      'Разводные мосты в Санкт-Петербурге',
      short,
      'сравнение рейсов, билеты и цены',
    );
    return {
      ...h1,
      title: formatBridgesSeoTitle(priceFrom),
      description: formatBridgesSeoDescription(events, priceFrom, full),
    };
  }

  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(slug);
    const label = meta?.breadcrumbLabel || input.landingTitle;
    if (cityName && meta) {
      const cityPrepSeasonal = input.cityPrep || cityName;
      return seoResult(
        `${label} в ${cityPrepSeasonal}`,
        short,
        'точки обзора и экскурсии',
        `${label} — ${cityName} сегодня: купить билеты, афиша на ${full}`,
        `Актуальная афиша программ «${label}» в ${cityName} на сегодня. ` +
          eventsPhrase(events, 'программ') +
          pricePhrase(priceFrom) +
          'Лучшие точки обзора и экскурсии. Покупайте онлайн на Дайбилет!',
      );
    }
    return seoResult(
      label,
      short,
      'лучшие точки обзора и экскурсии',
      `${label} сегодня — купить билеты, афиша на ${full}`,
      `Актуальная афиша «${label}» на сегодня. ` +
        eventsPhrase(events, 'программ') +
        pricePhrase(priceFrom) +
        'Сравнение экскурсий и точек обзора в городах России. Покупайте онлайн на Дайбилет!',
    );
  }

  if (isRiverPartyLandingSlug(slug)) {
    const topic = cityName ? `Вечеринки на теплоходе — ${cityName}` : 'Вечеринки и дискотеки на теплоходе';
    return seoResult(
      topic,
      short,
      'DJ, расписание и цены',
      `${topic} сегодня — купить билеты, расписание на ${full}`,
      `Актуальное расписание вечеринок и дискотек на теплоходе${cityName ? ` в ${cityName}` : ''} на сегодня. ` +
        eventsPhrase(events, 'рейсов') +
        pricePhrase(priceFrom) +
        'DJ-сеты, живая музыка и ночные круизы. Покупайте онлайн на Дайбилет!',
    );
  }

  const defaultTopics: Record<string, { countUnit: string; extras: string }> = {
    standup: { countUnit: 'шоу', extras: 'комедийные вечера в барах и клубах' },
    planetarium: { countUnit: 'шоу', extras: 'мультимедийные программы под куполом' },
    'spb-yards': { countUnit: 'экскурсий', extras: 'дворы, парадные и коммуналки Петербурга' },
    'family-kids': { countUnit: 'мероприятий', extras: 'цирк, шоу и программы для детей' },
    'concerts-genre': { countUnit: 'концертов', extras: 'рок, джаз, классика и эстрада' },
    'moscow-museums': { countUnit: 'событий', extras: 'выставки, музеи и мастер-классы' },
    'active-sport': { countUnit: 'событий', extras: 'дрифт, гонки и активный отдых' },
  };

  const topic = input.landingTitle.trim() || slug.replace(/-/g, ' ');
  const defaults = defaultTopics[slug] || { countUnit: 'событий', extras: 'расписание и цены' };
  const citySuffix = cityName && !topic.toLowerCase().includes(cityName.toLowerCase()) ? ` — ${cityName}` : '';

  return seoResult(
    `${topic}${citySuffix}`,
    short,
    'афиша, цены и билеты',
    `${topic}${citySuffix} сегодня — купить билеты, афиша на ${full}`,
    `Актуальная афиша «${topic}»${cityName ? ` в ${cityName}` : ''} на сегодня. ` +
      eventsPhrase(events, defaults.countUnit) +
      pricePhrase(priceFrom) +
      `${defaults.extras}. Покупайте онлайн на Дайбилет!`,
  );
}

/** Обновляет document.title, meta, canonical и JSON-LD. */
/** On-page SEO текст под сеткой (fallback, если нет CMS SEO_TEXT). Без em/en dash. */
export function buildLandingOnPageSeoText(input: LandingSeoInput): string {
  const seo = resolveLandingSeo(input);
  const cityName = input.cityName?.trim() || null;
  const prep = input.cityPrep?.trim() || cityName || 'России';
  const events = resolveEventsCount(input);
  const priceFrom = input.stats?.priceFrom ?? null;
  const title = input.landingTitle?.trim() || seo.h1Lead.trim();

  const where = cityName ? `по ${prep}` : 'по городам России';
  const countPart =
    events > 0
      ? `В подборке сейчас ${events} вариантов с актуальным расписанием.`
      : 'Расписание обновляется по данным организаторов.';
  const pricePart =
    priceFrom && priceFrom > 0
      ? ` Цены стартуют примерно от ${roundPrice(priceFrom)} рублей - точная стоимость зависит от сеанса и категории билета.`
      : '';

  return (
    `${title.trim()} ${where}: сравните маршруты, время отправления и стоимость на одной странице. ` +
    `${countPart}${pricePart} ` +
    `Выберите удобную дату, откройте карточку предложения и перейдите к покупке. ` +
    `Оформление билета проходит в билетной системе организатора; Дайбилет помогает выбрать подходящий вариант и сохранить ссылку на событие. ` +
    `Если нужен другой город или формат, вернитесь к каталогу направлений или откройте хаб города с полной афишей.`
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function applyLandingSeoMeta(input: LandingSeoInput): LandingSeo {
  const seo = resolveLandingSeo(input);
  document.title = seo.title;
  setMetaTag('description', seo.description);
  setMetaTag('robots', 'index,follow');
  setMetaTag('og:title', seo.title);
  setMetaTag('og:description', seo.description);
  if (input.canonicalPath) {
    setMetaTag('og:url', absoluteUrl(input.canonicalPath));
    setLinkTag('canonical', absoluteUrl(input.canonicalPath));
  }
  if (input.breadcrumbItems?.length) {
    setJsonLd('daibilet-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: input.breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    });
  }
  if (input.faqItems?.length) {
    setJsonLd('daibilet-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: input.faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: stripHtmlForSchema(item.answer) },
      })),
    });
  }
  (input.jsonLdExtras || []).forEach((block, index) => {
    setJsonLd(`daibilet-ld-extra-${index}`, block);
  });
  return seo;
}

function stripHtmlForSchema(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function setLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setJsonLd(id: string, payload: Record<string, unknown>) {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
}

function setMetaTag(name: string, content: string) {
  const attr = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/** Текущая дата для H1; пересчитывается после полуночи (Europe/Moscow). */
export function useLandingTodayReference(timeZone: string = SITE_TIME_ZONE): Date {
  const [reference, setReference] = React.useState(() => new Date());

  React.useEffect(() => {
    let timeoutId = 0;
    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        setReference(new Date());
        schedule();
      }, msUntilNextMidnight(timeZone));
    };
    schedule();
    return () => window.clearTimeout(timeoutId);
  }, [timeZone]);

  return reference;
}
