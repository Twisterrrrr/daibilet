import type { PublicCityPageDto } from '@daibilet/contracts/public';

import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';
import { formatNumber, formatPriceFrom } from '@/lib/format';
import { resolveCityBrief } from '@/lib/cityInfo';
import { evaluateCityIndexability } from '@/lib/hub-indexability';

export type CityFaqItem = {
  question: string;
  answer: string;
};

/** FAQ только для indexable (не thin) городов — иначе пустой FAQPage вреден. */
export function buildCityFaqItems(payload: PublicCityPageDto): CityFaqItem[] {
  const decision = evaluateCityIndexability({
    events: payload.stats?.events ?? payload.city.events ?? 0,
    slug: payload.city.slug,
    sourceSlug: payload.city.sourceSlug,
    isIndexable: payload.city.isIndexable,
  });
  if (!decision.indexable) return [];

  const city = payload.city;
  const name = city.name;
  const prep = cityToPrepositional(name);
  const gen = cityToGenitive(name);
  const inCity = prep === name ? `в городе ${name}` : `в ${prep}`;
  const ofCity = gen === name ? `города ${name}` : gen;
  const events = payload.stats?.events ?? city.events ?? 0;
  const venues = payload.stats?.venues ?? city.venues ?? 0;
  const categories = Object.entries(city.categories || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => label);
  const priceFrom = payload.stats?.priceFrom;
  const topCategory = categories[0];

  const items: CityFaqItem[] = [
    {
      question: `Как купить билеты на события ${inCity}?`,
      answer:
        `На Дайбилете откройте карточку нужного события ${inCity}, выберите дату и тариф, затем оплатите у билетного оператора (Ticketscloud или Teplohod.info). Финансовый контур остаётся у поставщика — после оплаты билет приходит от него.`,
    },
    {
      question: `Сколько событий сейчас в афише ${ofCity}?`,
      answer:
        events > 0
          ? `Сейчас в каталоге ${formatNumber(events)} ${pluralEventsWord(events)}${venues > 0 ? ` на ${formatNumber(venues)} ${pluralVenuesWord(venues)}` : ''}${topCategory ? `. Популярные направления: ${categories.join(', ')}.` : '.'}`
          : `Афиша ${ofCity} обновляется по мере появления сеансов. Загляните позже или посмотрите соседние города.`,
    },
  ];

  if (priceFrom && priceFrom > 0) {
    items.push({
      question: `Какие цены на билеты ${inCity}?`,
      answer: `Минимальная цена в текущей подборке — ${formatPriceFrom(priceFrom)}. Итоговая стоимость зависит от даты, тарифа и площадки; актуальная цена всегда на карточке события перед оплатой.`,
    });
  }

  items.push({
    question: `Можно ли выбрать площадку или категорию ${inCity}?`,
    answer:
      venues > 0 || categories.length
        ? `Да: на странице города есть фильтры по категориям${venues > 0 ? ', блок площадок' : ''} и расписание. Можно сразу перейти к площадке или тематической подборке, если она есть для ${ofCity}.`
        : `Да: откройте каталог событий с фильтром по городу ${name} и уточните категорию или дату.`,
  });

  items.push({
    question: `Нужна ли регистрация на Дайбилете, чтобы купить билет ${inCity}?`,
    answer:
      'Для покупки через виджет поставщика отдельная регистрация на Дайбилете не обязательна. Аккаунт Дайбилета удобен, если хотите сохранять избранное и смотреть историю заказов в личном кабинете.',
  });

  return items;
}

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
  const prep = cityToPrepositional(city.name);
  const inCity = prep === city.name ? `в городе ${city.name}` : `в ${prep}`;
  const events = payload.stats?.events ?? city.events ?? 0;
  const venues = payload.stats?.venues ?? city.venues ?? 0;
  const priceFrom = payload.stats?.priceFrom;

  const parts = [
    brief,
    events > 0
      ? `В афише Дайбилета — ${formatNumber(events)} ${pluralEventsWord(events)}${venues > 0 ? ` и ${formatNumber(venues)} ${pluralVenuesWord(venues)}` : ''} ${inCity}.`
      : null,
    priceFrom && priceFrom > 0 ? `Билеты ${formatPriceFrom(priceFrom)}.` : null,
    'Сравнивайте даты и площадки, затем переходите к оплате у билетного оператора.',
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
