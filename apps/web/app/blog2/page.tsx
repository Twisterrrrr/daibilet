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
  try {
    const data = await getCachedBlogPageData();
    posts = data.posts ?? [];
  } catch {
    posts = [];
  }

  return (
    <SiteLayout chromeVariant="v2">
      <BlogPreviewListing posts={posts} />
    </SiteLayout>
  );
}