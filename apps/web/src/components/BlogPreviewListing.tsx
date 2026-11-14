'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Clock, MapPin, Search, Star } from 'lucide-react';

import {
  BLOG_LISTING_IMAGE_QUALITY,
  BlogCardSafeImage,
  IMAGE_SIZES,
  SafeImage,
} from '@/components/SafeImage.client';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import { fontUnbounded } from '@/lib/fonts';
import { resolveBlogCardDateLabel, type BlogCardDto } from '@/lib/blog-utils';

function tagLabel(tag: string | null | undefined): string {
  return String(tag || '').trim();
}

function authorInitial(name: string | null | undefined): string {
  const value = String(name || '').trim();
  return value ? value[0].toUpperCase() : 'А';
}

function EventBanner({
  promo,
  tag,
  tagClass,
}: {
  promo: BlogSidebarPromoDto;
  tag: string;
  tagClass: string;
}) {
  const image = promo.featuredEventImageUrl || promo.imageUrl;
  const title = promo.upcomingTitles[0] || promo.cityName;
  return (
    <Link href={promo.featuredEventHref || promo.href} className="group relative block">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
        {image ? (
          <SafeImage
            src={image}
            alt=""
            fill
            sizes="20rem"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="block h-full w-full bg-gradient-to-br from-surface-alt to-sky-50" />
        )}
        <span className="absolute inset-0 bg-gradient-to-b from-transparent to-ink/90" />
      </div>
      <span className="absolute inset-x-0 bottom-0 p-4 text-white">
        <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagClass}`}>
          {tag}
        </span>
        <span className={`${fontUnbounded.className} block text-base leading-5`}>{title}</span>
        {promo.priceFrom ? (
          <span className="mt-1 block text-[13px] font-semibold text-white/80">Билеты от {promo.priceFrom} ₽</span>
        ) : null}
      </span>
    </Link>
  );
}

/** Превью листинга блога в новом дизайне (по макету blog_2.html). */
export function BlogPreviewListing({
  posts,
  afishaPromos = {},
}: {
  posts: BlogCardDto[];
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
}) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      const label = tagLabel(post.tag);
      if (label) set.add(label);
    }
    return ['all', ...Array.from(set)];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (activeTag !== 'all' && tagLabel(post.tag) !== activeTag) return false;
      if (q && !`${post.title} ${post.excerpt}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, query, activeTag]);

  const [featured, ...rest] = filtered;
  const promos = Object.values(afishaPromos);
  const promo1 = promos[0] ?? null;
  const promo2 = promos[1] ?? null;

  return (
    <div className="container-page">
      <nav className="flex gap-1.5 py-5 text-xs text-ink-muted" aria-label="Хлебные крошки">
        <Link href="/" className="hover:text-ink">
          Главная
        </Link>
        <span>/</span>
        <span>Блог</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <h1 className={`${fontUnbounded.className} text-3xl font-bold tracking-tight text-ink sm:text-4xl`}>
            Журнал Дайбилет
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-6 text-ink-muted">
            Гиды, советы и разборы от редакции. Помогаем выбирать события и не переплачивать за впечатления.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/cities"
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink"
          >
            <MapPin className="h-4 w-4 text-accent" aria-hidden />
            Все города
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 transition focus-within:border-accent">
            <Search className="h-4 w-4 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по статьям"
              aria-label="Поиск по статьям"
              className="w-36 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted-2 sm:w-44"
            />
          </div>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <div className="flex gap-2 overflow-x-auto py-4">
            {tags.map((tag) => {
              const label = tag === 'all' ? 'Все' : tag;
              const active = tag === activeTag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition ${
                    active ? 'bg-ink text-white' : 'bg-surface-alt text-ink-2 hover:bg-[#eceef5]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {featured ? (
            <Link
              href={`/blog/${featured.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-card-hover lg:flex-row"
            >
              <div className="relative aspect-[16/10] bg-surface-alt lg:aspect-auto lg:w-1/2 lg:min-h-[18rem]">
                <BlogCardSafeImage
                  slug={featured.slug}
                  coverImageUrl={featured.coverImageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  quality={BLOG_LISTING_IMAGE_QUALITY}
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center gap-3 p-6 lg:p-8">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  {tagLabel(featured.tag) ? (
                    <span className="font-semibold uppercase tracking-[0.04em] text-accent">{tagLabel(featured.tag)}</span>
                  ) : null}
                  <span className="size-0.5 rounded-full bg-ink-muted-2" />
                  <span>{featured.readMin} мин чтения</span>
                  <span className="size-0.5 rounded-full bg-ink-muted-2" />
                  <time dateTime={featured.publishedAt || undefined}>{resolveBlogCardDateLabel(featured)}</time>
                </div>
                <h2 className={`${fontUnbounded.className} text-xl font-bold leading-tight text-ink transition-colors group-hover:text-accent lg:text-2xl`}>
                  {featured.title}
                </h2>
                {featured.excerpt ? (
                  <p className="line-clamp-3 text-sm leading-6 text-ink-2">{featured.excerpt}</p>
                ) : null}
                {featured.authorName ? (
                  <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#8b7cf0] text-xs font-bold text-white">
                      {authorInitial(featured.authorName)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{featured.authorName}</span>
                      <span className="block text-xs text-ink-muted">Автор</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </Link>
          ) : null}

          {rest.length ? (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {rest.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col gap-3">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-alt">
                    <BlogCardSafeImage
                      slug={post.slug}
                      coverImageUrl={post.coverImageUrl}
                      alt=""
                      fill
                      sizes={IMAGE_SIZES.blogCard}
                      quality={BLOG_LISTING_IMAGE_QUALITY}
                      loading="lazy"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      {tagLabel(post.tag) ? (
                        <span className="font-semibold uppercase tracking-[0.04em] text-accent">{tagLabel(post.tag)}</span>
                      ) : null}
                      <span className="size-0.5 rounded-full bg-ink-muted-2" />
                      <span>{post.readMin} мин</span>
                    </div>
                    <h3 className="text-lg font-bold leading-snug text-ink transition-colors group-hover:text-accent">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="line-clamp-2 text-sm leading-6 text-ink-muted">{post.excerpt}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          {!filtered.length ? (
            <div className="mt-8 rounded-2xl bg-surface-alt p-10 text-center">
              <h3 className="font-display text-xl font-bold text-ink">Здесь пока нет статей</h3>
              <p className="mt-2 text-sm text-ink-muted">Попробуйте другой тег или поисковый запрос.</p>
            </div>
          ) : null}
        </div>

        <aside className="mt-10 flex flex-col gap-6 lg:mt-0 lg:sticky lg:top-24">
          {promo1 ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line bg-surface-alt px-5 py-4 text-sm font-bold text-ink">
                <Star className="h-4 w-4 text-accent" aria-hidden />
                Выбор редакции
              </div>
              <EventBanner promo={promo1} tag="Скоро" tagClass="bg-accent text-white" />
            </div>
          ) : null}

          <Link
            href="/podborki"
            className="flex flex-col items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-[#f0ecfe] to-white p-6 text-center"
          >
            <span className="font-display text-base font-bold text-ink">Соберите выходные</span>
            <span className="mt-1.5 text-xs leading-5 text-ink-muted">Готовые подборки событий и мест на любые планы.</span>
            <span className="mt-3 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink">
              Смотреть подборки
            </span>
          </Link>

          {promo2 ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line bg-surface-alt px-5 py-4 text-sm font-bold text-ink">
                <Clock className="h-4 w-4 text-ink-muted" aria-hidden />
                Успейте купить
              </div>
              <EventBanner promo={promo2} tag="Мало мест" tagClass="bg-[#ff9500] text-ink" />
            </div>
          ) : null}

          <div className="rounded-2xl bg-ink p-6 text-center text-white">
            <h4 className="font-display text-lg font-bold">Пишите статьи и получайте бонусы</h4>
            <p className="mt-2 text-[13px] leading-5 text-white/70">Делитесь впечатлениями и вставляйте ссылки на события.</p>
            <Link
              href="/partners"
              className="mt-4 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-alt"
            >
              Стать автором
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}