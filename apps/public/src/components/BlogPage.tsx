import * as React from 'react';
import { BookOpen, Clock, MapPin } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { BLOG_POSTS } from '@/data/blog-posts';

export function BlogPage() {
  React.useEffect(() => {
    document.title = 'Блог — гайды и советы о событиях | Дайбилет';
    upsertMeta(
      'description',
      'Гайды по концертам, театру и городским прогулкам. Как выбрать билет, куда пойти с детьми, что смотреть на этой неделе.',
    );
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
        title="Гайды, обзоры и советы"
        description="Как выбирать события, где сидеть, куда идти с детьми и что послушать в этом сезоне."
      />

      <main className="container-page py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
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

function BlogPostCard({ post }: { post: (typeof BLOG_POSTS)[number] }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
        {!imageFailed ? (
          <img
            src={post.imageUrl}
            alt={post.imageAlt}
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
            {post.tag}
          </span>
          {post.city ? (
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
          <span>{post.date}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readMin} мин
          </span>
        </div>
      </div>
    </article>
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
