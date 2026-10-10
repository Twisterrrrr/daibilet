import type { BlogCardDto } from './blog-utils.ts';
import { blogPostFilterCities, normalizeBlogCitySlug } from './blog-meta.ts';

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
  if (value === 'nizhniy-novgorod') return 'nizhny-novgorod';
  return normalizeBlogCitySlug(value, value);
}

/** Canonical blog city slug for filters / empty-state (null = all / unknown). */
export function canonicalizeBlogCitySlug(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value || value === 'all' || value === 'Все города') return null;
  const resolved = normalizeHeaderCitySlug(value) || normalizeBlogCitySlug(value, value);
  return resolved && !BROAD_CITY_SLUGS.has(resolved) ? resolved : null;
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

  return canonicalizeBlogCitySlug(headerCityValue);
}

function cityMatchScore(
  post: Pick<BlogCardDto, 'citySlug' | 'city'> & { citySlugs?: string[] | null },
  target: string,
): number {
  const hits = blogPostFilterCities(post);
  if (hits.some((hit) => hit.value === target)) return 100;
  const slug = canonicalizeBlogCitySlug(post.citySlug) || String(post.citySlug || '')
    .trim()
    .toLowerCase();
  if (!slug) return 0;
  if (BROAD_CITY_SLUGS.has(slug)) return 40;
  return 0;
}

/**
 * Rank-then-others: city posts first, then multi/regions, then the rest.
 * Does not drop unmatched posts (unlike hard filter).
 */
export function rankBlogFeedByCity<T extends Pick<BlogCardDto, 'citySlug' | 'publishedAt' | 'title' | 'slug'> & { city?: string | null; citySlugs?: string[] | null }>(
  posts: T[],
  citySlug: string | null | undefined,
): T[] {
  const target = canonicalizeBlogCitySlug(citySlug);
  if (!target) return posts;

  return [...posts].sort((a, b) => {
    const diff = cityMatchScore(b, target) - cityMatchScore(a, target);
    if (diff !== 0) return diff;
    const ta = Date.parse(String(a.publishedAt || '')) || 0;
    const tb = Date.parse(String(b.publishedAt || '')) || 0;
    if (tb !== ta) return tb - ta;
    return a.title.localeCompare(b.title, 'ru');
  });
}

/** Hard filter for explicit `?city=` in URL (dropdown). */
export function filterBlogFeedByCity<
  T extends Pick<BlogCardDto, 'citySlug'> & { city?: string | null; citySlugs?: string[] | null },
>(posts: T[], citySlug: string | null | undefined): T[] {
  const raw = String(citySlug || '')
    .trim()
    .toLowerCase();
  if (raw === 'regions') {
    return posts.filter((post) => blogPostFilterCities(post).some((hit) => hit.value === 'regions'));
  }
  const target = canonicalizeBlogCitySlug(citySlug);
  if (!target) return posts;
  return posts.filter((post) => blogPostFilterCities(post).some((hit) => hit.value === target));
}
