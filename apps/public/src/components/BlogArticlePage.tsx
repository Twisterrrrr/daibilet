import * as React from 'react';
import { ArrowLeft, BookOpen, Clock, MapPin } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { API_BASE_URL } from '@/lib/api-base';
import { BLOG_POSTS } from '@/data/blog-posts';

type PublicArticle = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  city?: string | null;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
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

function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      if (block.startsWith('**') && block.endsWith('**')) {
        return (
          <h2 key={index} className="mt-8 text-xl font-semibold text-slate-900">
            {block.replace(/^\*\*|\*\*$/g, '')}
          </h2>
        );
      }
      if (/^\d+\.\s/.test(block)) {
        const items = block.split('\n').filter(Boolean);
        return (
          <ol key={index} className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-7">
                {item.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
              </li>
            ))}
          </ol>
        );
      }
      if (block.startsWith('- ')) {
        const items = block.split('\n').filter(Boolean);
        return (
          <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-7">
                {item.replace(/^- /, '')}
              </li>
            ))}
          </ul>
        );
      }
      return (
        <p key={index} className="mt-4 text-base leading-8 text-slate-700">
          {block.replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
      );
    });
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = React.useState<PublicArticle | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

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
    document.title = `${article.seoTitle || article.title} | Блог Дайбилет`;
    upsertMeta('description', article.seoDescription || article.excerpt || article.title);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header cityLabel="Все города" onSection={navigateFromBlog} />

      <SectionPageHero
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Блог', href: '/blog' },
          { label: article.title },
        ]}
        gradientClass="from-amber-500 via-rose-500 to-primary-700"
        eyebrow={
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/85">
            <BookOpen className="h-4 w-4" />
            Блог Дайбилет
          </p>
        }
        title={article.title}
        description={article.excerpt || undefined}
      />

      <main className="container-page py-10 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {publishedLabel ? <span>{publishedLabel}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readMin} мин чтения
            </span>
            {article.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {article.city}
              </span>
            ) : null}
          </div>

          {article.coverImageUrl ? (
            <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src={article.coverImageUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
            </div>
          ) : null}

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {renderContent(article.content || article.excerpt || '')}
          </article>

          <div className="mt-8">
            <a href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
              <ArrowLeft className="h-4 w-4" />
              Все статьи
            </a>
          </div>
        </div>
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

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
