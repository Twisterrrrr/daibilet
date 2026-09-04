import { getSeasonalLanding } from '@/data/seasonal-landings';
import { formatBridgesSeoDescription, formatBridgesSeoTitle } from '@/lib/bridges-seo';
import { cityToPrepositional, resolveCityCases } from '@/lib/city-declension';
import { canonicalLandingSlug, isBridgesNightLandingSlug, isRiverPartyLandingSlug } from '@/lib/landing-constants';
import type { LandingProfileKind } from '@/lib/landing-copy';
import { formatLandingTodayParts, SITE_TIME_ZONE } from '@/lib/datetime';
import { resolveLandingTitleDateShort } from '@/lib/landing-event-windows';

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
  /** Форма города для «по …» (дательный) или fallback предложный. */
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
  /** Текст до «сегодня, …» - для разметки hero. */
  h1Lead: string;
  /** «сегодня, 5 июля» - не переносить отдельно от слова «сегодня». */
  h1Today: string;
  /** «: цены, расписание…» */
  h1Tail: string;
  title: string;
  description: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Убирает из ярлыка intent уже вшитый город и glue через em/en dash / « - ».
 * Нужно, чтобы не получить «Музеи в Москве — Москва».
 */
export function stripCityFromLandingTopic(topic: string, cityName?: string | null): string {
  let text = String(topic || '').trim();
  if (!text) return '';

  // Em/en dash glue: «Экскурсии — Москва», «Тема – что угодно»
  text = text.replace(/\s*[\u2013\u2014]\s*.+$/u, '').trim();
  // ASCII hyphen used as dash-glue before a capital/Cyrillic token
  text = text.replace(/\s+-\s+(?=[А-ЯЁA-Z])/u, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(/\s+-\s+[А-ЯЁA-Z][\wА-Яа-яЁё\-]*(?:\s+[А-ЯЁA-Z][\wА-Яа-яЁё\-]*)*$/u, '').trim();

  if (cityName?.trim()) {
    const cases = resolveCityCases(cityName);
    const forms = [
      ...new Set(
        [cases.nominative, cases.prepositional, cases.genitive, cases.accusative]
          .map((item) => String(item || '').trim())
          .filter(Boolean),
      ),
    ];
    if (forms.length) {
      const alt = forms.map(escapeRegExp).join('|');
      text = text.replace(new RegExp(`\\s*(?:в|по)\\s+(?:${alt})\\s*$`, 'iu'), '').trim();
      text = text.replace(new RegExp(`\\s+(?:${alt})\\s*$`, 'iu'), '').trim();
    }
  }

  text = text.replace(/\s+(?:в|по)\s+России\s*$/iu, '').trim();
  return text || String(topic || '').trim();
}

/** «Экскурсии в Москве» / «Речные прогулки по Москве» - город один раз, без тире. */
export function buildIntentCityLead(
  topic: string,
  cityName: string | null | undefined,
  options?: { preposition?: 'в' | 'по'; cityForm?: string | null },
): string {
  const preposition = options?.preposition || 'в';
  const base = stripCityFromLandingTopic(topic, cityName);
  if (!cityName?.trim()) return base;
  const form =
    String(options?.cityForm || '').trim() ||
    (preposition === 'в' ? cityToPrepositional(cityName) : cityToPrepositional(cityName));
  return `${base} ${preposition} ${form}`;
}

/** Только реальная цена оффера; без fallback «от 100» (не выдумываем). */
export function formatRealPriceRub(price?: number | null): number | null {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
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
  const value = formatRealPriceRub(price);
  if (value == null) return '';
  return `от ${value} рублей. `;
}

function cleanTitleSuffix(suffix: string): string {
  return String(suffix || '')
    .replace(/^[\s:：]+/u, '')
    .replace(/[\s:：]+$/u, '')
    .trim();
}

function buildH1Parts(
  base: string,
  short: string,
  suffix: string,
  options?: { useTodayWord?: boolean },
) {
  const cleaned = base
    .replace(/\s*сегодня[^:]*$/i, '')
    .replace(/[\s:：]+$/u, '')
    .trim();
  const cleanSuffix = cleanTitleSuffix(suffix);
  const useTodayWord = options?.useTodayWord !== false;
  const dateShort = String(short || '')
    .replace(/^[\s:：]+/u, '')
    .replace(/[\s:：]+$/u, '')
    .trim();
  const h1Lead = useTodayWord ? `${cleaned} ` : `${cleaned}, `;
  const h1Today = useTodayWord ? `сегодня, ${dateShort}` : dateShort;
  const h1Tail = cleanSuffix ? `: ${cleanSuffix}` : '';
  return {
    h1Lead,
    h1Today,
    h1Tail,
    h1: `${h1Lead}${h1Today}${h1Tail}`,
  };
}

/** Сезонные/праздничные H1 без «сегодня, DD месяца». */
function buildStaticH1Parts(base: string, suffix: string) {
  const cleaned = base
    .replace(/\s*сегодня[^:]*$/i, '')
    .replace(/[\s:：]+$/u, '')
    .trim();
  const cleanSuffix = cleanTitleSuffix(suffix);
  const h1Lead = cleaned;
  const h1Today = '';
  const h1Tail = cleanSuffix ? `: ${cleanSuffix}` : '';
  return {
    h1Lead,
    h1Today,
    h1Tail,
    h1: `${h1Lead}${h1Tail}`,
  };
}

/** H1 и document title совпадают: хвост даты/афиши сохраняем, без em dash. */
function seoResult(
  base: string,
  short: string,
  suffix: string,
  description: string,
  titleOverride?: string,
  options?: { useTodayWord?: boolean },
): LandingSeo {
  const parts = buildH1Parts(base, short, suffix, options);
  return { ...parts, title: titleOverride ?? parts.h1, description };
}

function staticSeoResult(
  base: string,
  suffix: string,
  title: string,
  description: string,
): LandingSeo {
  return { ...buildStaticH1Parts(base, suffix), title, description };
}

export function resolveLandingSeo(input: LandingSeoInput): LandingSeo {
  const slug = canonicalLandingSlug(input.slug);
  const profile = input.profile;
  const cityName = input.cityName?.trim() || null;
  const cityPrepForm =
    input.cityPrep?.trim() || (cityName ? cityToPrepositional(cityName) : '') || 'России';
  const timeZone = input.timeZone || SITE_TIME_ZONE;
  const { short: calendarShort, full } = formatLandingTodayParts(input.referenceDate, timeZone);
  const titleDate = resolveLandingTitleDateShort(slug, input.referenceDate || new Date(), timeZone);
  const short = titleDate.short || calendarShort;
  const useTodayWord = titleDate.useTodayWord;
  const events = resolveEventsCount(input);
  const priceFrom = input.stats?.priceFrom ?? null;

  if (profile === 'river') {
    if (cityName) {
      const lead = `Речные прогулки по ${cityPrepForm}`;
      return seoResult(
        lead,
        short,
        'цены, расписание и сравнение теплоходов',
        `Актуальное расписание и билеты на речные прогулки по ${cityPrepForm} на сегодня. ` +
          eventsPhrase(events, 'маршрутов') +
          pricePhrase(priceFrom) +
          'Сравнение теплоходов, круизы с ужином и ночные рейсы. Покупайте онлайн на Дайбилет!',
        undefined,
        { useTodayWord },
      );
    }
    return seoResult(
      'Речные прогулки по России',
      short,
      'цены, расписание и сравнение теплоходов',
      'Актуальное расписание речных прогулок по городам России на сегодня. ' +
        eventsPhrase(events, 'маршрутов') +
        pricePhrase(priceFrom) +
        'Сравнение теплоходов в 12 городах. Покупайте онлайн на Дайбилет!',
      undefined,
      { useTodayWord },
    );
  }

  if (profile === 'bus') {
    if (cityName) {
      const lead = `Обзорные автобусные экскурсии по ${cityPrepForm}`;
      return seoResult(
        lead,
        short,
        'цены, расписание и маршруты',
        `Актуальное расписание автобусных экскурсий по ${cityPrepForm} на сегодня. ` +
          eventsPhrase(events, 'маршрутов') +
          pricePhrase(priceFrom) +
          'Обзорные туры, Hop-On Hop-Off и двухэтажные автобусы. Покупайте онлайн на Дайбилет!',
        undefined,
        { useTodayWord },
      );
    }
    return seoResult(
      'Обзорные автобусные экскурсии по России',
      short,
      'цены, расписание и маршруты',
      'Актуальное расписание автобусных экскурсий в городах России на сегодня. ' +
        eventsPhrase(events, 'маршрутов') +
        pricePhrase(priceFrom) +
        'Сравнение обзорных туров в 11 городах. Покупайте онлайн на Дайбилет!',
      undefined,
      { useTodayWord },
    );
  }

  if (profile === 'dinner') {
    const riverLabel =
      cityName === 'Москва'
        ? 'Москве-реке'
        : cityName === 'Санкт-Петербург'
          ? 'Неве'
          : cityPrepForm;
    const h1Base = cityName
      ? cityName === 'Москва' || cityName === 'Санкт-Петербург'
        ? `Ужин на теплоходе по ${riverLabel}`
        : `Ужин на теплоходе в ${cityToPrepositional(cityName)}`
      : 'Ужин на теплоходе';
    const where = cityName ? `в ${cityToPrepositional(cityName)}` : 'в Москве';
    return seoResult(
      h1Base,
      short,
      'цены и расписание',
      `Актуальное расписание ужинов на теплоходе ${where} на сегодня. ` +
        eventsPhrase(events, 'программ') +
        pricePhrase(priceFrom) +
        'Сет-меню, фуршеты и вечерние круизы с видом на город. Покупайте онлайн на Дайбилет!',
      undefined,
      { useTodayWord },
    );
  }

  if (profile === 'bridges' || isBridgesNightLandingSlug(slug)) {
    const bridgesPriceFrom = input.stats?.priceFrom ?? null;
    const h1 = buildH1Parts(
      'Разводные мосты в Санкт-Петербурге',
      short,
      'сравнение рейсов, билеты и цены',
      { useTodayWord },
    );
    return {
      ...h1,
      title: formatBridgesSeoTitle(bridgesPriceFrom),
      description: formatBridgesSeoDescription(events, bridgesPriceFrom, full),
    };
  }

  if (profile === 'seasonal') {
    const meta = getSeasonalLanding(slug);
    const label = stripCityFromLandingTopic(meta?.breadcrumbLabel || input.landingTitle, cityName);

    // Новый год / зимние праздники: без «сегодня, дата» и без «точек обзора» (это салют).
    if (slug === 'new-year') {
      if (cityName) {
        const cityPrep = cityToPrepositional(cityName);
        return staticSeoResult(
          `Новый год в ${cityPrep}`,
          'куда сходить и купить билеты',
          `Новый год в ${cityPrep}: куда сходить и купить билеты | Дайбилет`,
          `Новогодние ёлки, шоу, экскурсии и праздничные программы в ${cityPrep}. ` +
            eventsPhrase(events, 'программ') +
            pricePhrase(priceFrom) +
            'Сравните даты и оформите билет онлайн на Дайбилет!',
        );
      }
      return staticSeoResult(
        'Новый год в России',
        'экскурсии, каникулы и праздничные программы',
        'Новый год в России: экскурсии, каникулы и праздничные программы | Дайбилет',
        'Новогодние ёлки, шоу, круизы и праздничные программы по городам России. ' +
          eventsPhrase(events, 'программ') +
          pricePhrase(priceFrom) +
          'Сравните варианты и купите билеты онлайн на Дайбилет!',
      );
    }

    // Салют 9 мая и прочие сезонные: тоже без «сегодня» (дата праздника != календарный today).
    if (cityName) {
      const cityPrep = cityToPrepositional(cityName);
      return staticSeoResult(
        `${label} в ${cityPrep}`,
        'лучшие точки обзора и экскурсии',
        `${label} в ${cityPrep}: точки обзора и экскурсии | Дайбилет`,
        `Программы «${label}» в ${cityPrep}: точки обзора, речные и автобусные экскурсии. ` +
          eventsPhrase(events, 'программ') +
          pricePhrase(priceFrom) +
          'Сравните варианты и купите билеты онлайн на Дайбилет!',
      );
    }
    return staticSeoResult(
      label,
      'лучшие точки обзора и экскурсии',
      `${label}: лучшие точки обзора и экскурсии | Дайбилет`,
      `Программы «${label}»: экскурсии и точки обзора в городах России. ` +
        eventsPhrase(events, 'программ') +
        pricePhrase(priceFrom) +
        'Сравните варианты и купите билеты онлайн на Дайбилет!',
    );
  }

  if (isRiverPartyLandingSlug(slug)) {
    const topic = cityName
      ? buildIntentCityLead('Вечеринки на теплоходе', cityName, { preposition: 'в' })
      : 'Вечеринки и дискотеки на теплоходе';
    return seoResult(
      topic,
      short,
      'DJ, расписание и цены',
      `Актуальное расписание вечеринок и дискотек на теплоходе${cityName ? ` в ${cityToPrepositional(cityName)}` : ''} на сегодня. ` +
        eventsPhrase(events, 'рейсов') +
        pricePhrase(priceFrom) +
        'DJ-сеты, живая музыка и ночные круизы. Покупайте онлайн на Дайбилет!',
      undefined,
      { useTodayWord },
    );
  }

  const defaultTopics: Record<string, { countUnit: string; extras: string }> = {
    standup: { countUnit: 'шоу', extras: 'комедийные вечера в барах и клубах' },
    planetarium: { countUnit: 'шоу', extras: 'мультимедийные программы под куполом' },
    'spb-yards': { countUnit: 'экскурсий', extras: 'дворы, парадные и коммуналки Санкт-Петербурга' },
    'family-kids': { countUnit: 'мероприятий', extras: 'цирк, шоу и программы для детей' },
    'concerts-genre': { countUnit: 'концертов', extras: 'рок, джаз, классика и эстрада' },
    'moscow-museums': { countUnit: 'событий', extras: 'выставки, музеи и мастер-классы' },
    'active-sport': { countUnit: 'событий', extras: 'дрифт, гонки и активный отдых' },
  };

  const rawTopic = input.landingTitle.trim() || slug.replace(/-/g, ' ');
  const defaults = defaultTopics[slug] || { countUnit: 'событий', extras: 'расписание и цены' };
  const lead = cityName
    ? buildIntentCityLead(rawTopic, cityName, { preposition: 'в' })
    : stripCityFromLandingTopic(rawTopic, null);

  return seoResult(
    lead,
    short,
    'афиша, цены и билеты',
    `Актуальная афиша «${stripCityFromLandingTopic(rawTopic, cityName)}»${cityName ? ` в ${cityToPrepositional(cityName)}` : ''} на сегодня. ` +
      eventsPhrase(events, defaults.countUnit) +
      pricePhrase(priceFrom) +
      `${defaults.extras}. Покупайте онлайн на Дайбилет!`,
    undefined,
    { useTodayWord },
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
  const realPrice = formatRealPriceRub(priceFrom);
  const pricePart =
    realPrice != null
      ? ` Цены стартуют примерно от ${realPrice} рублей - точная стоимость зависит от сеанса и категории билета.`
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
