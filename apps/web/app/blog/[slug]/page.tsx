import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { BlogArticleView } from '@/components/BlogArticleView';
import { BLOG_POSTS } from '@/data/blog-posts';
import '@/lib/env';
import { buildBlogArticleJsonLd, buildBlogArticleMetadata } from '@/lib/blog-article-seo';
import { getCachedBlogArticle, getCachedBlogRelated } from '@/server/cached-blog-data';

export const revalidate = 300;
export const dynamicParams = true;

/** Старые slug → каноническая статья (объединения / переезды). */
const BLOG_SLUG_REDIRECTS: Record<string, string> = {
  // Дубль колонки Макса (HIDDEN) → live канон
  'bylinnyy-bereg-fentezi-fest': '/blog/fentezi-fest-bylinnyy-bereg',
  // Старый open-air Макса (HIDDEN) → актуальная колонка про парки
  'open-air-festy-vyhodnoi-ru': '/blog/moskva-parki-open-air-vyhodnye',
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Prebuild the editorial catalog; CMS-only slugs still use on-demand ISR. */
export function generateStaticParams() {
  return BLOG_POSTS.filter((post) => post.slug && !BLOG_SLUG_REDIRECTS[post.slug]).map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  if (BLOG_SLUG_REDIRECTS[decoded]) {
    return { title: 'Переезд статьи' };
  }
  const article = await getCachedBlogArticle(decoded);
  if (!article) notFound();

  return buildBlogArticleMetadata(article);
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const redirectTo = BLOG_SLUG_REDIRECTS[decoded];
  if (redirectTo) permanentRedirect(redirectTo);

  const article = await getCachedBlogArticle(decoded);
  if (!article) notFound();

  const related = await getCachedBlogRelated(article);
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
      <BlogArticleView article={article} related={related} />
    </>
  );
}
