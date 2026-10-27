/** UI pseudo-rating 4.5–5.0 until ≥10 real reviews. AggregateRating only at threshold. */

export const REAL_RATING_THRESHOLD = 10;

export function resolvePseudoRating45to50(seed: string): number {
  const id = String(seed || 'default');
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const norm = Math.abs(hash) % 1000;
  return Math.round((4.5 + (norm / 1000) * 0.5) * 10) / 10;
}

export function shouldEmitAggregateRating(reviewCount: number, rawRating: number): boolean {
  return reviewCount >= REAL_RATING_THRESHOLD && rawRating > 0;
}
