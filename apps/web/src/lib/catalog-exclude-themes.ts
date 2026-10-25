import { normalizeExcludeLandingParam } from './catalog-url.ts';

/** Themes that often over-saturate `/events` - quick hide toggles. */
export const CATALOG_EXCLUDE_THEME_SLUGS = [
  'standup',
  'river-cruises',
  'river-party',
  'bus-tours',
  'concerts-genre',
] as const;

export type CatalogExcludeThemeSlug = (typeof CATALOG_EXCLUDE_THEME_SLUGS)[number];

/** Full labels for active-filter row (keep in sync with landing breadcrumb copy). */
const THEME_LABEL: Record<CatalogExcludeThemeSlug, string> = {
  standup: 'Стендап и юмор',
  'river-cruises': 'Речные прогулки',
  'river-party': 'Вечеринки на теплоходе',
  'bus-tours': 'Автобусные экскурсии',
  'concerts-genre': 'Концерты',
};

const SHORT_CHIP: Record<CatalogExcludeThemeSlug, string> = {
  standup: 'Стендап',
  'river-cruises': 'Речные',
  'river-party': 'Вечеринки на воде',
  'bus-tours': 'Автобусные',
  'concerts-genre': 'Концерты',
};

export type CatalogExcludeThemeOption = {
  slug: CatalogExcludeThemeSlug;
  /** Compact chip label. */
  chip: string;
  /** Longer label for active-filter row. */
  label: string;
};

export function catalogExcludeThemeLabel(slug: string): string {
  const key = String(slug || '').trim().toLowerCase() as CatalogExcludeThemeSlug;
  return THEME_LABEL[key] || SHORT_CHIP[key] || key;
}

export function catalogExcludeThemeChip(slug: string): string {
  const key = String(slug || '').trim().toLowerCase() as CatalogExcludeThemeSlug;
  return SHORT_CHIP[key] || catalogExcludeThemeLabel(slug);
}

export function normalizeExcludeLandingList(raw?: string[] | string | null): string[] {
  return normalizeExcludeLandingParam(raw);
}

export function toggleExcludeLanding(current: string[] | undefined, slug: string): string[] | undefined {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return current?.length ? [...current] : undefined;
  const set = new Set(normalizeExcludeLandingList(current));
  if (set.has(key)) set.delete(key);
  else set.add(key);
  const next = [...set].sort();
  return next.length ? next : undefined;
}

export function removeExcludeLanding(current: string[] | undefined, slug: string): string[] | undefined {
  const key = String(slug || '').trim().toLowerCase();
  const next = normalizeExcludeLandingList(current).filter((item) => item !== key);
  return next.length ? next : undefined;
}

/**
 * Chips to show: curated themes present in facets, plus any already excluded
 * (so the user can turn them back on even if facet count is 0 after hide).
 */
export function pickCatalogExcludeThemeOptions(
  landings: Array<{ slug: string; events: number; title?: string }>,
  excluded: string[] | undefined,
): CatalogExcludeThemeOption[] {
  const bySlug = new Map(
    landings.map((item) => [String(item.slug || '').trim().toLowerCase(), item]),
  );
  const excludedSet = new Set(normalizeExcludeLandingList(excluded));
  const options: CatalogExcludeThemeOption[] = [];

  for (const slug of CATALOG_EXCLUDE_THEME_SLUGS) {
    const facet = bySlug.get(slug);
    const isExcluded = excludedSet.has(slug);
    if (!isExcluded && (!facet || facet.events <= 0)) continue;
    options.push({
      slug,
      chip: catalogExcludeThemeChip(slug),
      label: facet?.title || catalogExcludeThemeLabel(slug),
    });
  }

  return options;
}
