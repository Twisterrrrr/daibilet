import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlogListView } from '@/components/BlogListView';
import '@/lib/env';
import { buildBlogListMetadata } from '@/lib/blog-article-seo';
import { mergeBlogCards } from '@/lib/blog-utils';
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

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    city: firstParam(params.city),
    author: firstParam(params.author),
  };

  let posts = mergeBlogCards(null);
  try {
    const payload = await buildPublicArticlesListDto();
    posts = mergeBlogCards(payload?.articles);
  } catch {
    // fallback to static posts
  }

  return (
    <Suspense fallback={<BlogListView posts={posts} filters={filters} />}>
      <BlogListView posts={posts} filters={filters} />
    </Suspense>
  );
}
