export type EventSeoOverride = {
  title: string;
  h1: string;
};

/**
 * Route-specific names for EventPages that share an event title across distinct
 * venues or show dates. Values are grounded in the published page records.
 */
const EVENT_SEO_OVERRIDES: Record<string, EventSeoOverride> = {
  'bolshoi-stand-up-koncert-moskva-4': {
    title: 'Большой Stand Up в COMEDY 34',
    h1: 'Большой Stand Up в COMEDY 34',
  },
  'bolshoi-stand-up-moskva-8': {
    title: 'Большой Stand Up в Comedy Hub Club',
    h1: 'Большой Stand Up в Comedy Hub Club',
  },
  'tataro-bashkirskaya-chak-chak-diskoteka-ufa': {
    title: 'Чак-чак дискотека в клубе «Огни Уфы»',
    h1: 'Чак-чак дискотека в клубе «Огни Уфы»',
  },
  'tataro-bashkirskaya-chak-chak-diskoteka-ufa-2': {
    title: 'Чак-чак дискотека в «Доме Печати» - 30 декабря',
    h1: 'Чак-чак дискотека в «Доме Печати» - 30 декабря',
  },
  'tataro-bashkirskaya-chak-chak-diskoteka-ufa-3': {
    title: 'Чак-чак дискотека в «Доме Печати» - 5 января',
    h1: 'Чак-чак дискотека в «Доме Печати» - 5 января',
  },
};

export function eventSeoOverride(slug: string | null | undefined): EventSeoOverride | null {
  const key = String(slug || '').trim().toLowerCase();
  return key ? EVENT_SEO_OVERRIDES[key] || null : null;
}
