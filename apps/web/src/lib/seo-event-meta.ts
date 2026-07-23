import { cityToPrepositional, isSeoExpansionCity } from '@/lib/city-declension';
import { listingSeoYear } from '@/lib/seo-listing-meta';

const MIN_META_PRICE_RUB = 100;

export function resolveEventMetaMinPrice(priceFrom?: number | null): number | null {
  if (typeof priceFrom !== 'number' || !Number.isFinite(priceFrom)) return null;
  if (priceFrom < MIN_META_PRICE_RUB) return null;
  return Math.round(priceFrom);
}

/**
 * Шаблон №3 для Казани / Екатеринбурга.
 * Title: `Билеты на {Название} в {City_Пр} - расписание, цены от {Цена} руб.`
 * без цены: `Билеты на {Название} в {City_Пр} - расписание и цены`
 */
export function buildEventCityMetaTitle(input: {
  eventTitle: string;
  cityName: string;
  priceFrom?: number | null;
}): string {
  const title = String(input.eventTitle || '').trim() || 'событие';
  const cityPrep = cityToPrepositional(String(input.cityName || '').trim() || 'городе');
  const price = resolveEventMetaMinPrice(input.priceFrom);
  if (price != null) {
    return `Билеты на ${title} в ${cityPrep} - расписание, цены от ${price} руб.`;
  }
  return `Билеты на ${title} в ${cityPrep} - расписание и цены`;
}

/**
 * Description: `Купить билеты на {Название} в {City_Пр}. Расписание на {Год} год, … Daibilet.ru.`
 */
export function buildEventCityMetaDescription(input: {
  eventTitle: string;
  cityName: string;
  year?: number;
}): string {
  const title = String(input.eventTitle || '').trim() || 'событие';
  const cityPrep = cityToPrepositional(String(input.cityName || '').trim() || 'городе');
  const year = input.year ?? listingSeoYear();
  return (
    `Купить билеты на ${title} в ${cityPrep}. ` +
    `Расписание на ${year} год, подробная программа, отзывы участников и онлайн-бронирование на сайте Daibilet.ru.`
  );
}

export function buildEventListingMeta(input: {
  eventTitle: string;
  cityName?: string | null;
  citySlug?: string | null;
  sourceCitySlug?: string | null;
  priceFrom?: number | null;
  year?: number;
}): { title: string; description: string } | null {
  const cityName = String(input.cityName || '').trim();
  if (
    !isSeoExpansionCity({
      name: cityName || null,
      slug: input.citySlug,
      sourceSlug: input.sourceCitySlug,
    })
  ) {
    return null;
  }
  const resolvedName = cityName || 'городе';
  return {
    title: buildEventCityMetaTitle({
      eventTitle: input.eventTitle,
      cityName: resolvedName,
      priceFrom: input.priceFrom,
    }),
    description: buildEventCityMetaDescription({
      eventTitle: input.eventTitle,
      cityName: resolvedName,
      year: input.year,
    }),
  };
}
