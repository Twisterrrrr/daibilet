/**
 * Client intent tags for `/podborki`.
 * Map tag → landing slugs + light heuristics (no Prisma schema change).
 * Soft gray tags sit under the black category tabs (one row per active tab).
 */

import type { PodborkiCategorySlug } from '@/lib/podborki-categories';

export type PodborkiMoodId = 'romantic' | 'friends' | 'kids' | 'rain' | 'budget';

/** Moods + type/season intents folded into category tag rows. */
export type PodborkiTagId =
  | PodborkiMoodId
  | 'on-water'
  | 'tours'
  | 'culture'
  | 'shows'
  | 'holidays'
  | 'weekend';

export type PodborkiMoodMeta = {
  id: PodborkiMoodId;
  label: string;
};

export type PodborkiTagMeta = {
  id: PodborkiTagId;
  label: string;
};

export const PODBORKI_MOODS: readonly PodborkiMoodMeta[] = [
  { id: 'romantic', label: 'Для двоих' },
  { id: 'friends', label: 'С друзьями' },
  { id: 'kids', label: 'С детьми' },
  { id: 'rain', label: 'Под дождь' },
  { id: 'budget', label: 'Бюджетно' },
] as const;

/** Soft tags under primary category tabs - moods/quick intents folded in. */
export const PODBORKI_CATEGORY_TAGS: Record<PodborkiCategorySlug, readonly PodborkiTagMeta[]> = {
  'by-type': [
    { id: 'on-water', label: 'На воде' },
    { id: 'tours', label: 'Экскурсии' },
    { id: 'culture', label: 'Музеи и выставки' },
    { id: 'shows', label: 'Шоу и концерты' },
  ],
  'for-whom': [
    { id: 'kids', label: 'С детьми' },
    { id: 'friends', label: 'С друзьями' },
    { id: 'romantic', label: 'Для двоих' },
    { id: 'budget', label: 'Бюджетно' },
  ],
  seasonal: [
    { id: 'holidays', label: 'Праздники' },
    { id: 'weekend', label: 'На выходных' },
    { id: 'rain', label: 'Под дождь' },
  ],
};

/** Explicit slug allowlists per mood. */
export const PODBORKI_MOOD_SLUGS: Record<PodborkiMoodId, readonly string[]> = {
  romantic: [
    'river-cruises',
    'bridges-night',
    'moscow-dinner-boat',
    'rooftops',
    'river-party',
    'walking-tours',
    'spb-yards',
  ],
  friends: [
    'standup',
    'concerts-genre',
    'river-party',
    'active-sport',
    'rooftops',
    'unusual-theatres',
    'bus-tours',
  ],
  kids: [
    'family-kids',
    'planetarium',
    'moscow-museums',
    'bus-tours',
    'excursions',
    'country-tours',
    'moscow-city-day',
  ],
  rain: [
    'moscow-museums',
    'exhibitions',
    'planetarium',
    'unusual-theatres',
    'standup',
    'concerts-genre',
    'spb-yards',
  ],
  budget: [
    'walking-tours',
    'excursions',
    'exhibitions',
    'family-kids',
    'spb-yards',
    'moscow-museums',
  ],
};

/** Type / season tag allowlists (folded quick intents). */
export const PODBORKI_TAG_SLUGS: Record<
  Exclude<PodborkiTagId, PodborkiMoodId>,
  readonly string[]
> = {
  'on-water': ['river-cruises', 'bridges-night', 'moscow-dinner-boat', 'river-party'],
  tours: ['bus-tours', 'walking-tours', 'excursions', 'country-tours'],
  culture: ['moscow-museums', 'exhibitions', 'planetarium', 'spb-yards'],
  shows: ['standup', 'concerts-genre', 'unusual-theatres', 'rooftops'],
  holidays: ['new-year', 'salute-9-may', 'moscow-city-day'],
  weekend: [
    'family-kids',
    'river-cruises',
    'bus-tours',
    'rooftops',
    'bridges-night',
    'walking-tours',
    'active-sport',
  ],
};

const MOOD_SLUG_SET: Record<PodborkiMoodId, Set<string>> = {
  romantic: new Set(PODBORKI_MOOD_SLUGS.romantic),
  friends: new Set(PODBORKI_MOOD_SLUGS.friends),
  kids: new Set(PODBORKI_MOOD_SLUGS.kids),
  rain: new Set(PODBORKI_MOOD_SLUGS.rain),
  budget: new Set(PODBORKI_MOOD_SLUGS.budget),
};

const TAG_SLUG_SET: Record<Exclude<PodborkiTagId, PodborkiMoodId>, Set<string>> = {
  'on-water': new Set(PODBORKI_TAG_SLUGS['on-water']),
  tours: new Set(PODBORKI_TAG_SLUGS.tours),
  culture: new Set(PODBORKI_TAG_SLUGS.culture),
  shows: new Set(PODBORKI_TAG_SLUGS.shows),
  holidays: new Set(PODBORKI_TAG_SLUGS.holidays),
  weekend: new Set(PODBORKI_TAG_SLUGS.weekend),
};

const MOOD_IDS = new Set<string>(['romantic', 'friends', 'kids', 'rain', 'budget']);

function isMoodId(tag: PodborkiTagId): tag is PodborkiMoodId {
  return MOOD_IDS.has(tag);
}

const TITLE_HINTS: Record<PodborkiMoodId, RegExp> = {
  romantic: /романт|ужин|крыш|мост|прогулк|двоих|закат/i,
  friends: /стендап|концерт|пати|вечеринк|спорт|компани/i,
  kids: /дет|сем|планет|зоопарк|семей/i,
  rain: /музей|выставк|театр|крыт|дожд|indoor/i,
  budget: /бесплат|бюджет|пеш|прогулк/i,
};

export type PodborkiMoodItem = {
  slug: string;
  title?: string | null;
  priceFrom?: number | null;
  categorySlug?: string | null;
};

function matchesHeuristic(item: PodborkiMoodItem, mood: PodborkiMoodId): boolean {
  const slug = item.slug.toLowerCase();
  const title = String(item.title || '');
  if (TITLE_HINTS[mood].test(slug) || TITLE_HINTS[mood].test(title)) return true;

  if (mood === 'budget') {
    if (typeof item.priceFrom === 'number' && item.priceFrom === 0) return true;
    if (typeof item.priceFrom === 'number' && item.priceFrom > 0 && item.priceFrom <= 500) return true;
  }
  if (mood === 'kids' && (slug.includes('family') || slug.includes('kids') || slug.includes('planet'))) {
    return true;
  }
  if (mood === 'rain' && (slug.includes('museum') || slug.includes('exhibit') || slug.includes('theatre'))) {
    return true;
  }
  if (
    mood === 'romantic' &&
    (slug.includes('river') || slug.includes('bridge') || slug.includes('rooftop') || slug.includes('dinner'))
  ) {
    return true;
  }
  if (
    mood === 'friends' &&
    (slug.includes('standup') || slug.includes('concert') || slug.includes('party') || slug.includes('sport'))
  ) {
    return true;
  }
  return false;
}

export function landingMatchesMood(item: PodborkiMoodItem, mood: PodborkiMoodId | null | undefined): boolean {
  if (!mood) return true;
  if (MOOD_SLUG_SET[mood].has(item.slug)) return true;
  return matchesHeuristic(item, mood);
}

export function landingMatchesTag(item: PodborkiMoodItem, tag: PodborkiTagId | null | undefined): boolean {
  if (!tag) return true;
  if (isMoodId(tag)) return landingMatchesMood(item, tag);
  if (TAG_SLUG_SET[tag].has(item.slug)) return true;
  const slug = item.slug.toLowerCase();
  const title = String(item.title || '');
  if (tag === 'on-water') return /речн|теплоход|мост|вод|круиз|пати/i.test(slug + title);
  if (tag === 'tours') return /тур|экскур|автобус|пеш|загород/i.test(slug + title);
  if (tag === 'culture') return /музей|выставк|планет|двор/i.test(slug + title);
  if (tag === 'shows') return /стендап|концерт|театр|крыш|шоу/i.test(slug + title);
  if (tag === 'holidays') return /новый.?год|салют|день.?город|праздник/i.test(slug + title);
  if (tag === 'weekend') return /выходн|сем|речн|автобус|крыш|мост|прогулк|спорт/i.test(slug + title);
  return false;
}

export function filterPodborkiByMood<T extends PodborkiMoodItem>(
  items: T[],
  mood: PodborkiMoodId | null | undefined,
): T[] {
  if (!mood) return items;
  return items.filter((item) => landingMatchesMood(item, mood));
}

export function filterPodborkiByTag<T extends PodborkiMoodItem>(
  items: T[],
  tag: PodborkiTagId | null | undefined,
): T[] {
  if (!tag) return items;
  return items.filter((item) => landingMatchesTag(item, tag));
}
