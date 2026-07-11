import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BlogArticleView } from '@/components/BlogArticleView';
import '@/lib/env';
import { resolveStaticArticle } from '@/lib/blog-utils';
import { buildPublicArticlePageDto } from '@daibilet/backend/public-read';
import { PUBLIC_PAGE_REVALIDATE } from '@/server/cache-config';

export const revalidate = PUBLIC_PAGE_REVALIDATE;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(decodeURIComponent(slug));
  if (!article) return { title: 'Статья не найдена | Дайбилет' };

  return {
    title: article.seoTitle || `${article.title} | Блог Дайбилет`,
    description: article.seoDescription || article.excerpt || article.title,
    alternates: {
      canonical: article.canonicalPath || `/blog/${article.slug}`,
    },
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || undefined,
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
  };
}

async function loadArticle(slug: string) {
  try {
    const payload = await buildPublicArticlePageDto(slug);
    if (payload?.article) return payload.article;
  } catch {
    // fallback below
  }
  return resolveStaticArticle(slug);
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await loadArticle(decodeURIComponent(slug));
  if (!article) notFound();

  return <BlogArticleView article={article} />;
}
