'use client';

import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import { formatBlogPublishedAt } from '@/lib/blog-utils';
import { authorLabel } from '@/lib/blog-meta';
import { resolveBlogCityHref } from '@/lib/blog-article-city';

export type BlogPostCardVariant = 'large' | 'small' | 'default';

export function BlogPostCard({
  post,
  variant = 'default',
}: {
  post: BlogCardDto;
  variant?: BlogPostCardVariant;
}) {
  const staticPost = BLOG_POSTS.find((item) => item.slug === post.slug);
  const dateLabel = formatBlogPublishedAt(post.publishedAt, staticPost?.date || '');
  const tag = post.tag || staticPost?.tag || 'Гид';
  const cityLink = resolveBlogCityHref(post.city, post.citySlug);
  const isLarge = variant === 'large';
  const isSmall = variant === 'small';

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={[
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
      ].join(' ')}
    >
      <div
        className={[
          'relative overflow-hidden bg-slate-200',
          isLarge
            ? 'aspect-[16/10] min-h-[12rem] sm:min-h-[14rem] lg:aspect-auto lg:min-h-[18rem] lg:flex-1'
            : isSmall
              ? 'aspect-[16/10]'
              : 'aspect-[16/9]',
        ].join(' ')}
      >
        <SafeImage
          src={post.coverImageUrl}
          alt=""
          fill
          sizes={isLarge ? IMAGE_SIZES.blogFeatured : IMAGE_SIZES.blogCard}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-4xl">
              📰
            </div>
          }
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-3">
          <span className="inline-flex rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
            {tag}
          </span>
          {post.city && cityLink ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <MapPin className="h-3 w-3" aria-hidden />
              {post.city}
            </span>
          ) : null}
        </div>
      </div>
      <div className={['flex flex-1 flex-col', isLarge ? 'p-5 sm:p-6' : isSmall ? 'p-4' : 'p-5'].join(' ')}>
        <h2
          className={[
            'font-bold leading-snug text-slate-900 group-hover:text-primary-700',
            isLarge ? 'text-xl sm:text-2xl lg:text-[1.65rem]' : isSmall ? 'text-base sm:text-lg' : 'text-lg',
          ].join(' ')}
        >
          {post.title}
        </h2>
        <p
          className={[
            'mt-2 flex-1 leading-relaxed text-slate-600',
            isLarge ? 'line-clamp-4 text-sm sm:text-base' : isSmall ? 'line-clamp-2 text-sm' : 'line-clamp-3 text-sm',
          ].join(' ')}
        >
          {post.excerpt}
        </p>
        <div
          className={[
            'mt-4 flex flex-wrap items-center gap-3 text-slate-500',
            isLarge ? 'text-sm' : 'text-xs',
          ].join(' ')}
        >
          {post.authorName || post.authorId ? (
            <span className="font-medium text-slate-600">{post.authorName || authorLabel(post.authorId)}</span>
          ) : null}
          {dateLabel ? <span>{dateLabel}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Clock className={isLarge ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            {post.readMin} мин
          </span>
        </div>
      </div>
    </Link>
  );
}
