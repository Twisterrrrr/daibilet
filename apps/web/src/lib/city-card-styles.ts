/** Чуть выше 16:9 - хватает на 2 строки названия в узкой сетке. */
export const CITY_CARD_ASPECT_CLASS = 'aspect-[5/3]';

export const CITY_CARD_TITLE_CLASS = 'text-sm font-bold leading-snug text-white sm:text-base';
/** Home 6-col / listing: меньше text-2xl, иначе «Санкт-Петербург» режется overflow карточки. */
export const CITY_CARD_TITLE_LARGE_CLASS =
  'text-base font-bold leading-tight text-white sm:text-lg';

export function cityCardTitleClass(variant: 'compact' | 'large' = 'compact'): string {
  return variant === 'large' ? CITY_CARD_TITLE_LARGE_CLASS : CITY_CARD_TITLE_CLASS;
}
