import { unstable_cache } from 'next/cache';

import '@/lib/env';
import { resolveBlogHotMinPrices } from '@/lib/blog-hot-prices';
import { resolveBlogSidebarPromoMap } from '@/lib/blog-sidebar-promo.server';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import {
  expandListingExcerpt,
  mergeBlogCards,
  splitBlogListingHero,
  type BlogCardDto,
} from '@/lib/blog-utils';
import { BLOG_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { BLOG_PAGE_CACHE_TAG };

const blogCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [BLOG_PAGE_CACHE_TAG] as string[],
};

type BlogApiArticles = NonNullable<Parameters<typeof mergeBlogCards>[0]>;

function withListingExcerpts(posts: BlogCardDto[]): BlogCardDto[] {
  return posts.map((post) => ({
    ...post,
    excerpt: expandListingExcerpt(post.slug, post.excerpt),
  }));
}

export type BlogPageData = {
  posts: BlogCardDto[];
  hotMinPrices: Record<string, number>;
  afishaPromos: Record<string, BlogSidebarPromoDto>;
};

async function loadBlogPageData(): Promise<BlogPageData> {
  let posts = withListingExcerpts(mergeBlogCards(null));
  try {
    const payload = await fetchPublicApiJson<{ articles?: BlogApiArticles }>('/api/public/articles', {
      timeoutMs: 3_000,
    });
    posts = withListingExcerpts(mergeBlogCards(payload?.articles));
  } catch {
    // fallback to static posts
  }

  const { featured, hot } = splitBlogListingHero(posts);
  const promoPosts = [featured, ...hot].filter(Boolean) as BlogCardDto[];

  const [hotMinPrices, afishaPromos] = await Promise.all([
    resolveBlogHotMinPrices(hot).catch(() => ({} as Record<string, number>)),
    resolveBlogSidebarPromoMap(promoPosts).catch(() => ({} as Record<string, BlogSidebarPromoDto>)),
  ]);

  return { posts, hotMinPrices, afishaPromos };
}

/** Single ISR cache entry: article list + hero sidebar enrichment (city DTOs). */
export const getCachedBlogPageData = unstable_cache(
  loadBlogPageData,
  ['blog-page-data-v1'],
  blogCacheOptions,
);
