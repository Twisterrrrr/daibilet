/** Чуть выше 16:9 - единый ритм карточек в rail / сетке. */
export const CITY_CARD_ASPECT_CLASS = 'aspect-[5/3]';

/**
 * Bottom-left darkening under city name/stats (dark tone cards).
 * Inset radial only - the old absolute oval used negative % and leaked below the photo onto tags.
 */
export const CITY_CARD_DARK_SCRIM_CLASS =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_80%_at_18%_100%,rgba(0,0,0,0.48)_0%,rgba(0,0,0,0.22)_42%,transparent_72%)]';


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
