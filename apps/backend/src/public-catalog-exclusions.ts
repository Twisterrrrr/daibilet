export type PublicCatalogExclusionFields = {
  title?: string | null;
  slug?: string | null;
  venue?: string | null;
  venueSlug?: string | null;
  groupKey?: string | null;
};

const HARRY_POTTER_MUSEUM_NAME_RE = /музе[йяеию]\s+гарри\s+поттер(?:а)?/iu;
const HARRY_POTTER_MUSEUM_SLUG_RE =
  /muze[ijy][-_\s]*garri[-_\s]*potter|harry[-_\s]*potter[-_\s]*museum|museum[-_\s]*(?:of[-_\s]*)?harry[-_\s]*potter/iu;

/**
 * Admission products for this museum are venue tickets, not dated events.
 * Keep their detail URLs available, but omit them from event listings and facets.
 */
export function isPublicCatalogExcludedMuseumAdmission(
  session: PublicCatalogExclusionFields,
): boolean {
  const displayIdentity = [session.title, session.venue]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
  if (HARRY_POTTER_MUSEUM_NAME_RE.test(displayIdentity)) return true;

  const slugIdentity = [session.slug, session.venueSlug]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
  if (HARRY_POTTER_MUSEUM_SLUG_RE.test(slugIdentity)) return true;

  return String(session.groupKey || '').trim().toLowerCase() === 'harry-potter-spb';
}

