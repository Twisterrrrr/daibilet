'use client';

import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import { expandLargeListingCopy, resolveBlogCardDateLabel } from '@/lib/blog-utils';
import { authorLabel, blogAuthorNameClassName } from '@/lib/blog-meta';
import {
  resolveBlogListingCta,
  resolveBlogListingQuickLinks,
} from '@/lib/blog-listing-links';

export type BlogPostCardVariant = 'large' | 'small' | 'default';

function BlogCardMeta({
  post,
  dateLabel,
  isLarge,
}: {
  post: BlogCardDto;
  dateLabel: string;
  isLarge: boolean;
}) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-3 text-slate-500',
        isLarge ? 'mt-3 text-xs sm:text-sm' : 'text-[11px]',
      ].join(' ')}
    >
      {post.authorName || post.authorId ? (
        <span className={blogAuthorNameClassName(post.articleType)}>
          {post.authorName || authorLabel(post.authorId)}
        </span>
      ) : null}
      {dateLabel ? (
        <span
          className={[
            'inline-flex items-center gap-1',
            isLarge ? 'font-medium text-slate-600' : '',
          ].join(' ')}
        >
          {isLarge ? <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
          <time dateTime={post.publishedAt || undefined}>{dateLabel}</time>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <Clock className={isLarge ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {post.readMin} мин
      </span>
    </div>
  );
}

export function BlogPostCard({
  post,
  variant = 'default',
}: {
  post: BlogCardDto;
  variant?: BlogPostCardVariant;
}) {
  const staticPost = BLOG_POSTS.find((item) => item.slug === post.slug);
  const dateLabel = resolveBlogCardDateLabel(post);
  const tag = post.tag || staticPost?.tag || 'Гид';
  const isLarge = variant === 'large';
  const isSmall = variant === 'small';
  const articleHref = `/blog/${post.slug}`;
  const excerpt = String(post.excerpt || '').trim();
  const largeCopy = isLarge ? expandLargeListingCopy(post.slug, excerpt, 900) : null;
  const quickLinks = isLarge
    ? resolveBlogListingQuickLinks({
        slug: post.slug,
        title: post.title,
        tag,
        city: post.city,
        citySlug: post.citySlug,
        limit: 4,
      })
    : [];
  const cta = isLarge
    ? resolveBlogListingCta({
        slug: post.slug,
        title: post.title,
        tag,
        city: post.city,
        citySlug: post.citySlug,
      })
    : null;

  const cardShell = [
    'group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card transition duration-300',
    'hover:-translate-y-0.5 hover:shadow-card-hover',
    // Whole-card <Link>: keep title color stable (:visited must not turn blue).
    'text-slate-900 visited:text-slate-900',
  ].join(' ');

  // Large: title → текст → chips → CTA → meta с датой (без nested <a>).
  // Cover: fixed 2:1 (не lg:flex-1) - иначе фото съедает высоту row-span-2; текст получает flex-1.
  if (isLarge) {
    const primary = largeCopy?.primary || excerpt;
    const secondary = largeCopy?.secondary || '';
    const hasCopy = Boolean(primary || secondary);

    return (
      <article className={cardShell}>
        <Link
          href={articleHref}
          aria-label={post.title}
          className="relative block aspect-[2/1] min-h-[9.5rem] shrink-0 overflow-hidden bg-slate-200 sm:min-h-[11rem]"
        >
          <SafeImage
            src={post.coverImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.blogFeatured}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-4xl">
                📰
              </div>
            }
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold leading-snug text-graphite sm:text-2xl lg:text-[1.75rem]">
            <Link href={articleHref} className="hover:text-primary-700">
              {post.title}
            </Link>
          </h2>
          {hasCopy ? (
            <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-graphite-muted line-clamp-[10] sm:text-base sm:leading-[1.55] sm:line-clamp-[12]">
              {[primary, secondary].filter(Boolean).join('\n\n')}
            </p>
          ) : null}
          {quickLinks.length ? (
            <div className="mt-3 flex flex-wrap gap-2 pt-3" aria-label="Связанные разделы">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex max-w-full items-center truncate rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium text-graphite-muted transition hover:bg-slate-200/80 hover:text-primary-700 sm:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
          {cta ? (
            <div className="mt-3">
              <Link
                href={cta.href}
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                {cta.label}
              </Link>
            </div>
          ) : null}
          <BlogCardMeta post={post} dateLabel={dateLabel} isLarge />
        </div>
      </article>
    );
  }

  return (
    <Link href={articleHref} className={cardShell}>
      <div
        className={[
          'relative overflow-hidden bg-slate-200',
          isSmall ? 'aspect-[16/10]' : 'aspect-[16/9]',
        ].join(' ')}
      >
        <SafeImage
          src={post.coverImageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.blogCard}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-4xl">
              📰
            </div>
          }
        />
      </div>
      <div className={['flex flex-1 flex-col', isSmall ? 'p-4' : 'p-5'].join(' ')}>
        <h2
          className={[
            'font-display font-bold leading-snug text-slate-900 group-hover:text-primary-700',
            isSmall ? 'text-base sm:text-[1.05rem]' : 'text-lg',
          ].join(' ')}
        >
          {post.title}
        </h2>
        {excerpt ? (
          <p
            className={[
              // Soft safety clamp only - list leads must not die mid-sentence with empty card space.
              'mt-2 leading-relaxed text-slate-600',
              isSmall
                ? 'line-clamp-[10] text-xs sm:text-sm sm:line-clamp-[12]'
                : 'line-clamp-[12] text-sm',
            ].join(' ')}
          >
            {excerpt}
          </p>
        ) : null}
        <div className="mt-auto pt-3">
          <BlogCardMeta post={post} dateLabel={dateLabel} isLarge={false} />
        </div>
      </div>
    </Link>
  );
}
