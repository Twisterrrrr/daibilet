import { buildCatalogPresetValues, type CatalogPresetSlug } from '@/lib/catalog-presets';

export function buildCatalogPresetHref(slug: CatalogPresetSlug, city?: string): string {
  const patch = buildCatalogPresetValues(slug, false);
  const params = new URLSearchParams();
  if (city && city !== 'all') params.set('city', city);
  if (patch.date) params.set('date', patch.date);
  if (patch.minPrice != null) params.set('minPrice', String(patch.minPrice));
  if (patch.maxPrice != null) params.set('maxPrice', String(patch.maxPrice));
  if (patch.sort && patch.sort !== 'popular') params.set('sort', patch.sort);
  const query = params.toString();
  return query ? `/events?${query}` : '/events';
}

export function buildCatalogTagHref(tag: string, city?: string): string {
  const params = new URLSearchParams();
  params.set('q', tag);
  if (city && city !== 'all') params.set('city', city);
  return `/events?${params.toString()}`;
}
