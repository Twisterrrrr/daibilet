/** Чуть выше 16:9 - хватает на 2 строки названия в узкой сетке. */
export const CITY_CARD_ASPECT_CLASS = 'aspect-[5/3]';

/** Default listing title - readable, fits «Санкт-Петербург» / «Нижний Новгород». */
export const CITY_CARD_TITLE_CLASS =
  'text-[13px] font-bold leading-tight tracking-tight text-white sm:text-sm';
/** Compact/home tiles - smaller than display so long names stay inside the card. */
export const CITY_CARD_TITLE_LARGE_CLASS =
  'text-sm font-bold leading-tight tracking-tight text-white sm:text-base';

export function cityCardTitleClass(variant: 'compact' | 'large' = 'compact'): string {
  return variant === 'large' ? CITY_CARD_TITLE_LARGE_CLASS : CITY_CARD_TITLE_CLASS;
}
