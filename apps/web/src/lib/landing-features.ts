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