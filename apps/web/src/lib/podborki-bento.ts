/**
 * Bento span for `/podborki` catalog tiles.
 * Featured / seasonal / top → 2 cols; niche (standup…) → 1.
 */

/** Always wide: river, city-day, seasonal pins, national «top» tours. */
const BENTO_WIDE_SLUGS = new Set<string>([
  'moscow-city-day',
  'river-cruises',
  'bridges-night',
  'moscow-museums',
  'bus-tours',
  'family-kids',
  'new-year',
  'salute-9-may',
]);

/** Always narrow: niche entertainment. */
const BENTO_NARROW_SLUGS = new Set<string>([
  'standup',
  'planetarium',
  'unusual-theatres',
  'active-sport',
  'rooftops',
  'concerts-genre',
  'river-party',
  'moscow-dinner-boat',
  'spb-yards',
  'walking-tours',
  'excursions',
  'country-tours',
  'exhibitions',
]);

export type PodborkiBentoItem = {
  slug: string;
  events?: number;
  categorySlug?: string | null;
  layoutVariant?: string | null;
};

export type PodborkiBentoSpan = 1 | 2;

/**
 * Span in a 4-col desktop bento (mobile collapses to 1–2 cols via CSS).
 * Wide = featured/seasonal/top; narrow = niche.
 */
export function podborkiBentoSpan(item: PodborkiBentoItem): PodborkiBentoSpan {
  const slug = item.slug;
  if (BENTO_NARROW_SLUGS.has(slug)) return 1;
  if (BENTO_WIDE_SLUGS.has(slug)) return 2;

  const cat = String(item.categorySlug || '').trim();
  if (cat === 'seasonal') return 2;

  // High-traffic fallback: treat as «топ».
  if (typeof item.events === 'number' && item.events >= 40) return 2;
  return 1;
}

export function podborkiBentoCellClass(span: PodborkiBentoSpan): string {
  if (span === 2) {
    return 'col-span-1 row-span-1 min-h-[12.5rem] md:col-span-2 md:min-h-[14rem]';
  }
  return 'col-span-1 row-span-1 min-h-[11rem] md:min-h-[12.5rem]';
}

/** Tailwind grid shell for bento sections (home + /podborki). */
export const PODBORKI_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4 auto-rows-fr';
