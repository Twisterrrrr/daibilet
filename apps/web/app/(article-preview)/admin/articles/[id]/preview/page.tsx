import type { Metadata } from 'next';

import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { AdminArticlePreviewBanner } from '@/components/admin/AdminArticlePreviewBanner';
import { BlogArticleView } from '@/components/BlogArticleView';
import type { BlogArticleDto } from '@/lib/blog-utils';
import { loadAdminArticleDetail, type AdminArticleDetail } from '@/server/admin-articles-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

function toPreviewArticle(article: AdminArticleDetail): BlogArticleDto {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt || null,
    content: article.content || '',
    coverImageUrl: article.coverImageUrl || null,
    city: article.city || null,
    citySlug: article.citySlug || null,
    publishedAt: article.publishedAt || null,
    isIndexable: false,
    seoTitle: article.seoTitle || null,
    seoDescription: article.seoDescription || null,
    canonicalPath: article.canonicalPath || `/blog/${article.slug}`,
    authorId: article.authorId || null,
    authorName: article.authorName || null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { article } = await loadAdminArticleDetail(id);
  return {
    title: article ? `Превью: ${article.title}` : 'Превью статьи',
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

export default async function AdminArticlePreviewPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { article, errors } = await loadAdminArticleDetail(id);

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <AdminApiErrorBanner errors={errors.length ? errors : [`Статья ${id} не найдена`]} />
      </div>
    );
  }

  const previewArticle = toPreviewArticle(article);

  return (
    <>
      <AdminArticlePreviewBanner
        articleId={article.id}
        status={article.status}
        publishedAt={article.publishedAt}
        slug={article.slug}
      />
      <BlogArticleView article={previewArticle} related={[]} />
    </>
  );
}
