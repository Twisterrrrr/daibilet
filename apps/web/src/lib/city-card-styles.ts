/** Чуть выше 16:9 - единый ритм карточек в rail / сетке. */
export const CITY_CARD_ASPECT_CLASS = 'aspect-[5/3]';

/**
 * Full-width bottom scrim under city name/stats (dark tone cards).
 * Linear gradient only - never radial/oval blobs that leak past the photo.
 */
export const CITY_CARD_DARK_SCRIM_CLASS =
  'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent';


/** Одна строка: длинные имена (Нижний Новгород) не ломают высоту блока. */
export const CITY_CARD_TITLE_CLASS =
  'truncate whitespace-nowrap text-sm font-bold leading-none tracking-tight text-white sm:text-base';
/** Home rail / listing: чуть компактнее, чтобы «Нижний Новгород» держался в одну линию как «Санкт-Петербург». */
export const CITY_CARD_TITLE_LARGE_CLASS =
  'truncate whitespace-nowrap text-sm font-bold leading-none tracking-tight text-white sm:text-base';

export const CITY_CARD_TITLE_LIGHT_CLASS =
  'truncate whitespace-nowrap text-sm font-bold leading-none tracking-tight text-slate-900 sm:text-base';
export const CITY_CARD_TITLE_LIGHT_LARGE_CLASS =
  'truncate whitespace-nowrap text-sm font-bold leading-none tracking-tight text-slate-900 sm:text-base';

export function cityCardTitleClass(
  variant: 'compact' | 'large' = 'compact',
  tone: 'dark' | 'light' = 'dark',
): string {
  if (tone === 'light') {
    return variant === 'large' ? CITY_CARD_TITLE_LIGHT_LARGE_CLASS : CITY_CARD_TITLE_LIGHT_CLASS;
  }
  return variant === 'large' ? CITY_CARD_TITLE_LARGE_CLASS : CITY_CARD_TITLE_CLASS;
}
