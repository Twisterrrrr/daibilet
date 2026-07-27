import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlogListView } from '@/components/BlogListView';
import '@/lib/env';
import { buildBlogListMetadata } from '@/lib/blog-article-seo';
import { getCachedBlogPageData } from '@/server/cached-blog-data';

export const metadata: Metadata = buildBlogListMetadata();

export const revalidate = 300;

function BlogListSkeleton() {
  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div className="container-page py-8 sm:py-10">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-10 w-full max-w-2xl animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-slate-200" />
        <div className="mt-5 h-11 w-full max-w-xl animate-pulse rounded-2xl bg-slate-200" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
          ))}
        </div>
      </div>
      <div className="container-page space-y-6 py-10 sm:py-14">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Do not await searchParams - forces Cache-Control: private, no-store and kills ISR/CDN HIT.
 * BlogListFiltered reads URL filters client-side (same pattern as /events, /podborki).
 */
export default async function BlogPage() {
  const { posts, hotMinPrices, afishaPromos } = await getCachedBlogPageData();

  return (
    <Suspense fallback={<BlogListSkeleton />}>
      <BlogListView
        posts={posts}
        hotMinPrices={hotMinPrices}
        afishaPromos={afishaPromos}
      />
    </Suspense>
  );
}
