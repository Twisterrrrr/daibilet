import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { BlogArticleView } from '@/components/BlogArticleView';
import '@/lib/env';
import { buildBlogArticleJsonLd, buildBlogArticleMetadata } from '@/lib/blog-article-seo';
import { mergeBlogCards, pickRelatedBlogCards, resolveStaticArticle } from '@/lib/blog-utils';
import { buildPublicArticlePageDto, buildPublicArticlesListDto } from '@daibilet/backend/public-read';

export const revalidate = 300;

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  if (BLOG_SLUG_REDIRECTS[decoded]) {
    return { title: 'Переезд статьи' };
  }
  const article = await loadArticle(decoded);
  if (!article) return { title: 'Статья не найдена' };

  return buildBlogArticleMetadata(article);
}

async function loadArticle(slug: string) {
  try {
    const payload = await buildPublicArticlePageDto(slug);
    if (payload?.article) return payload.article;
    // CMS owns this slug (draft/review/archive) - do not resurrect static fallback body.
    if (payload?.cmsOwned) return null;
  } catch {
    // fallback below
  }
  return resolveStaticArticle(slug);
}

async function loadRelated(article: NonNullable<Awaited<ReturnType<typeof loadArticle>>>) {
  let posts = mergeBlogCards(null);
  try {
    const payload = await buildPublicArticlesListDto();
    posts = mergeBlogCards(payload?.articles);
  } catch {
    // static fallback already in mergeBlogCards(null)
  }
  return pickRelatedBlogCards(article, posts, 5);
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const redirectTo = BLOG_SLUG_REDIRECTS[decoded];
  if (redirectTo) permanentRedirect(redirectTo);

  const article = await loadArticle(decoded);
  if (!article) notFound();

  const related = await loadRelated(article);
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
