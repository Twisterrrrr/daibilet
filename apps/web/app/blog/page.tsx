import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlogListView } from '@/components/BlogListView';
import '@/lib/env';
import { buildBlogListMetadata } from '@/lib/blog-article-seo';
import { resolveBlogHotMinPrices } from '@/lib/blog-hot-prices';
import {
  resolveBlogSidebarPromoMap,
} from '@/lib/blog-sidebar-promo.server';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import { expandListingExcerpt, mergeBlogCards, splitBlogListingHero } from '@/lib/blog-utils';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';

export const metadata: Metadata = buildBlogListMetadata();

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function withListingExcerpts(posts: ReturnType<typeof mergeBlogCards>) {
  return posts.map((post) => ({
    ...post,
    excerpt: expandListingExcerpt(post.slug, post.excerpt),
  }));
}

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    city: firstParam(params.city),
    author: firstParam(params.author),
    topic: firstParam(params.topic),
    q: firstParam(params.q),
  };

  let posts = withListingExcerpts(mergeBlogCards(null));
  try {
    const payload = await buildPublicArticlesListDto();
    posts = withListingExcerpts(mergeBlogCards(payload?.articles));
  } catch {
    // fallback to static posts
  }

  const { featured, hot } = splitBlogListingHero(posts);
  let hotMinPrices: Record<string, number> = {};
  let afishaPromos: Record<string, BlogSidebarPromoDto> = {};
  try {
    hotMinPrices = await resolveBlogHotMinPrices(hot);
  } catch {
    hotMinPrices = {};
  }
  try {
    const promoPosts = [featured, ...hot].filter(Boolean) as typeof hot;
    afishaPromos = await resolveBlogSidebarPromoMap(promoPosts);
  } catch {
    afishaPromos = {};
  }

  return (
    <Suspense
      fallback={
        <BlogListView
          posts={posts}
          filters={filters}
          hotMinPrices={hotMinPrices}
          afishaPromos={afishaPromos}
        />
      }
    >
      <BlogListView
        posts={posts}
        filters={filters}
        hotMinPrices={hotMinPrices}
        afishaPromos={afishaPromos}
      />
    </Suspense>
  );
}
