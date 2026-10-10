/**
 * Displayed rating: UI may show a stable pseudo 4.5–5.0 until 10 real approved reviews.
 * JSON-LD AggregateRating must use real values only when reviewCount >= 10.
 */

export const REAL_RATING_THRESHOLD = 10;

export function resolveDisplayedRating(seed: string, rawRating: number, reviewCount: number): number {
  if (reviewCount >= REAL_RATING_THRESHOLD && rawRating > 0) {
    return Math.round(rawRating * 10) / 10;
  }
  return resolvePseudoRating45to50(seed);
}

/** Stable pseudo-rating in [4.5, 5.0). */
export function resolvePseudoRating45to50(seed: string): number {
  const id = String(seed || 'default');
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const norm = Math.abs(hash) % 1000; // 0–999
  return Math.round((4.5 + (norm / 1000) * 0.5) * 10) / 10;
}

export function shouldEmitAggregateRating(reviewCount: number, rawRating: number): boolean {
  return reviewCount >= REAL_RATING_THRESHOLD && rawRating > 0;
}

export type RatingSummary = {
  avgRating: number;
  reviewCount: number;
  verifiedCount: number;
  displayedRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function buildRatingSummary(
  seed: string,
  reviews: Array<{ rating: number; isVerified?: boolean }>,
): RatingSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (reviews.length === 0) {
    return {
      avgRating: 0,
      reviewCount: 0,
      verifiedCount: 0,
      displayedRating: resolvePseudoRating45to50(seed),
      distribution,
    };
  }

  let sum = 0;
  let verifiedCount = 0;
  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[rating] += 1;
    sum += review.rating;
    if (review.isVerified) verifiedCount += 1;
  }

  const avgRating = Math.round((sum / reviews.length) * 10) / 10;
  return {
    avgRating,
    reviewCount: reviews.length,
    verifiedCount,
    displayedRating: resolveDisplayedRating(seed, avgRating, reviews.length),
    distribution,
  };
}
