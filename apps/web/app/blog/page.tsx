import type { Metadata } from 'next';

import { BlogListView } from '@/components/BlogListView';
import '@/lib/env';
import { buildBlogListMetadata } from '@/lib/blog-article-seo';
import { mergeBlogCards } from '@/lib/blog-utils';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';

export const metadata: Metadata = buildBlogListMetadata();

export const revalidate = 300;

export default async function BlogPage() {
  let posts = mergeBlogCards(null);
  try {
    const payload = await buildPublicArticlesListDto();
    posts = mergeBlogCards(payload?.articles);
  } catch {
    // fallback to static posts
  }

  return <BlogListView posts={posts} />;
}
