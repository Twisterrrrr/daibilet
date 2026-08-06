import { cityToPrepositional, inCityPrepositional, isSeoExpansionCity } from '@/lib/city-declension';
import { formatLandingTodayParts, SITE_TIME_ZONE } from '@/lib/datetime';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import {
  resolveLandingEventWindow,
  resolveLandingTitleDateShort,
} from '@/lib/landing-event-windows';
import { stripCityFromLandingTopic } from '@/lib/landing-seo';

/**
 * Порог коммерческой SEO-страницы: ниже - noindex,follow (страница жива для UX).
 * Держим 6: база ~2400 событий, но Екб (~57) и Казань (~51) скромные -
 * порог 10-12 срежет половину их category×city посадок. Soft-цель = 10.
 */
export const MIN_LISTING_OFFERS_FOR_INDEX = 6;

/** Soft quality: ориентир для контент-планов, не жёсткий порог. */
export const SOFT_LISTING_OFFERS_TARGET = 10;

/**
 * Thin-content trick: ровно 6 или 7 офферов на indexable CHPU -
 * дополнительно к «Смотрите также» показываем карточки смежных категорий.
 */
export function shouldShowThinRelatedCards(offers: number): boolean {
  const n = Number(offers) || 0;
  return n === 6 || n === 7;
}

/** Пустая секция (0 активных): SSR/CSR related hits для empty-state cross-sell. */
export function shouldLoadEmptyRelatedHits(offers: number): boolean {
  return (Number(offers) || 0) === 0;
}

/** Загрузка related hit sessions: thin (6–7) или полный empty (0). */
export function shouldLoadRelatedHitSessions(offers: number): boolean {
  return shouldShowThinRelatedCards(offers) || shouldLoadEmptyRelatedHits(offers);
}

export type ListingIndexDecision = {
  indexable: boolean;
  thin: boolean;
  reason: 'enough_offers' | 'low_offer_count' | 'zero_offers' | 'explicit_noindex';
  offers: number;
};

export function evaluateListingIndexability(input: {
  offers: number;
  isIndexable?: boolean | null;
  /** Override порога (например, intent без города). */
  minOffers?: number;
}): ListingIndexDecision {
  if (input.isIndexable === false) {
    return {
      indexable: false,
      thin: true,
      reason: 'explicit_noindex',
      offers: Number(input.offers) || 0,
    };
  }

  const offers = Number(input.offers) || 0;
  const min = input.minOffers ?? MIN_LISTING_OFFERS_FOR_INDEX;

  if (offers <= 0) {
    return { indexable: false, thin: true, reason: 'zero_offers', offers };
  }
  if (offers < min) {
    return { indexable: false, thin: true, reason: 'low_offer_count', offers };
  }

  return { indexable: true, thin: false, reason: 'enough_offers', offers };
}

export function robotsForListingIndexability(indexable: boolean): { index: boolean; follow: boolean } {
  return indexable ? { index: true, follow: true } : { index: false, follow: true };
}

/** Человекочитаемые ярлыки категории для Title / Description. */
export type ListingCategoryLabels = {
  /** «Концерты», «Речные прогулки» - для Title. */
  titleCategory: string;
  /** «концерты», «речные прогулки» - для «Ищете …». */
  seekCategory: string;
};

const CATEGORY_LABELS: Record<string, ListingCategoryLabels> = {
  'river-cruises': { titleCategory: 'Речные прогулки', seekCategory: 'речные прогулки' },
  'bus-tours': { titleCategory: 'Автобусные экскурсии', seekCategory: 'автобусные экскурсии' },
  'river-party': { titleCategory: 'Вечеринки на теплоходе', seekCategory: 'вечеринки на теплоходе' },
  'bridges-night': { titleCategory: 'Разводные мосты', seekCategory: 'разводные мосты' },
  standup: { titleCategory: 'Стендап', seekCategory: 'стендап' },
  'family-kids': { titleCategory: 'Детские мероприятия', seekCategory: 'детские мероприятия' },
  'concerts-genre': { titleCategory: 'Концерты', seekCategory: 'концерты' },
  'active-sport': { titleCategory: 'Активный отдых', seekCategory: 'активный отдых' },
  'walking-tours': { titleCategory: 'Пешие экскурсии', seekCategory: 'пешие экскурсии' },
  'country-tours': { titleCategory: 'Загородные экскурсии', seekCategory: 'загородные экскурсии' },
  exhibitions: { titleCategory: 'Выставки и музеи', seekCategory: 'выставки и музеи' },
  'unusual-theatres': { titleCategory: 'Необычные театры', seekCategory: 'необычные театры' },
  excursions: { titleCategory: 'Экскурсии', seekCategory: 'экскурсии' },
  rooftops: { titleCategory: 'Смотровые площадки', seekCategory: 'смотровые площадки' },
  'new-year': { titleCategory: 'Новогодние события', seekCategory: 'новогодние события' },
  'salute-9-may': { titleCategory: 'Салют 9 мая', seekCategory: 'салют 9 мая' },
  'moscow-city-day': { titleCategory: 'День города', seekCategory: 'день города' },
  'moscow-museums': { titleCategory: 'Музеи и выставки', seekCategory: 'музеи и выставки' },
  'moscow-dinner-boat': { titleCategory: 'Ужин на теплоходе', seekCategory: 'ужин на теплоходе' },
  'spb-yards': { titleCategory: 'Экскурсии по дворам', seekCategory: 'экскурсии по дворам' },
  planetarium: { titleCategory: 'Планетарий', seekCategory: 'программы планетария' },
};

export function resolveListingCategoryLabels(
  landingSlug: string,
  fallbackTitle?: string | null,
): ListingCategoryLabels {
  const slug = canonicalLandingSlug(landingSlug);
  const known = CATEGORY_LABELS[slug];
  if (known) return known;
  const raw = String(fallbackTitle || slug.replace(/-/g, ' ')).trim() || 'События';
  return {
    titleCategory: raw,
    seekCategory: raw.charAt(0).toLowerCase() + raw.slice(1),
  };
}

export function listingSeoYear(referenceDate: Date = new Date()): number {
  return referenceDate.getFullYear();
}

/**
 * Title (absolute).
 * Pattern: `{Категория} в {City_Пр} сегодня, {date}: афиша, цены и билеты`
 * Without em/en dash; city once in prepositional; holiday landings use window date when outside season.
 */
export function buildCategoryCityMetaTitle(input: {
  categoryTitle: string;
  cityName: string;
  year?: number;
  referenceDate?: Date;
  timeZone?: string;
  landingSlug?: string;
}): string {
  const cityRaw = String(input.cityName || '').trim() || 'городе';
  const intent = stripCityFromLandingTopic(String(input.categoryTitle || '').trim() || 'События', cityRaw);
  const cityPrep = cityToPrepositional(cityRaw);
  const timeZone = input.timeZone || SITE_TIME_ZONE;
  const reference = input.referenceDate || new Date();
  const titleDate = input.landingSlug
    ? resolveLandingTitleDateShort(input.landingSlug, reference, timeZone)
    : {
        short: formatLandingTodayParts(reference, timeZone).short,
        useTodayWord: true,
        window: resolveLandingEventWindow('', reference),
      };
  const datePart = titleDate.useTodayWord
    ? `сегодня, ${titleDate.short}`
    : titleDate.short;
  return `${intent} в ${cityPrep} ${datePart}: афиша, цены и билеты`;
}

/**
 * Description.
 * Казань/Екб: `Актуальная афиша категории {Категория} в {City_Пр} на {Год} год. … Daibilet.ru!`
 * Остальные: `Ищете [категорию] в [Городе]? Актуальная афиша на Дайбилет: …`
 */
export function buildCategoryCityMetaDescription(input: {
  seekCategory: string;
  cityName: string;
  /** Title-case ярлык категории (для шаблона Казань/Екб). */
  categoryTitle?: string;
  year?: number;
}): string {
  const cityRaw = String(input.cityName || '').trim() || 'городе';
  if (isSeoExpansionCity(cityRaw)) {
    const category =
      String(input.categoryTitle || input.seekCategory || '').trim() || 'события';
    const cityPrep = cityToPrepositional(cityRaw);
    const year = input.year ?? listingSeoYear();
    return (
      `Актуальная афиша категории ${category} в ${cityPrep} на ${year} год. ` +
      `Удобный выбор мест, билеты без наценок и честные отзывы. Заходите и бронируйте на Daibilet.ru!`
    );
  }
  const seek = String(input.seekCategory || '').trim() || 'события';
  const inCity = inCityPrepositional(cityRaw);
  return (
    `Ищете ${seek} ${inCity}? Актуальная афиша на Дайбилет: честные отзывы, удобный выбор мест, билеты без переплат. Заходите и бронируйте!`
  );
}

export function buildCategoryCityListingMeta(input: {
  landingSlug: string;
  cityName: string;
  fallbackTitle?: string | null;
  year?: number;
  referenceDate?: Date;
  /** Реальный min priceFrom из офферов; без выдуманных цен. */
  priceFrom?: number | null;
}): { title: string; description: string; labels: ListingCategoryLabels } {
  const labels = resolveListingCategoryLabels(input.landingSlug, input.fallbackTitle);
  const description = appendRealPriceToDescription(
    buildCategoryCityMetaDescription({
      seekCategory: labels.seekCategory,
      categoryTitle: labels.titleCategory,
      cityName: input.cityName,
      year: input.year,
    }),
    input.priceFrom,
  );
  return {
    labels,
    title: buildCategoryCityMetaTitle({
      categoryTitle: labels.titleCategory,
      cityName: input.cityName,
      year: input.year,
      referenceDate: input.referenceDate,
      landingSlug: input.landingSlug,
    }),
    description,
  };
}

/**
 * Добавляет «Цены от N рублей.» только при реальном priceFrom > 0.
 * Не дублирует, если в тексте уже есть «от N».
 */
export function appendRealPriceToDescription(
  description: string,
  priceFrom?: number | null,
): string {
  const base = String(description || '').trim();
  const price = Number(priceFrom);
  if (!base || !Number.isFinite(price) || price <= 0) return base;
  if (/(?:^|[^\wА-Яа-яЁё])от\s+\d[\d\s]*\s*руб/i.test(base)) return base;
  return `${base} Цены от ${Math.round(price)} рублей.`;
}
