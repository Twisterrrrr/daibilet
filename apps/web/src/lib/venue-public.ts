/**
 * Eligibility: should a Venue appear in public list + sitemap AND resolve in detail.
 * Distinct from hub-indexability (robots index/noindex).
 *
 * Owner 2026-09-25 (catalog-location-venue-canon.md):
 * - CANDIDATE + events≥1 → public (thin → noindex,follow separately)
 * - NONE → not public
 * - PUBLISHED → public when events≥1 (content/admission escapes live in backend)
 * - HIDDEN → never
 *
 * Stub until Codex implements (≥2026-09-28). Tests are expected to FAIL.
 */
export type VenuePublicInput = {
  pageStatus: string | null | undefined;
  /** Distinct catalog / SQL events count used by list hub (≥1 gate). */
  events: number;
};

/**
 * Single source of truth for list ∩ sitemap ∩ detail eligibility.
 * @throws until implemented — intentional TDD red.
 */
export function isVenuePublic(_venue: VenuePublicInput): boolean {
  throw new Error('isVenuePublic: not implemented — Codex 2026-09-28 (broken venues Group A/B)');
}
