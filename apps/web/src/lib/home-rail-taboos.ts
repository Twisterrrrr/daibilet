/**
 * Owner taboos for homepage rails («Выбор редакции», home-now, popular).
 * Catalog / event pages are unaffected - only home carousel selection.
 *
 * Stand-up stays in «Подборки» / catalog - not in hub rails (owner 2026-08-15).
 */

const HARRY_POTTER_RE =
  /harry\s*potter|гарри\s*поттер|garri[-_\s]*potter|potter[-_\s]*museum|muzei[-_\s]*garri[-_\s]*pottera|museum[-_\s]*harry[-_\s]*potter/i;

const STANDUP_RE = /стендап|stand[\s-]?up|standup|comedy|юмор|квиз/i;

export type HomeRailTabooFields = {
  title?: string | null;
  slug?: string | null;
  venue?: string | null;
  venueSlug?: string | null;
  groupKey?: string | null;
  category?: string | null;
  eventTitle?: string | null;
};

function sessionHaystack(session: HomeRailTabooFields): string {
  return [session.category, session.title, session.eventTitle, session.venue, session.slug, session.venueSlug, session.groupKey]
    .map((value) => String(value || ''))
    .join('\n');
}

/** Музей Гарри Поттера и варианты в title / venue / slug / groupKey. */
export function isHomeRailHarryPotterSession(session: HomeRailTabooFields): boolean {
  return HARRY_POTTER_RE.test(sessionHaystack(session));
}

/** Stand-up / comedy / quiz - keep out of home hub rails. */
export function isHomeRailStandupSession(session: HomeRailTabooFields): boolean {
  return STANDUP_RE.test(sessionHaystack(session));
}

/** Any session that must not appear in home carousels. */
export function isHomeRailTabooSession(session: HomeRailTabooFields): boolean {
  return isHomeRailHarryPotterSession(session) || isHomeRailStandupSession(session);
}
