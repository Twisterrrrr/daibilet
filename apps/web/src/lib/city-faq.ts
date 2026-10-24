import type { PublicCityPageDto } from '@daibilet/contracts/public';

import { cityToGenitive, inCityPrepositional } from '@/lib/city-declension';
import { formatNumber, formatPriceFrom } from '@/lib/format';
import { resolveCityBrief, resolveCityInfo } from '@/lib/cityInfo';
import { evaluateCityIndexability } from '@/lib/hub-indexability';

export type CityFaqItem = {
  question: string;
  answer: string;
};

/** One list for visible FAQ and FAQPage JSON-LD. */
export function mergeCityFaqItems(
  editorial: Array<{ q: string; a: string }> | undefined,
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

export function defaultCityFaq(cityName: string): CityFaqItem[] {
  return [
    {
      question: `Нужно ли покупать билеты заранее в ${cityName}?`,
      answer: 'На популярные экскурсии и вечерние шоу лучше брать билеты онлайн заранее - особенно в выходные и высокий сезон. Так вы фиксируете цену и не стоите в кассе.',
    },
    {
      question: 'Как удобнее спланировать один день в городе?',
      answer: 'Начните с блока «Главные места», затем откройте афишу на сегодня или завтра.',
    },
    {
      question: 'Где смотреть логистику и сезон?',
      answer: 'Короткие ответы - в разделе «Лайфхаки» (если есть у города) и в блоке FAQ и блога внизу страницы.',
    },
  ];
}

export function visibleCityFaqItems(cityName: string, editorial: Array<{ q: string; a: string }> | undefined, cityFaq: CityFaqItem[]): CityFaqItem[] {
  const merged = mergeCityFaqItems(editorial, cityFaq);
  return merged.length ? merged : defaultCityFaq(cityName);
}

/** Редакционный FAQ из CITY_INFO (как добраться / городские вопросы). */
export function buildCityEditorialFaqItems(payload: PublicCityPageDto): CityFaqItem[] {
  const info = resolveCityInfo(payload.city.slug, payload.city.sourceSlug);
  if (!info?.faq?.length) return [];
  return info.faq.map((item) => ({ question: item.q, answer: item.a }));
}

/**
 * FAQ для city hub: только city-specific (cityInfo.faq / editorial).
 * Платформенные вопросы про Дайбилет (цены, регистрация, фильтры) сюда не входят.
 * Если у города нет city FAQ — пустой массив (секция `#faq` скрывается).
 */
export function buildCityFaqItems(payload: PublicCityPageDto): CityFaqItem[] {
  const decision = evaluateCityIndexability({
    events: payload.stats?.events ?? payload.city.events ?? 0,
    slug: payload.city.slug,
    sourceSlug: payload.city.sourceSlug,
    isIndexable: payload.city.isIndexable,
  });
  if (!decision.indexable) return [];

  return buildCityEditorialFaqItems(payload);
}

/**
 * Короткий human-first блок внизу хаба (`#seo`).
 * Без «прослойки к оператору» и без SEO-простыни: brief + счётчики + CTA покупки.
 */
export function buildCitySeoText(payload: PublicCityPageDto): string | null {
  const decision = evaluateCityIndexability({
    events: payload.stats?.events ?? payload.city.events ?? 0,
    slug: payload.city.slug,
    sourceSlug: payload.city.sourceSlug,
    isIndexable: payload.city.isIndexable,
  });
  if (!decision.indexable) return null;

  const city = payload.city;
  const brief = resolveCityBrief(city.slug, city.sourceSlug, city.name);
  const inCity = inCityPrepositional(city.name);
  const cityGen = cityToGenitive(city.name);
  const events = payload.stats?.events ?? city.events ?? 0;
  const venues = payload.stats?.venues ?? city.venues ?? 0;
  const priceFrom = payload.stats?.priceFrom;

  const parts = [
    brief || `Афиша и билеты ${inCity}: экскурсии, музеи, концерты и шоу на одной витрине.`,
    events > 0
      ? `Сейчас в каталоге ${cityGen} - ${formatNumber(events)} ${pluralEventsWord(events)}${venues > 0 ? ` на ${formatNumber(venues)} ${pluralVenuesWord(venues)}` : ''}.`
      : null,
    priceFrom && priceFrom > 0 ? `Билеты ${formatPriceFrom(priceFrom)}. Купите билет онлайн за пару кликов.` : 'Выберите событие и купите билет онлайн.',
  ].filter(Boolean);

  return parts.join(' ');
}

function pluralEventsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'событий';
  if (mod10 === 1) return 'событие';
  if (mod10 >= 2 && mod10 <= 4) return 'события';
  return 'событий';
}

function pluralVenuesWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'площадок';
  if (mod10 === 1) return 'площадка';
  if (mod10 >= 2 && mod10 <= 4) return 'площадки';
  return 'площадок';
}
