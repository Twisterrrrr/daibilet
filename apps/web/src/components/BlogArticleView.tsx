import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { BlogArticleHero } from '@/components/BlogArticleHero';
import { renderBlogArticleContent } from '@/components/BlogArticleContent';
import { SiteLayout } from '@/components/SiteLayout';
import { BLOG_POSTS } from '@/data/blog-posts';
import { resolveBlogCityHref } from '@/lib/blog-article-city';
import type { BlogArticleDto } from '@/lib/blog-utils';
import { estimateReadMin, formatBlogPublishedAt } from '@/lib/blog-utils';

export function BlogArticleView({ article }: { article: BlogArticleDto }) {
  const readMin = estimateReadMin(article.content);
  const publishedLabel = formatBlogPublishedAt(
    article.publishedAt,
    BLOG_POSTS.find((post) => post.slug === article.slug)?.date || '',
  );
  const cityLink = resolveBlogCityHref(article.city, article.citySlug);
  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Блог', href: '/blog' },
    ...(article.city && cityLink ? [{ label: article.city, href: cityLink }] : []),
    { label: article.title },
  ];

  return (
    <SiteLayout>
      <BlogArticleHero
        breadcrumbs={breadcrumbs}
        title={article.title}
        description={article.excerpt}
        coverImageUrl={article.coverImageUrl}
        publishedLabel={publishedLabel}
        readMin={readMin}
        city={article.city}
        cityHref={cityLink}
      />

      <article className="container-page max-w-3xl py-10 sm:py-12">
        {renderBlogArticleContent(article.content || article.excerpt || '', article.coverImageUrl)}
      </article>

      <div className="container-page max-w-3xl pb-12">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" />
          К блогу
        </Link>
      </div>
    </SiteLayout>
  );
}
