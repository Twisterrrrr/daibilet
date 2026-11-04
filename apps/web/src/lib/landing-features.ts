/**
 * Reviews feature switch (CV.L-debt: no approved Review rows yet).
 *
 * Single source of truth for reviews across landings: the «честные отзывы»
 * phrase in meta descriptions (seo-listing-meta) and the reviews block on the
 * page (LandingReviews) are both derived from this flag. When real reviews
 * arrive - implement the block and flip the flag once; meta copy follows
 * automatically, no rework.
 */
export const LANDING_REVIEWS_ENABLED = false;

/**
 * Podborki selection exclusion: hidden from every landing selection surface
 * (landings-catalog feeds for /podborki, home and related picks, curations,
 * internal links) while the direct URL keeps working - thin listings are
 * auto-noindexed via MIN_LISTING_OFFERS_FOR_INDEX.
 * Owner 2026-10-11: «Активный отдых» (3 события) - убрать из выборки пока.
 */
export const LANDING_SELECTION_EXCLUDED_SLUGS: ReadonlySet<string> = new Set([
  'active-sport',
]);

export function isLandingInSelection(slug: string): boolean {
  return !LANDING_SELECTION_EXCLUDED_SLUGS.has(String(slug || '').trim());
}