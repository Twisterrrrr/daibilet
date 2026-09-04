'use client';

import Link from 'next/link';
import { Send } from 'lucide-react';

import { BlogAfishaPromo } from '@/components/BlogAfishaPromo.client';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import {
  authorLabel,
  blogSurfaceMetaLine,
} from '@/lib/blog-meta';
import type { BlogCardDto } from '@/lib/blog-utils';
import Image from 'next/image';

const HOT_THUMB_SIZES = '(max-width: 1024px) 112px, 80px';
const TELEGRAM_HREF = 'https://t.me/daibilet';

type BlogListingSidebarProps = {
  hotPosts: BlogCardDto[];
  afishaPromos?: Record<string, BlogSidebarPromoDto>;
  afishaFallbackCityName?: string | null;
  afishaFallbackCitySlug?: string | null;
};

function freshMetaLine(post: BlogCardDto): string | null {
  const meta = blogSurfaceMetaLine({
    tag: post.tag,
    articleType: post.articleType,
    city: post.city,
    citySlug: post.citySlug,
    citySlugs: post.citySlugs,
  });
  const read = post.readMin ? `${post.readMin} мин` : null;
  const parts = [meta, read].filter(Boolean);
  return parts.length ? parts.join(' · ').toUpperCase() : null;
}

function BlogTelegramPromo() {
  return (
    <section
      aria-label="Telegram-канал Дайбилет"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-primary-600 to-indigo-700 p-5 text-white shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
          <Send className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold leading-snug">Для тех, кто путешествует</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">
            Подборки выходных, новые статьи и горячие билеты - в Telegram-канале Дайбилет.
          </p>
          <Link
            href={TELEGRAM_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-slate-100"
          >
            Подписаться
          </Link>
        </div>
      </div>
    </section>
  );
}

export function BlogListingSidebar({
  hotPosts,
  afishaPromos = {},
  afishaFallbackCityName,
  afishaFallbackCitySlug,
}: BlogListingSidebarProps) {
  return (
    <aside aria-label="Боковая колонка блога" className="blog-layout__sidebar flex flex-col gap-5 lg:sticky lg:top-24 lg:gap-6">
      {hotPosts.length ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Популярное
          </p>
          <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {hotPosts.map((post) => {
              const href = `/blog/${post.slug}`;
              const meta = freshMetaLine(post);
              return (
                <li key={post.slug}>
                  <div className="flex items-center gap-3 px-4 py-3 transition hover:bg-primary-50/40">
                    <Link
                      href={href}
                      className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-primary-100"
                      aria-hidden
                      tabIndex={-1}
                    >
                      <Image
                        src={post.coverImageUrl}
                        alt=""
                        fill
                        sizes={HOT_THUMB_SIZES}
                        className="object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      {meta ? (
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                          {meta}
                        </p>
                      ) : null}
                      <Link
                        href={href}
                        className="line-clamp-3 font-display text-sm font-bold leading-snug text-slate-900 hover:text-primary-700"
                      >
                        {post.title}
                      </Link>
                      {post.authorName || post.authorId ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {post.authorName || authorLabel(post.authorId)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <BlogAfishaPromo
        promos={afishaPromos}
        fallbackCityName={afishaFallbackCityName}
        fallbackCitySlug={afishaFallbackCitySlug}
      />

      <BlogTelegramPromo />
    </aside>
  );
}
