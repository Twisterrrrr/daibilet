/**
 * Reserved origin-marker guard for the public description paths.
 *
 * Mirror of the canonical contract in
 * `apps/web/src/lib/event-description-compose.ts` (step 1 of the owner plan moves
 * both copies into `@daibilet/contracts`). Keep the marker literal in sync.
 *
 * Who authored a description is stored in the `EventOverride.descriptionOrigin`
 * column (`AUTO | EDITORIAL | AI`), never inside the text. The reserved marker form
 * below is produced only by internal pipeline artifacts (revision snapshots, queue
 * payloads, exports). Every public path already goes through
 * `cleanImportedDescription`, which strips it - so an accidental marker can never
 * reach the public HTML.
 */

export const DESCRIPTION_ORIGIN_MARKER_SOURCE =
  '<!--\\s*daibilet:origin\\s*=\\s*(AUTO|EDITORIAL|AI)\\s*-->|\\[\\[\\s*origin\\s*:\\s*(AUTO|EDITORIAL|AI)\\s*\\]\\]';

export const EVENT_DESCRIPTION_ORIGINS = ['AUTO', 'EDITORIAL', 'AI'] as const;

/** Who authored the stored description. Mirrored by `EventOverride.descriptionOrigin`. */
export type EventDescriptionOrigin = (typeof EVENT_DESCRIPTION_ORIGINS)[number];

/** True when the text carries a reserved origin marker anywhere. */
export function hasDescriptionOriginMarker(value: string | null | undefined): boolean {
  return new RegExp(DESCRIPTION_ORIGIN_MARKER_SOURCE, 'i').test(String(value || ''));
}

/** Read the reserved origin marker, if a pipeline artifact left one behind. */
export function readDescriptionOriginMarker(value: string | null | undefined): EventDescriptionOrigin | null {
  const source = String(value || '');
  if (!source) return null;
  const match = new RegExp(DESCRIPTION_ORIGIN_MARKER_SOURCE, 'i').exec(source);
  if (!match) return null;
  const token = String(match[1] || match[2] || '').toUpperCase();
  return (EVENT_DESCRIPTION_ORIGINS as readonly string[]).includes(token)
    ? (token as EventDescriptionOrigin)
    : null;
}

/**
 * Remove every reserved origin marker: a marker-only line disappears entirely, an
 * inline marker becomes a single space. Idempotent; returns the input unchanged
 * when there is nothing to strip.
 */
export function stripDescriptionOriginMarkers(value: string | null | undefined): string {
  const source = String(value || '');
  if (!source) return '';
  if (!hasDescriptionOriginMarker(source)) return source;

  const lineRe = new RegExp(`^[ \\t]*(?:${DESCRIPTION_ORIGIN_MARKER_SOURCE})[ \\t]*$`, 'gim');
  const inlineRe = new RegExp(DESCRIPTION_ORIGIN_MARKER_SOURCE, 'gi');
  return source
    .replace(lineRe, '')
    .replace(inlineRe, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
