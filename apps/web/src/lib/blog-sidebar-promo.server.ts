import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicCityPageDto } from '@daibilet/contracts/public';
import { fetchPublicApiJson } from '@/server/public-api-client';
import {
  blogSidebarPromoIndexKeys,
  buildBlogSidebarPromoFromCityPage,
  collectBlogSidebarPromoCitySlugs,
  type BlogSidebarPromoDto,
} from '@/lib/blog-sidebar-promo';

/**
 * Prefetch sidebar promo payloads keyed by city name + slug (lowercase).
 * Priority cities always included so header geo (Москва и т.п.) hits cache.
 * Server-only module: do not import from client components.
 */
export async function resolveBlogSidebarPromoMap(
  posts: BlogCardDto[],
): Promise<Record<string, BlogSidebarPromoDto>> {
  const result: Record<string, BlogSidebarPromoDto> = {};
  const slugs = collectBlogSidebarPromoCitySlugs(posts);

  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const page = await fetchPublicApiJson<PublicCityPageDto | null>(
          `/api/public/cities/${encodeURIComponent(slug)}`,
          { timeoutMs: 3_000, notFoundAsNull: true },
        );
        if (!page) return;
        const promo = buildBlogSidebarPromoFromCityPage(page);
        if (!promo) return;
        for (const key of blogSidebarPromoIndexKeys(promo.cityName, promo.citySlug)) {
          result[key] = promo;
        }
      } catch {
        // city hub may be empty offline
      }
    }),
  );

  return result;
}
