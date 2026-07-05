import * as React from 'react';

import { getSeasonalLanding } from '@/data/seasonal-landings';
import { canonicalLandingSlug, isBridgesNightLandingSlug, isRiverPartyLandingSlug } from '@/lib/landing-slugs';
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
};

export type LandingSeo = {
  h1: string;
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

function withTodayDate(base: string, short: string, suffix: string): string {
  const cleaned = base.replace(/\s*сегодня[^:]*$/i, '').trim();
  return `${cleaned} сегодня, ${short}: ${suffix}`;
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
      const h1 = withTodayDate(
        `Речные прогулки по ${prep}`,
        short,
        'цены, расписание и сравнение теплоходов',
      );
      return {
        h1,
        title: `Речные прогулки по ${prep} сегодня — купить билеты на теплоход, расписание на ${full}`,
        description:
          `Актуальное расписание и билеты на речные прогулки по ${prep} на сегодня. ` +
          eventsPhrase(events, 'маршрутов') +
          pricePhrase(priceFrom) +
          'Сравнение теплоходов, круизы с ужином и ночные рейсы. Покупайте онлайн на Дайбилет!',
      };
    }
    const h1 = withTodayDate('Речные прогулки по России', short, 'цены, расписание и сравнение теплоходов');
    return {
      h1,
      title: `Речные прогулки по России сегодня — купить билеты на теплоход, расписание на ${full}`,
      description:
        'Актуальное расписание речных прогулок по городам России на сегодня. ' +
        eventsPhrase(events, 'маршрутов') +
        pricePhrase(priceFrom) +
        'Сравнение теплоходов в 12 городах. Покупайте онлайн на Дайбилет!',
    };
  }

  if (profile === 'bus') {
    if (cityName) {
      const h1 = withTodayDate(
        `Обзорные автобусные экскурсии по ${prep}`,
        short,
        'цены, расписание и маршруты',
      );
      return {
        h1,
        title: `Автобусные экскурсии ${cityName} сегодня — купить билеты, расписание на ${full}`,
        description:
          `Актуальное расписание автобусных экскурсий по ${prep} на сегодня. ` +
          eventsPhrase(events, 'маршрутов') +
          pricePhrase(priceFrom) +
          'Обзорные туры, Hop-On Hop-Off и двухэтажные автобусы. Покупайте онлайн на Дайбилет!',
      };
    }
    const h1 = withTodayDate(
      'Обзорные автобусные экскурсии по России',
      short,
      'цены, расписание и маршруты',
    );
    return {
      h1,
      title: `Автобусные экскурсии по России сегодня — купить билеты, расписание на ${full}`,
      description:
        'Актуальное расписание автобусных экскурсий в городах России на сегодня. ' +
        eventsPhrase(events, 'маршрутов') +
        pricePhrase(priceFrom) +
        'Сравнение обзорных туров в 11 городах. Покупайте онлайн на Дайбилет!',
    };
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
    const h1 = withTodayDate(h1Base, short, 'цены и расписание');
    return {
      h1,
      title: `Ужин на теплоходе ${cityName ? `— ${cityName}` : 'в Москве'} сегодня — забронировать круиз, расписание на ${full}`,
      description:
        `Актуальное расписание ужинов на теплоходе ${cityName ? `в ${cityName}` : 'в Москве'} на сегодня. ` +
        eventsPhrase(events, 'программ') +
        pricePhrase(priceFrom) +
        'Сет-меню, фуршеты и вечерние круизы с видом на город. Покупайте онлайн на Дайбилет!',
    };
  }

  if (profile === 'bridges' || isBridgesNightLandingSlug(slug)) {
    const h1 = withTodayDate('Ночные мосты Санкт-Петербурга', short, 'расписание рейсов и цены');
    return {
      h1,
      title: `Ночные мосты Санкт-Петербурга сегодня — купить билеты на теплоход, расписание на ${full}`,
      description:
        'Актуальное расписание ночных прогулок к разводным мостам Санкт-Петербурга на сегодня. ' +
        eventsPhrase(events, 'рейсов') +
        pricePhrase(priceFrom) +
        'Сравнение теплоходов, маршруты по Неве и каналам. Покупайте онлайн на Дайбилет!',
    };
  }

  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(slug);
    const label = meta?.breadcrumbLabel || input.landingTitle;
    if (cityName && meta) {
      const cityPrepSeasonal = input.cityPrep || cityName;
      const h1 = withTodayDate(`${label} в ${cityPrepSeasonal}`, short, 'точки обзора и экскурсии');
      return {
        h1,
        title: `${label} — ${cityName} сегодня: купить билеты, афиша на ${full}`,
        description:
          `Актуальная афиша программ «${label}» в ${cityName} на сегодня. ` +
          eventsPhrase(events, 'программ') +
          pricePhrase(priceFrom) +
          'Лучшие точки обзора и экскурсии. Покупайте онлайн на Дайбилет!',
      };
    }
    const h1 = withTodayDate(label, short, 'лучшие точки обзора и экскурсии');
    return {
      h1,
      title: `${label} сегодня — купить билеты, афиша на ${full}`,
      description:
        `Актуальная афиша «${label}» на сегодня. ` +
        eventsPhrase(events, 'программ') +
        pricePhrase(priceFrom) +
        'Сравнение экскурсий и точек обзора в городах России. Покупайте онлайн на Дайбилет!',
    };
  }

  if (isRiverPartyLandingSlug(slug)) {
    const topic = cityName ? `Вечеринки на теплоходе — ${cityName}` : 'Вечеринки и дискотеки на теплоходе';
    const h1 = withTodayDate(topic, short, 'DJ, расписание и цены');
    return {
      h1,
      title: `${topic} сегодня — купить билеты, расписание на ${full}`,
      description:
        `Актуальное расписание вечеринок и дискотек на теплоходе${cityName ? ` в ${cityName}` : ''} на сегодня. ` +
        eventsPhrase(events, 'рейсов') +
        pricePhrase(priceFrom) +
        'DJ-сеты, живая музыка и ночные круизы. Покупайте онлайн на Дайбилет!',
    };
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
  const h1 = withTodayDate(`${topic}${citySuffix}`, short, 'афиша, цены и билеты');

  return {
    h1,
    title: `${topic}${citySuffix} сегодня — купить билеты, афиша на ${full}`,
    description:
      `Актуальная афиша «${topic}»${cityName ? ` в ${cityName}` : ''} на сегодня. ` +
      eventsPhrase(events, defaults.countUnit) +
      pricePhrase(priceFrom) +
      `${defaults.extras}. Покупайте онлайн на Дайбилет!`,
  };
}

/** Обновляет document.title и meta description по динамическому SEO-шаблону. */
export function applyLandingSeoMeta(input: LandingSeoInput): LandingSeo {
  const seo = resolveLandingSeo(input);
  document.title = seo.title;
  setMetaTag('description', seo.description);
  setMetaTag('robots', 'index,follow');
  return seo;
}

function setMetaTag(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
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
