import { cityToPrepositional, isSeoExpansionCity } from '@/lib/city-declension';
import { formatPublicTitle } from '@/lib/format-public-title';
import { listingSeoYear } from '@/lib/seo-listing-meta';
import { pageTitle } from '@/lib/seo-meta';

const MIN_META_PRICE_RUB = 100;
const DEFAULT_EVENT_SEO_SUFFIX = 'билеты и расписание';

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
  const title = formatPublicTitle(input.eventTitle) || 'событие';
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
  const title = formatPublicTitle(input.eventTitle) || 'событие';
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

function includesIgnoreCase(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return haystack.toLocaleLowerCase('ru-RU').includes(needle.toLocaleLowerCase('ru-RU'));
}

/**
 * Title события с disambiguator (площадка / город), чтобы TC-сессии с
 * одинаковым названием не получали один SERP title.
 * Возвращает core без `| Дайбилет` (его добавит template / share).
 *
 * 29.09: дата и время убраны. Раньше disambiguator был `[dateLabel, timeLabel]`
 * ближайшего сеанса, и заголовок менялся по мере расхода сеансов — у 3018 URL
 * заголовок был нестабилен с периодом в часы. На live это выглядело так:
 * «Речная прогулка от причала Киевский (вт, 29 сент., 18:07): билеты и
 * расписание». Площадка и город меняются гораздо реже, поэтому остаются
 * disambiguator'ами, а дата больше не участвует.
 *
 * H1 не связан с этой функцией: `EventPage.client.tsx` рендерит
 * `splitLongTitleAtBreak(heroTitle)` — чистый перенос строки по названию
 * события. Поэтому правка не задевает то, что видит пользователь.
 *
 * `dateLabel` / `timeLabel` оставлены в сигнатуре, чтобы вызывающая сторона
 * не менялась; на результат они больше не влияют.
 */
export function buildEventPageMetaTitle(input: {
  eventTitle: string;
  seoTitle?: string | null;
  cityName?: string | null;
  venueName?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
}): string {
  const eventTitle = formatPublicTitle(input.eventTitle) || 'Событие';
  const customRaw = pageTitle(String(input.seoTitle || '').trim());
  const custom = customRaw ? formatPublicTitle(customRaw) || customRaw : '';
  const venueName = String(input.venueName || '').trim();
  const cityName = String(input.cityName || '').trim();

  const base =
    custom && custom !== eventTitle && !custom.endsWith(DEFAULT_EVENT_SEO_SUFFIX)
      ? custom.replace(/\s*:\s*билеты и расписание\s*$/i, '').trim() || custom
      : eventTitle;

  const extras: string[] = [];
  const mentions = (value: string) =>
    // Both cases: names usually spell a city declined ("в Москве") while the
    // field holds the nominative ("Москва"), so a nominative-only check misses it
    // and the city is appended a second time.
    includesIgnoreCase(base, value) || includesIgnoreCase(base, cityToPrepositional(value));

  if (venueName && !mentions(venueName)) {
    extras.push(venueName);
  } else if (cityName && !mentions(cityName)) {
    extras.push(cityName);
  }

  const withExtras = extras.length ? `${base} (${extras.join(', ')})` : base;
  if (/билеты и расписание/i.test(withExtras)) return pageTitle(withExtras);
  return `${withExtras}: ${DEFAULT_EVENT_SEO_SUFFIX}`;
}
