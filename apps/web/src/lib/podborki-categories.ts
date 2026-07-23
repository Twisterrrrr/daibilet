/**
 * Sense-blocks for `/podborki` carousels.
 * DB `LandingCategory` + `Landing.categoryId` is source of truth when present;
 * this map seeds / falls back for rule-driven catalog items without DB rows.
 */

export type PodborkiCategorySlug = 'by-type' | 'for-whom' | 'seasonal';

export type PodborkiCategoryMeta = {
  slug: PodborkiCategorySlug;
  title: string;
  subtitle: string;
  sortOrder: number;
};

export const PODBORKI_CATEGORIES: PodborkiCategoryMeta[] = [
  {
    slug: 'by-type',
    title: 'По типу событий',
    subtitle: 'Экскурсии, концерты, музеи и активный отдых',
    sortOrder: 10,
  },
  {
    slug: 'for-whom',
    title: 'Для кого',
    subtitle: 'Семьям, вечеринкам и тем, кто любит драйв',
    sortOrder: 20,
  },
  {
    slug: 'seasonal',
    title: 'Сезонное',
    subtitle: 'Праздники, салюты и сезонные программы',
    sortOrder: 30,
  },
];

/** Exclusive slug → category (sensible defaults from titles/roles). */
export const LANDING_SLUG_TO_CATEGORY: Record<string, PodborkiCategorySlug> = {
  'new-year': 'seasonal',
  'salute-9-may': 'seasonal',
  'family-kids': 'for-whom',
  'river-party': 'for-whom',
  'active-sport': 'for-whom',
  'river-cruises': 'by-type',
  'bus-tours': 'by-type',
  'walking-tours': 'by-type',
  excursions: 'by-type',
  'country-tours': 'by-type',
  exhibitions: 'by-type',
  'concerts-genre': 'by-type',
  standup: 'by-type',
  'unusual-theatres': 'by-type',
  rooftops: 'by-type',
  planetarium: 'by-type',
  'moscow-museums': 'by-type',
  'spb-yards': 'by-type',
  'bridges-night': 'by-type',
  'moscow-dinner-boat': 'by-type',
};

export function resolvePodborkiCategorySlug(
  landingSlug: string,
  dbCategorySlug?: string | null,
): PodborkiCategorySlug {
  const fromDb = String(dbCategorySlug || '').trim();
  if (fromDb === 'by-type' || fromDb === 'for-whom' || fromDb === 'seasonal') return fromDb;
  return LANDING_SLUG_TO_CATEGORY[landingSlug] || 'by-type';
}

export type PodborkiCatalogItem = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
  layoutVariant?: string | null;
  categorySlug?: string | null;
};

export type PodborkiCategorySection = PodborkiCategoryMeta & {
  items: PodborkiCatalogItem[];
};

export function groupPodborkiByCategory(
  items: PodborkiCatalogItem[],
  categoryMeta: PodborkiCategoryMeta[] = PODBORKI_CATEGORIES,
): PodborkiCategorySection[] {
  const bySlug = new Map<string, PodborkiCatalogItem[]>();
  for (const meta of categoryMeta) bySlug.set(meta.slug, []);

  for (const item of items) {
    const cat = resolvePodborkiCategorySlug(item.slug, item.categorySlug);
    const bucket = bySlug.get(cat) || bySlug.get('by-type');
    if (!bucket) continue;
    bucket.push(item);
  }

  return [...categoryMeta]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'ru'))
    .map((meta) => ({
      ...meta,
      items: bySlug.get(meta.slug) || [],
    }))
    .filter((section) => section.items.length > 0);
}
