import * as React from 'react';
import { ArrowLeft } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { BlogArticleHero } from '@/components/BlogArticleHero';
import { renderBlogArticleContent } from '@/components/BlogArticleContent';
import { API_BASE_URL } from '@/lib/api-base';
import { applyBlogArticleSeo, cleanupBlogArticleSeo } from '@/lib/blog-seo';
import { resolveBlogCityHref } from '@/lib/blog-article-city';
import { cleanupBlogPageOverlays } from '@/lib/blog-navigate';
import { BLOG_POSTS } from '@/data/blog-posts';

type PublicArticle = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  city?: string | null;
  citySlug?: string | null;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
};

function formatPublishedAt(value?: string | null): string {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

function estimateReadMin(content?: string | null): number {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = React.useState<PublicArticle | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    cleanupBlogPageOverlays();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setNotFound(false);

    fetch(`${API_BASE_URL}/api/public/articles/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { article?: PublicArticle };
      })
      .then((payload) => {
        if (!payload?.article) return;
        setArticle(payload.article);
      })
      .catch(() => {
        const fallback = BLOG_POSTS.find((post) => post.slug === slug);
        if (fallback) {
          setArticle({
            slug: fallback.slug,
            title: fallback.title,
            excerpt: fallback.excerpt,
            content: fallback.excerpt,
            coverImageUrl: fallback.imageUrl,
            city: fallback.city,
            citySlug: fallback.citySlug,
          });
        } else {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  React.useEffect(() => {
    if (!article) return;

    const seoTitle = article.seoTitle || `${article.title} | Блог Дайбилет`;
    const seoDescription = article.seoDescription || article.excerpt || article.title;
    const canonicalPath = article.canonicalPath || `/blog/${article.slug}`;

    applyBlogArticleSeo({
      title: seoTitle,
      description: seoDescription,
      canonicalPath,
      coverImageUrl: article.coverImageUrl,
      publishedAt: article.publishedAt,
      breadcrumbs: [
        { name: 'Главная', path: '/' },
        { name: 'Блог', path: '/blog' },
        ...(article.city && resolveBlogCityHref(article.city, article.citySlug)
          ? [{ name: article.city, path: resolveBlogCityHref(article.city, article.citySlug)! }]
          : []),
        { name: article.title, path: canonicalPath },
      ],
    });

    return () => cleanupBlogArticleSeo();
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header cityLabel="Все города" onSection={navigateFromBlog} />
        <div className="container-page py-16 text-sm text-slate-500">Загружаем статью...</div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header cityLabel="Все города" onSection={navigateFromBlog} />
        <div className="container-page py-16">
          <p className="text-slate-600">Статья не найдена.</p>
          <a href="/blog" className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="h-4 w-4" />
            К блогу
          </a>
        </div>
      </div>
    );
  }

  const readMin = estimateReadMin(article.content);
  const publishedLabel = formatPublishedAt(article.publishedAt);
  const cityHref = resolveBlogCityHref(article.city, article.citySlug);
  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Блог', href: '/blog' },
    ...(article.city && cityHref ? [{ label: article.city, href: cityHref }] : []),
    { label: article.title },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header cityLabel={article.city || 'Все города'} onSection={navigateFromBlog} />

      <BlogArticleHero
        breadcrumbs={breadcrumbs}
        title={article.title}
        description={article.excerpt}
        coverImageUrl={article.coverImageUrl}
        publishedLabel={publishedLabel}
        readMin={readMin}
        city={article.city}
        cityHref={cityHref}
      />

      <main className="container-page relative z-10 py-10 sm:py-14">
        <article className="rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          {renderBlogArticleContent(article.content || article.excerpt || '', article.coverImageUrl)}
        </article>

        <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200/80 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition hover:text-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Все статьи блога
            </a>
            {cityHref && article.city ? (
              <a
                href={cityHref}
                className="text-sm text-slate-500 transition hover:text-slate-800"
              >
                Афиша {article.city} →
              </a>
            ) : null}
          </footer>
      </main>

      <Footer />
    </div>
  );
}

function navigateFromBlog(section: string) {
  if (section === 'top') window.location.href = '/';
  else if (section === 'events') window.location.href = '/events';
  else if (section === 'blog') window.location.href = '/blog';
  else if (section === 'venues') window.location.href = '/venues';
  else window.location.href = '/';
}
