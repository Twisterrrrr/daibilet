type NewYearCandidate = {
  title?: string | null;
  category?: string | null;
  catalogCategory?: string | { title?: string; slug?: string } | null;
  catalogSubcategory?: string | { title?: string; slug?: string } | null;
  tags?: string[];
  tagLabels?: string[];
  subcategories?: string[];
};

function taxonomyText(value: NewYearCandidate['catalogCategory']): string {
  return typeof value === 'string' ? value : `${value?.title || ''} ${value?.slug || ''}`;
}

const NEW_YEAR_SIGNAL = /новогод|новый\s+год|ёлк|елк|рождеств|christmas|xmas|new\s*year/u;
const STAND_UP_SIGNAL = /stand\s*[-–—]?\s*up|стендап/u;
const CHRISTMAS_STREET_SIGNAL = /\b(?:на|улица|улице|ул\.?|проспект|проспекте|пр-т)\s+рождественской\b/giu;

/**
 * Require an explicit holiday signal for the seasonal landing. The catalog's
 * `new-year` landing rule already narrows the source set by title; this second
 * check guards the preview from false positives such as a stand-up venue on
 * Rozhdestvenskaya Street. Generic event dates/categories are not signals.
 */
export function isRelevantToNewYearLanding(event: NewYearCandidate): boolean {
  const title = String(event.title || '').toLocaleLowerCase('ru');
  const allText = [
    title,
    event.category,
    taxonomyText(event.catalogCategory),
    taxonomyText(event.catalogSubcategory),
    ...(event.tags || []),
    ...(event.tagLabels || []),
    ...(event.subcategories || []),
  ].filter(Boolean).join(' ').toLocaleLowerCase('ru');

  if (STAND_UP_SIGNAL.test(allText)) return false;

  const titleWithoutStreetName = title.replace(CHRISTMAS_STREET_SIGNAL, ' ');
  if (NEW_YEAR_SIGNAL.test(titleWithoutStreetName)) return true;

  const explicitThemeTags = [...(event.tags || []), ...(event.tagLabels || []), ...(event.subcategories || [])]
    .map((value) => String(value || '').trim().toLocaleLowerCase('ru'));
  return explicitThemeTags.some((value) => NEW_YEAR_SIGNAL.test(value));
}

/** Kept as a compatibility helper for existing callers and tests. */
export function isExcludedFromNewYearLanding(event: NewYearCandidate): boolean {
  return !isRelevantToNewYearLanding(event);
}
