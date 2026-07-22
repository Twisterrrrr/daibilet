import type { CatalogPresetSlug } from '@/lib/catalog-presets';
import { catalogPresetToIntentPath } from '@/lib/catalog-intent-routes';

/** Статичный SEO-URL подборки; fallback на /events только если пресет неизвестен. */
export function buildCatalogPresetHref(slug: CatalogPresetSlug, city?: string): string {
  return catalogPresetToIntentPath(slug, city) || '/events';
}

export function buildCatalogTagHref(tag: string, city?: string): string {
  const params = new URLSearchParams();
  params.set('q', tag);
  if (city && city !== 'all') params.set('city', city);
  return `/events?${params.toString()}`;
}
