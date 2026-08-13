/**
 * Hub listing gate for content places (must-see parks/monuments/museums)
 * that should appear in /venues|/locations without requiring active events.
 */

/** Prisma VenueKind values eligible for zero-event hub listing (lean fetch). */
export const CONTENT_PLACE_DB_KINDS = new Set([
  'PARK',
  'MONUMENT',
  'OUTDOOR_LOCATION',
  'ATTRACTION',
  'GASTRO',
  'MUSEUM_ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'CLUB_BAR_RESTAURANT',
]);

/** Stored / proposedKind values (DB + legacy aliases). */
export const CONTENT_PLACE_STORED_KINDS = new Set([
  ...CONTENT_PLACE_DB_KINDS,
  'MUSEUM',
  'ART_SPACE',
  'CLUB',
  'BAR',
  'RESTAURANT',
  'GASTRO',
  'VENUE',
]);

/** Public snake_case kinds (after resolvePublicVenueKind). */
export const CONTENT_PLACE_PUBLIC_KINDS = new Set([
  'park',
  'monument',
  'outdoor_location',
  'attraction',
  'gastro',
  'museum',
  'art_space',
  'theater',
  'concert_hall',
  'museum_art_space',
  'club_bar_restaurant',
  'club',
  'bar',
  'restaurant',
  'venue',
]);

export function normalizeStoredVenueKind(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

export function normalizePublicVenueKindKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

/** title + (shortDescription | hookFact | description). */
export function hasMinimalVenueProfile(row) {
  const title = String(row?.title || row?.name || '').trim();
  if (!title) return false;
  const shortDescription = String(row?.shortDescription || '').trim();
  const hookFact = String(row?.hookFact || '').trim();
  const description = String(row?.description || '').trim();
  return Boolean(shortDescription || hookFact || description);
}

export function isContentPlaceKind(storedKind, resolvedPublicKind) {
  const stored = normalizeStoredVenueKind(storedKind);
  if (CONTENT_PLACE_STORED_KINDS.has(stored)) return true;
  return CONTENT_PLACE_PUBLIC_KINDS.has(normalizePublicVenueKindKey(resolvedPublicKind));
}

/**
 * Zero-event exception for catalog hubs: PUBLISHED|CANDIDATE content kinds
 * with a minimal editorial profile.
 */
export function isContentPlaceHubEligible(row, resolvedPublicKind) {
  if (!row) return false;
  const status = String(row.pageStatus || '')
    .trim()
    .toUpperCase();
  if (status !== 'PUBLISHED' && status !== 'CANDIDATE') return false;
  if (!isContentPlaceKind(row.kind || row.proposedKind, resolvedPublicKind)) return false;
  return hasMinimalVenueProfile(row);
}
