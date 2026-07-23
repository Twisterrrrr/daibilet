'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import { resolveBlogCardDateLabel } from '@/lib/blog-utils';
import { authorLabel, blogAuthorNameClassName, isColumnArticle } from '@/lib/blog-meta';
import {
  resolveBlogListingCta,
  resolveBlogListingQuickLinks,
} from '@/lib/blog-listing-links';

function BlogListRow({ post }: { post: BlogCardDto }) {
  const staticPost = BLOG_POSTS.find((item) => item.slug === post.slug);
  const dateLabel = resolveBlogCardDateLabel(post);
  const tag = post.tag || staticPost?.tag || 'Гид';
  const articleHref = `/blog/${post.slug}`;
  const excerpt = String(post.excerpt || '').trim();
  const quickLinks = resolveBlogListingQuickLinks({
    slug: post.slug,
    title: post.title,
    tag,
    city: post.city,
    citySlug: post.citySlug,
    limit: 3,
  });
  const cta = resolveBlogListingCta({
    slug: post.slug,
    title: post.title,
    tag,
    city: post.city,
    citySlug: post.citySlug,
  });

  const chips: Array<{ key: string; label: string }> = [];
  // Без бейджа «Колонка» - сигнал только цвет имени автора.
  if (tag && tag !== 'Колонка' && !isColumnArticle(post.articleType)) {
    chips.push({ key: `tag-${tag}`, label: tag });
  }
  if (post.city) chips.push({ key: `city-${post.city}`, label: post.city });

  return (
    <article className="group flex gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-primary/30 hover:shadow-md sm:gap-4">
      <Link
        href={articleHref}
        aria-label={post.title}
        className="relative aspect-video w-[9rem] shrink-0 self-start overflow-hidden bg-slate-200 sm:w-52 md:w-64 lg:w-72"
      >
        <SafeImage
          src={post.coverImageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 9rem, (max-width: 768px) 13rem, (max-width: 1024px) 16rem, 18rem"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-2xl">
              📰
            </div>
          }
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col py-2.5 pr-3 sm:py-3 sm:pr-4">
        <h2 className="font-display text-base font-bold leading-snug text-slate-900 sm:text-lg md:text-xl">
          <Link href={articleHref} className="hover:text-primary-700">
            {post.title}
          </Link>
        </h2>

        {excerpt ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:mt-1.5 sm:line-clamp-3 sm:text-sm">
            {excerpt}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:text-xs">
          {post.authorName || post.authorId ? (
            <span className={blogAuthorNameClassName(post.articleType)}>
              {post.authorName || authorLabel(post.authorId)}
            </span>
          ) : null}
          {dateLabel ? <time dateTime={post.publishedAt || undefined}>{dateLabel}</time> : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.readMin} мин
          </span>
        </div>

        {chips.length || quickLinks.length || cta ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Метки и разделы">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 sm:text-xs"
              >
                {chip.label}
              </span>
            ))}
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex max-w-full items-center truncate rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 transition hover:border-primary/40 hover:bg-primary-50/70 hover:text-primary-700 sm:text-xs"
              >
                {link.label}
              </Link>
            ))}
            {cta ? (
              <Link
                href={cta.href}
                className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 sm:text-xs"
              >
                {cta.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function BlogListRows({ posts }: { posts: BlogCardDto[] }) {
  return (
    <ul className="flex flex-col gap-3 sm:gap-3.5">
      {posts.map((post) => (
        <li key={post.slug}>
          <BlogListRow post={post} />
        </li>
      ))}
    </ul>
  );
}
