import { cityToPrepositional, inCityPrepositional, isSeoExpansionCity } from '@/lib/city-declension';
import { canonicalLandingSlug } from '@/lib/landing-constants';

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
  rooftops: { titleCategory: 'Прогулки по крышам', seekCategory: 'экскурсии по крышам' },
  'new-year': { titleCategory: 'Новогодние события', seekCategory: 'новогодние события' },
  'salute-9-may': { titleCategory: 'Салют 9 мая', seekCategory: 'салют 9 мая' },
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
 * Title (absolute, бренд уже внутри).
 * Казань/Екб: `{Категория} в {City_Пр} {Год}: купить билеты, расписание и цены на Дайбилет`
 * Остальные: `{Категория} в {City_Пр} {Год} - купить билеты, расписание и цены на Дайбилет`
 */
export function buildCategoryCityMetaTitle(input: {
  categoryTitle: string;
  cityName: string;
  year?: number;
}): string {
  const category = String(input.categoryTitle || '').trim() || 'События';
  const cityPrep = cityToPrepositional(String(input.cityName || '').trim() || 'городе');
  const year = input.year ?? listingSeoYear();
  if (isSeoExpansionCity(input.cityName)) {
    return `${category} в ${cityPrep} ${year}: купить билеты, расписание и цены на Дайбилет`;
  }
  return `${category} в ${cityPrep} ${year} - купить билеты, расписание и цены на Дайбилет`;
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
}): { title: string; description: string; labels: ListingCategoryLabels } {
  const labels = resolveListingCategoryLabels(input.landingSlug, input.fallbackTitle);
  return {
    labels,
    title: buildCategoryCityMetaTitle({
      categoryTitle: labels.titleCategory,
      cityName: input.cityName,
      year: input.year,
    }),
    description: buildCategoryCityMetaDescription({
      seekCategory: labels.seekCategory,
      categoryTitle: labels.titleCategory,
      cityName: input.cityName,
      year: input.year,
    }),
  };
}
