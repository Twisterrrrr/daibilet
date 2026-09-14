type CatalogExclusionFields = {
  title?: string | null;
  slug?: string | null;
  venue?: string | null;
  venueSlug?: string | null;
  groupKey?: string | null;
};

const HARRY_POTTER_MUSEUM_NAME_RE = /музе[йяеию]\s+гарри\s+поттер(?:а)?/iu;
const HARRY_POTTER_MUSEUM_SLUG_RE =
  /muze[ijy][-_\s]*garri[-_\s]*potter|harry[-_\s]*potter[-_\s]*museum|museum[-_\s]*(?:of[-_\s]*)?harry[-_\s]*potter/iu;

/** Web-side guard for stale SSR/catalog caches; the backend applies the same exclusion. */
export function isCatalogExcludedMuseumAdmission(item: CatalogExclusionFields): boolean {
  const displayIdentity = [item.title, item.venue]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
  if (HARRY_POTTER_MUSEUM_NAME_RE.test(displayIdentity)) return true;

  const slugIdentity = [item.slug, item.venueSlug]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
  if (HARRY_POTTER_MUSEUM_SLUG_RE.test(slugIdentity)) return true;

  return String(item.groupKey || '').trim().toLowerCase() === 'harry-potter-spb';
}
