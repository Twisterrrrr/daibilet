import type { BlogCardDto } from './blog-utils';
import { normalizeBlogCitySlug } from './blog-meta';

const BROAD_CITY_SLUGS = new Set(['multi', 'regions']);

function normalizeHeaderCitySlug(raw: string | null | undefined): string | null {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  if (!value) return null;
  if (value === 'spb' || value === 'petersburg' || value === 'sankt-peterburg' || value === 'peterburg') {
    return 'saint-petersburg';
  }
  if (value === 'msk' || value === 'moskva') return 'moscow';
  if (value === 'ekb' || value === 'yekaterinburg') return 'ekaterinburg';
  return normalizeBlogCitySlug(value, value);
}

/** Map header city name/slug → blog citySlug (or null if «all»). */
export function resolveBlogRankCitySlug(
  headerCityValue?: string | null,
  destinationSlug?: string | null,
  destinationSourceSlug?: string | null,
  destinationName?: string | null,
): string | null {
  const fromDest =
    normalizeHeaderCitySlug(destinationSlug) ||
    normalizeHeaderCitySlug(destinationSourceSlug) ||
    normalizeBlogCitySlug(destinationSlug, destinationName) ||
    normalizeBlogCitySlug(destinationSourceSlug, destinationName);
  if (fromDest && !BROAD_CITY_SLUGS.has(fromDest)) return fromDest;

  const raw = String(headerCityValue || '').trim();
  if (!raw || raw === 'all' || raw === 'Все города') return null;
  const resolved = normalizeHeaderCitySlug(raw) || normalizeBlogCitySlug(raw, raw);
  return resolved && !BROAD_CITY_SLUGS.has(resolved) ? resolved : null;
}

function cityMatchScore(postCitySlug: string | null | undefined, target: string): number {
  const slug = String(postCitySlug || '')
    .trim()
    .toLowerCase();
  if (!slug) return 0;
  if (slug === target) return 100;
  if (BROAD_CITY_SLUGS.has(slug)) return 40;
  return 0;
}

/**
 * Rank-then-others: city posts first, then multi/regions, then the rest.
 * Does not drop unmatched posts (unlike hard filter).
 */
export function rankBlogFeedByCity<T extends Pick<BlogCardDto, 'citySlug' | 'publishedAt' | 'title' | 'slug'>>(
  posts: T[],
  citySlug: string | null | undefined,
): T[] {
  const target = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (!target || target === 'all' || BROAD_CITY_SLUGS.has(target)) return posts;

  return [...posts].sort((a, b) => {
    const diff = cityMatchScore(b.citySlug, target) - cityMatchScore(a.citySlug, target);
    if (diff !== 0) return diff;
    const ta = Date.parse(String(a.publishedAt || '')) || 0;
    const tb = Date.parse(String(b.publishedAt || '')) || 0;
    if (tb !== ta) return tb - ta;
    return a.title.localeCompare(b.title, 'ru');
  });
}

/** Hard filter for explicit `?city=` in URL (dropdown). */
export function filterBlogFeedByCity<T extends Pick<BlogCardDto, 'citySlug'>>(
  posts: T[],
  citySlug: string | null | undefined,
): T[] {
  const target = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (!target || target === 'all') return posts;
  return posts.filter((post) => String(post.citySlug || '') === target);
}
