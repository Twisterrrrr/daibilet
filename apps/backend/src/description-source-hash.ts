/**
 * Fingerprint of the significant inputs an event description is built from.
 *
 * Why it exists: the post-sync composer rebuilds the canonical fact block
 * ("## Практическая информация") from catalogue fields, so the published text
 * depends on price, sessions, venue, address, duration and age - not only on the
 * provider description. Hashing the provider text alone meant a price or date
 * change never re-composed the card and never marked the revision STALE.
 *
 * Contract (covered by tests):
 * - deterministic: the same inputs always produce the same hash;
 * - sensitive to every significant input, including the volatile catalogue ones
 *   (price, next session, session count, venue, address, duration, age);
 * - insensitive to run metadata: ids, timestamps and unknown extra keys are not
 *   part of the formula, otherwise the hash would change on every run and the
 *   (eventId, sourceHash) dedup would stop working.
 *
 * The version prefix is part of the formula on purpose: a formula change must
 * produce different hashes instead of silently mixing old and new values.
 * No migration is needed for a formula change - existing hashes simply differ
 * from the new ones, so each changed event is re-composed and re-enqueued once.
 *
 * md5 is deliberate: this is change detection, not a signature, and it matches
 * the fingerprint already stored in `EventOverride.descriptionSourceHash`.
 */

import { createHash } from 'node:crypto';

export const DESCRIPTION_SOURCE_HASH_VERSION = 'v2';

export type DescriptionSourceHashInput = {
  /** Provider description (Ticketscloud plain / Teplohod HTML). */
  sourceText?: string | null;
  title?: string | null;
  city?: string | null;
  venue?: string | null;
  venueAddress?: string | null;
  ageLimit?: string | null;
  priceFromRub?: number | string | null;
  /** All distinct session durations in minutes; order does not matter. */
  durations?: readonly number[] | null;
  /** Single known duration, used when the caller has no durations array. */
  durationMin?: number | null;
  /** Number of upcoming sessions ("всего N сеансов" line). */
  futureSessions?: number | null;
  /** Start of the nearest upcoming session (the "Ближайшая дата" line). */
  nextSession?: string | Date | null;
  category?: string | null;
  subcategory?: string | null;
  kind?: string | null;
};

/** Newline/whitespace normalization: the same text with CRLF and LF is one input. */
function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : '';
}

function normalizeDate(value: unknown): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return normalizeText(value);
  return date.toISOString();
}

export function descriptionSourceHash(input: DescriptionSourceHashInput): string {
  const rawDurations = input.durations?.length
    ? input.durations
    : input.durationMin != null
      ? [input.durationMin]
      : [];
  const durations = [...new Set(rawDurations.map(Number).filter((n) => Number.isFinite(n) && n > 0))]
    .sort((left, right) => left - right)
    .join(',');

  const parts = [
    DESCRIPTION_SOURCE_HASH_VERSION,
    normalizeText(input.sourceText),
    normalizeText(input.title),
    normalizeText(input.city),
    normalizeText(input.venue),
    normalizeText(input.venueAddress),
    normalizeText(input.ageLimit),
    normalizeNumber(input.priceFromRub),
    durations,
    normalizeNumber(input.futureSessions),
    normalizeDate(input.nextSession),
    normalizeText(input.category),
    normalizeText(input.subcategory),
    normalizeText(input.kind),
  ];

  return createHash('md5').update(parts.join('\u001f')).digest('hex');
}
