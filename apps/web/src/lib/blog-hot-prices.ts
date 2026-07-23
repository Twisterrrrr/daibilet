import { buildPublicCityDto, buildPublicLandingsCatalogDto } from '@daibilet/backend/public-read';

import { resolveBlogPrimaryLandingSlug } from '@/lib/blog-listing-links';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import type { BlogCardDto } from '@/lib/blog-utils';

const MIN_DISPLAY_PRICE_RUB = 100;
const PSEUDO_CITY_SLUGS = new Set(['regions', 'multi']);

/**
 * Min price for «Свежее» commercial line:
 * 1) city catalog (`buildPublicCityDto` → stats.priceFrom)
 * 2) fallback: related CHPU from landings catalog
 */
export async function resolveBlogHotMinPrices(
  posts: BlogCardDto[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (!posts.length) return result;

  const citySlugs = [
    ...new Set(
      posts
        .map((post) => normalizeKnownCitySlug(post.citySlug) || '')
        .filter((slug) => slug && !PSEUDO_CITY_SLUGS.has(slug)),
    ),
  ];

  const cityPriceBySlug = new Map<string, number>();
  await Promise.all(
    citySlugs.map(async (slug) => {
      try {
        const page = await buildPublicCityDto(slug);
        const price = page?.stats?.priceFrom;
        if (typeof price === 'number' && Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB) {
          cityPriceBySlug.set(slug, Math.round(price));
        }
      } catch {
        // city hub may be empty / offline in local fallback
      }
    }),
  );

  const needLanding = posts.some((post) => {
    const city = normalizeKnownCitySlug(post.citySlug);
    if (city && cityPriceBySlug.has(city)) return false;
    return Boolean(
      resolveBlogPrimaryLandingSlug(post.slug, post.title, post.tag, post.citySlug),
    );
  });

  let landingPriceBySlug: Map<string, number> | null = null;
  if (needLanding) {
    try {
      const catalog = await buildPublicLandingsCatalogDto();
      landingPriceBySlug = new Map();
      for (const landing of catalog?.items || []) {
        const price = landing.priceFrom;
        if (
          typeof price === 'number' &&
          Number.isFinite(price) &&
          price >= MIN_DISPLAY_PRICE_RUB &&
          landing.slug
        ) {
          landingPriceBySlug.set(String(landing.slug), Math.round(price));
        }
      }
    } catch {
      landingPriceBySlug = null;
    }
  }

  for (const post of posts) {
    const city = normalizeKnownCitySlug(post.citySlug);
    if (city && cityPriceBySlug.has(city)) {
      result[post.slug] = cityPriceBySlug.get(city)!;
      continue;
    }
    const landingSlug = resolveBlogPrimaryLandingSlug(
      post.slug,
      post.title,
      post.tag,
      post.citySlug,
    );
    if (landingSlug && landingPriceBySlug?.has(landingSlug)) {
      result[post.slug] = landingPriceBySlug.get(landingSlug)!;
    }
  }

  return result;
}
