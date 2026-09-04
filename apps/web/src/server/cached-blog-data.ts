import { unstable_cache } from 'next/cache';

import '@/lib/env';
import { resolveBlogHotMinPrices } from '@/lib/blog-hot-prices';
import { resolveBlogSidebarPromoMap } from '@/lib/blog-sidebar-promo.server';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import {
  expandListingExcerpt,
  mergeBlogCards,
  pickRelatedBlogCards,
  resolveStaticArticle,
  applyBlogCityCanon,
  type BlogArticleDto,
  type BlogCardDto,
  splitBlogListingHero,
} from '@/lib/blog-utils';
import { BLOG_PAGE_CACHE_TAG, PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';
import { fetchPublicApiJson } from '@/server/public-api-client';

export { BLOG_PAGE_CACHE_TAG };

const blogCacheOptions = {
  revalidate: PUBLIC_PAGE_REVALIDATE,
  tags: [BLOG_PAGE_CACHE_TAG] as string[],
};

type BlogApiArticles = NonNullable<Parameters<typeof mergeBlogCards>[0]>;

async function loadBlogArticle(slug: string): Promise<BlogArticleDto | null> {
  try {
    const payload = await fetchPublicApiJson<{
      article?: BlogArticleDto | null;
      cmsOwned?: boolean;
    }>(`/api/public/articles/${encodeURIComponent(slug)}`, {
      timeoutMs: 3_000,
      notFoundAsNull: true,
    });
    if (payload?.article) return applyBlogCityCanon(payload.article);
    // CMS owns this slug (draft/review/archive) - do not resurrect static fallback body.
    if (payload?.cmsOwned) return null;
  } catch {
    // fallback below
  }
  return resolveStaticArticle(slug);
}

async function loadBlogRelated(article: BlogArticleDto): Promise<BlogCardDto[]> {
  let posts = mergeBlogCards(null);
  try {
    const payload = await fetchPublicApiJson<{ articles?: BlogApiArticles }>('/api/public/articles', {
      timeoutMs: 3_000,
    });
    posts = mergeBlogCards(payload?.articles);
  } catch {
    // static fallback already in mergeBlogCards(null)
  }
  return pickRelatedBlogCards(article, posts, 5);
}

/** Per-slug ISR entry so `/blog/[slug]` is not forced private/no-store by raw fetch. */
export function getCachedBlogArticle(slug: string) {
  const key = String(slug || '').trim();
  return unstable_cache(() => loadBlogArticle(key), ['blog-article-v2-city', key], blogCacheOptions)();
}

export function getCachedBlogRelated(article: BlogArticleDto) {
  const key = String(article.slug || '').trim();
  return unstable_cache(() => loadBlogRelated(article), ['blog-related-v2-city', key], blogCacheOptions)();
}

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
  ['blog-page-data-v2-city'],
  blogCacheOptions,
);
