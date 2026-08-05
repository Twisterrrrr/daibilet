/**
 * Client mood filters for `/podborki`.
 * Map mood → landing slugs + light heuristics (no Prisma schema change).
 */

export type PodborkiMoodId = 'romantic' | 'friends' | 'kids' | 'rain' | 'budget';

export type PodborkiMoodMeta = {
  id: PodborkiMoodId;
  label: string;
};

export const PODBORKI_MOODS: readonly PodborkiMoodMeta[] = [
  { id: 'romantic', label: 'Романтическое' },
  { id: 'friends', label: 'С друзьями' },
  { id: 'kids', label: 'С детьми' },
  { id: 'rain', label: 'Под дождь' },
  { id: 'budget', label: 'Бюджетно' },
] as const;

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

const MOOD_SLUG_SET: Record<PodborkiMoodId, Set<string>> = {
  romantic: new Set(PODBORKI_MOOD_SLUGS.romantic),
  friends: new Set(PODBORKI_MOOD_SLUGS.friends),
  kids: new Set(PODBORKI_MOOD_SLUGS.kids),
  rain: new Set(PODBORKI_MOOD_SLUGS.rain),
  budget: new Set(PODBORKI_MOOD_SLUGS.budget),
};

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

export function filterPodborkiByMood<T extends PodborkiMoodItem>(
  items: T[],
  mood: PodborkiMoodId | null | undefined,
): T[] {
  if (!mood) return items;
  return items.filter((item) => landingMatchesMood(item, mood));
}
