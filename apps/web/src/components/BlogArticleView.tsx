import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { BlogArticleHero } from '@/components/BlogArticleHero';
import { BlogArticleContent } from '@/components/BlogArticleContent';
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
      <div className="bg-slate-50 text-slate-900">
        <BlogArticleHero
          breadcrumbs={breadcrumbs}
          title={article.title}
          description={article.excerpt}
          coverImageUrl={article.coverImageUrl}
          publishedLabel={publishedLabel}
          readMin={readMin}
          city={article.city}
          cityHref={cityLink}
          authorName={article.authorName}
        />

        <main className="container-page relative z-10 py-10 sm:py-14">
          <article className="mx-auto max-w-[42rem] rounded-2xl border border-slate-200/90 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10 md:px-10 md:py-11">
            <BlogArticleContent
              content={article.content || article.excerpt || ''}
              coverImageUrl={article.coverImageUrl}
            />
          </article>

          <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200/80 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition hover:text-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Все статьи блога
            </Link>
            {cityLink && article.city ? (
              <Link href={cityLink} className="text-sm text-slate-500 transition hover:text-slate-800">
                Афиша {article.city} →
              </Link>
            ) : null}
          </footer>
        </main>
      </div>
    </SiteLayout>
  );
}
