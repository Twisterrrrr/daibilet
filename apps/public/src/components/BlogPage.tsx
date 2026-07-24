import * as React from 'react';
import { BookOpen, Clock, MapPin } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { BLOG_POSTS } from '@/data/blog-posts';
import { API_BASE_URL } from '@/lib/api-base';
import { resolveBlogCityHref } from '@/lib/blog-article-city';
import { blogCoverUrl } from '@/lib/blog-cover';

type BlogCard = {
  slug: string;
  title: string;
  excerpt: string;
  city?: string | null;
  citySlug?: string | null;
  coverImageUrl: string;
  publishedAt?: string | null;
  readMin?: number;
  tag?: string;
};

function formatPublishedAt(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch {
    return fallback;
  }
}

function estimateReadMin(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
}

function staticCards(): BlogCard[] {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    city: post.city,
    citySlug: post.citySlug,
    coverImageUrl: post.imageUrl,
    publishedAt: null,
    readMin: post.readMin,
    tag: post.tag,
  }));
}

export function BlogPage() {
  const [posts, setPosts] = React.useState<BlogCard[]>(staticCards);

  React.useEffect(() => {
    document.title = 'Блог - статьи и советы о событиях | Дайбилет';
    upsertMeta(
      'description',
      'Статьи по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.',
    );
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/public/articles`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as {
          articles?: Array<{
            slug: string;
            title: string;
            excerpt?: string | null;
            city?: string | null;
            citySlug?: string | null;
            coverImageUrl?: string | null;
            publishedAt?: string | null;
          }>;
        };
      })
      .then((payload) => {
        if (!Array.isArray(payload.articles) || !payload.articles.length) return;
        setPosts(
          payload.articles.map((article) => {
            const staticPost = BLOG_POSTS.find((item) => item.slug === article.slug);
            return {
              slug: article.slug,
              title: article.title,
              excerpt: article.excerpt || '',
              city: article.city,
              citySlug: article.citySlug,
              coverImageUrl: article.coverImageUrl || blogCoverUrl(article.slug),
              publishedAt: article.publishedAt,
              readMin: estimateReadMin(article.excerpt || article.title),
              tag: staticPost?.tag || (article.city ? 'Город' : 'Гид'),
            };
          }),
        );
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header cityLabel="Все города" onSection={navigateFromBlog} />

      <SectionPageHero
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Блог' }]}
        gradientClass="from-amber-500 via-rose-500 to-primary-700"
        eyebrow={
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/85">
            <BookOpen className="h-4 w-4" />
            Блог Дайбилет
          </p>
        }
        title="Статьи, обзоры и советы"
        description="Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне."
      />

      <main className="container-page py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Новые материалы выходят каждую неделю. А готовые списки событий — в{' '}
          <a href="/podborki" className="font-medium text-primary-600 hover:text-primary-700">
            подборках
          </a>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}

function BlogPostCard({ post }: { post: BlogCard }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const staticPost = BLOG_POSTS.find((item) => item.slug === post.slug);
  const dateLabel = formatPublishedAt(post.publishedAt, staticPost?.date || '');
  const tag = post.tag || staticPost?.tag || 'Гид';
  const cityHref = resolveBlogCityHref(post.city, post.citySlug);

  return (
    <a
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
        {!imageFailed ? (
          <img
            src={post.coverImageUrl}
            alt=""
            loading="lazy"
            width={960}
            height={540}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-4xl">📰</div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-3">
          <span className="inline-flex rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
            {tag}
          </span>
          {post.city && cityHref ? (
            <span
              role="link"
              tabIndex={0}
              className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/65"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = cityHref;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  window.location.href = cityHref;
                }
              }}
            >
              <MapPin className="h-3 w-3" aria-hidden />
              {post.city}
            </span>
          ) : post.city ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <MapPin className="h-3 w-3" aria-hidden />
              {post.city}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-lg font-bold text-slate-900 group-hover:text-primary-700">{post.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>{dateLabel}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readMin || staticPost?.readMin || 5} мин
          </span>
        </div>
      </div>
    </a>
  );
}

function navigateFromBlog(section: string) {
  if (section === 'top') window.location.href = '/';
  else if (section === 'events') window.location.href = '/events';
  else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
  else if (section === 'landings') window.location.href = '/podborki';
  else if (section === 'venues') window.location.href = '/venues';
  else if (section === 'blog') window.location.href = '/blog';
  else if (section === 'orders') window.location.href = '/my-orders';
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
