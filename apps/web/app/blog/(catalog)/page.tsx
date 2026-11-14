import type { Metadata } from 'next';

import { JsonLdScripts } from '@/components/JsonLdScripts';
import { BlogListView } from '@/components/BlogListView';
import '@/lib/env';
import { buildBlogListJsonLd, buildBlogListMetadata } from '@/lib/blog-article-seo';
import { getCachedBlogPageData } from '@/server/cached-blog-data';

export const metadata: Metadata = buildBlogListMetadata();

export const revalidate = 300;

/**
 * Do not await searchParams - forces Cache-Control: private, no-store and kills ISR/CDN HIT.
 * BlogListHero / BlogListFiltered read URL client-side inside Suspense holes under SiteLayout
 * (outer Suspense around BlogListView previously replaced chrome with a bare skeleton).
 */
export default async function BlogPage() {
  const { posts, hotMinPrices, afishaPromos } = await getCachedBlogPageData();

  return (
    <>
      <JsonLdScripts blocks={[buildBlogListJsonLd(posts)]} idPrefix="blog-list-jsonld" />
      <BlogListView
        posts={posts}
        hotMinPrices={hotMinPrices}
        afishaPromos={afishaPromos}
      />
    </>
  );
}
