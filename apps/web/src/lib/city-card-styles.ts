/** Чуть выше 16:9 - единый ритм карточек в rail / сетке. */
export const CITY_CARD_ASPECT_CLASS = 'aspect-[5/3]';

/** Semi-circle scrim under city name (dark tone cards). Mobile size locked; tighter on desktop grids. */
export const CITY_CARD_DARK_SCRIM_CLASS =
  'pointer-events-none absolute -bottom-[18%] -left-[22%] h-[78%] w-[78%] rounded-full bg-black/30 md:-bottom-[11%] md:-left-[15%] md:h-[56%] md:w-[56%] lg:-bottom-[9%] lg:-left-[13%] lg:h-[50%] lg:w-[50%] xl:h-[44%] xl:w-[44%]';


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
