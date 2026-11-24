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

/** Stand-up is a separate entertainment format, not a New Year program by itself. */
export function isExcludedFromNewYearLanding(event: NewYearCandidate): boolean {
  const text = [
    event.title,
    event.category,
    taxonomyText(event.catalogCategory),
    taxonomyText(event.catalogSubcategory),
    ...(event.tags || []),
    ...(event.tagLabels || []),
    ...(event.subcategories || []),
  ].filter(Boolean).join(' ').toLocaleLowerCase('ru');
  return /stand\s*[-–—]?\s*up|стендап/u.test(text);
}
