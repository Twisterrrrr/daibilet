/**
 * Owner taboos for homepage rails («Выбор редакции», home-now, popular).
 * Catalog / event pages are unaffected - only home carousel selection.
 */

const HARRY_POTTER_RE =
  /harry\s*potter|гарри\s*поттер|garri[-_\s]*potter|potter[-_\s]*museum|muzei[-_\s]*garri[-_\s]*pottera|museum[-_\s]*harry[-_\s]*potter/i;

export type HomeRailTabooFields = {
  title?: string | null;
  slug?: string | null;
  venue?: string | null;
  venueSlug?: string | null;
  groupKey?: string | null;
};

/** Музей Гарри Поттера и варианты в title / venue / slug / groupKey. */
export function isHomeRailTabooSession(session: HomeRailTabooFields): boolean {
  const haystack = [session.title, session.slug, session.venue, session.venueSlug, session.groupKey]
    .map((value) => String(value || ''))
    .join('\n');
  return HARRY_POTTER_RE.test(haystack);
}
