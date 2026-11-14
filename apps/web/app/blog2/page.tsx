import type { Metadata } from 'next';

import { BlogPreviewListing } from '@/components/BlogPreviewListing';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { getCachedBlogPageData } from '@/server/cached-blog-data';

export const metadata: Metadata = {
  title: 'Блог - превью',
  robots: { index: false, follow: false },
  alternates: { canonical: '/blog2' },
};

export default async function Blog2Page() {
  let posts: Awaited<ReturnType<typeof getCachedBlogPageData>>['posts'] = [];
  let afishaPromos: Awaited<ReturnType<typeof getCachedBlogPageData>>['afishaPromos'] = {};
  try {
    const data = await getCachedBlogPageData();
    posts = data.posts ?? [];
    afishaPromos = data.afishaPromos ?? {};
  } catch {
    posts = [];
    afishaPromos = {};
  }

  return (
    <SiteLayout chromeVariant="v2">
      <BlogPreviewListing posts={posts} afishaPromos={afishaPromos} />
    </SiteLayout>
  );
}