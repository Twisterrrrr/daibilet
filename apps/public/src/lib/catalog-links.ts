import { applyCatalogPreset, type CatalogPresetSlug } from '@/lib/catalog-presets';

export function buildCatalogPresetHref(slug: CatalogPresetSlug, city?: string): string {
  const patch = applyCatalogPreset(slug, false);
  const params = new URLSearchParams();
  if (city && city !== 'all') params.set('city', city);
  if (patch.date && patch.date !== 'all') params.set('date', patch.date);
  if (patch.minPrice && patch.minPrice !== 'all') params.set('minPrice', patch.minPrice);
  if (patch.maxPrice && patch.maxPrice !== 'all') params.set('maxPrice', patch.maxPrice);
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
