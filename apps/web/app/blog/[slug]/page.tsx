import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BlogArticleView } from '@/components/BlogArticleView';
import '@/lib/env';
import { buildBlogArticleJsonLd, buildBlogArticleMetadata } from '@/lib/blog-article-seo';
import { resolveStaticArticle } from '@/lib/blog-utils';
import { buildPublicArticlePageDto } from '@daibilet/backend/public-read';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(decodeURIComponent(slug));
  if (!article) return { title: 'Статья не найдена | Дайбилет' };

  return buildBlogArticleMetadata(article);
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

  const jsonLdBlocks = buildBlogArticleJsonLd(article);

  return (
    <>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`blog-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <BlogArticleView article={article} />
    </>
  );
}
