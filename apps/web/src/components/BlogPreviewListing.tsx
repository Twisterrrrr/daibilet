import Link from 'next/link';
import { Send } from 'lucide-react';

import {
  BLOG_LISTING_IMAGE_QUALITY,
  BlogCardSafeImage,
  IMAGE_SIZES,
} from '@/components/SafeImage.client';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import { fontUnbounded } from '@/lib/fonts';
import { resolveBlogCardDateLabel, type BlogCardDto } from '@/lib/blog-utils';

function tagLabel(tag: string | null | undefined): string {
  return String(tag || '').trim();
}

/** Превью листинга блога в новом дизайне. Не production - нет фильтров и пагинации. */
export function BlogPreviewListing({
  posts,
  afishaPromos = {},
}: {
  posts: BlogCardDto[];
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
}) {
  const [featured, ...rest] = posts;
  const hotPosts = rest.slice(0, 5);
  const promo = Object.values(afishaPromos)[0] ?? null;

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-accent-soft/70 via-white to-white">
        <div className="container-page py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Журнал</p>
          <h1 className={`${fontUnbounded.className} mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl`}>
            Блог Дайбилет
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-7 text-ink-muted">
            Гиды по городам, маршруты и авторские колонки о событиях и культуре.
          </p>
        </div>
      </section>

      <div className="container-page py-10 sm:py-14">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
          <div className="min-w-0">
        {featured ? (
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:shadow-card-hover lg:grid-cols-2"
          >
            <div className="relative aspect-[16/10] bg-surface-alt lg:aspect-auto lg:min-h-[22rem]">
              <BlogCardSafeImage
                slug={featured.slug}
                coverImageUrl={featured.coverImageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                quality={BLOG_LISTING_IMAGE_QUALITY}
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center gap-3 p-6 sm:p-10">
              {tagLabel(featured.tag) ? (
                <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                  {tagLabel(featured.tag)}
                </span>
              ) : null}
              <h2
                className={`${fontUnbounded.className} text-2xl font-bold leading-tight tracking-tight text-ink group-hover:text-accent`}
              >
                {featured.title}
              </h2>
              {featured.excerpt ? (
                <p className="line-clamp-3 text-[15px] leading-6 text-ink-muted">{featured.excerpt}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted-2">
                <time dateTime={featured.publishedAt || undefined}>{resolveBlogCardDateLabel(featured)}</time>
                <span>{featured.readMin} мин чтения</span>
              </div>
            </div>
          </Link>
        ) : null}

        {rest.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-alt">
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
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {tagLabel(post.tag) ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                      {tagLabel(post.tag)}
                    </span>
                  ) : null}
                  <h3 className="text-base font-bold leading-snug tracking-tight text-ink group-hover:text-accent">
                    {post.title}
                  </h3>
                  {post.excerpt ? (
                    <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{post.excerpt}</p>
                  ) : null}
                  <div className="mt-auto flex items-center gap-x-3 pt-2 text-xs text-ink-muted-2">
                    <time dateTime={post.publishedAt || undefined}>{resolveBlogCardDateLabel(post)}</time>
                    <span>{post.readMin} мин</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
          </div>

          <aside className="mt-10 flex flex-col gap-6 lg:mt-0 lg:sticky lg:top-24">
            {hotPosts.length ? (
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted-2">Популярное</p>
                <ul className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  {hotPosts.map((post) => (
                    <li key={post.slug} className="border-b border-line last:border-b-0">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-alt"
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                          <BlogCardSafeImage
                            slug={post.slug}
                            coverImageUrl={post.coverImageUrl}
                            alt=""
                            fill
                            sizes={IMAGE_SIZES.blogThumb}
                            quality={BLOG_LISTING_IMAGE_QUALITY}
                            className="object-cover"
                            fallback={<span className="block h-full w-full bg-surface-alt" />}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-sm font-semibold leading-snug text-ink">
                            {post.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-muted-2">{post.readMin} мин</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {promo ? (
              <Link
                href={promo.href}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 shadow-card transition hover:border-accent/40"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">Сейчас в афише</span>
                <span className="font-display text-lg font-bold leading-tight text-ink">{promo.cityName}</span>
                <span className="text-sm text-ink-muted">
                  {promo.eventsCount > 0 ? `${promo.eventsCount} событий` : 'События города'}
                  {promo.priceFrom ? ` · от ${promo.priceFrom} ₽` : ''}
                </span>
                <span className="mt-1 text-sm font-semibold text-accent">Смотреть</span>
              </Link>
            ) : null}

            <section className="rounded-2xl bg-ink p-5 text-white">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Send className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold leading-snug">Для тех, кто путешествует</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/85">
                    Подборки выходных и новые статьи - в Telegram-канале Дайбилет.
                  </p>
                  <Link
                    href="https://t.me/daibilet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-alt"
                  >
                    Подписаться
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}