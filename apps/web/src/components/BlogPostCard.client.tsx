'use client';

import Link from 'next/link';
import { BookOpen, Calendar, Clock } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import { expandLargeListingCopy, resolveBlogCardDateLabel } from '@/lib/blog-utils';
import {
  authorLabel,
  blogAuthorNameClassName,
  blogCityBadgeClassName,
  blogTagBadgeClassName,
  cityFilterLabel,
  normalizeBlogTagLabel,
} from '@/lib/blog-meta';
import {
  resolveBlogListingCta,
  resolveBlogListingQuickLinks,
} from '@/lib/blog-listing-links';

export type BlogPostCardVariant = 'large' | 'small' | 'default' | 'banner' | 'strip';

function CoverFallback({ large = false }: { large?: boolean }) {
  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-primary-50 to-amber-50',
        large ? 'text-primary-400' : 'text-primary-300',
      ].join(' ')}
    >
      <BookOpen className={large ? 'h-12 w-12' : 'h-8 w-8'} strokeWidth={1.25} aria-hidden />
    </div>
  );
}

function BlogCardMeta({
  post,
  dateLabel,
  isLarge,
  onDark = false,
}: {
  post: BlogCardDto;
  dateLabel: string;
  isLarge: boolean;
  onDark?: boolean;
}) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-3',
        onDark ? 'text-white/70' : 'text-slate-500',
        isLarge ? 'mt-3 text-xs sm:text-sm' : 'text-[11px]',
      ].join(' ')}
    >
      {post.authorName || post.authorId ? (
        <span className={onDark ? 'font-medium text-white/85' : blogAuthorNameClassName(post.articleType)}>
          {post.authorName || authorLabel(post.authorId)}
        </span>
      ) : null}
      {dateLabel ? (
        <span
          className={[
            'inline-flex items-center gap-1',
            isLarge && !onDark ? 'font-medium text-slate-600' : '',
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

function TagChips({
  tag,
  city,
  citySlug,
  articleType,
}: {
  tag: string;
  city?: string | null;
  citySlug?: string | null;
  articleType?: string | null;
}) {
  const displayTag = normalizeBlogTagLabel(tag, articleType);
  const cityLabel = cityFilterLabel(citySlug, city);
  const showCity = Boolean(city || citySlug) && cityLabel !== 'Без города';

  if (!displayTag && !showCity) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {displayTag ? (
        <span
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:text-[11px] ${blogTagBadgeClassName(displayTag)}`}
        >
          {displayTag}
        </span>
      ) : null}
      {showCity ? (
        <span
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:text-[11px] ${blogCityBadgeClassName(citySlug)}`}
        >
          {cityLabel === 'Санкт-Петербург' ? 'Питер' : cityLabel}
        </span>
      ) : null}
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
  const isBanner = variant === 'banner';
  const isStrip = variant === 'strip';
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
    'text-slate-900 visited:text-slate-900',
  ].join(' ');

  if (isBanner) {
    const bannerLead = excerpt || expandLargeListingCopy(post.slug, excerpt, 180).primary;
    return (
      <article className="group relative flex min-h-[14rem] overflow-hidden rounded-card bg-slate-900 shadow-card sm:min-h-[16rem] lg:min-h-[18rem]">
        <Link href={articleHref} aria-label={post.title} className="absolute inset-0 block">
          <SafeImage
            src={post.coverImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.blogFeatured}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            fallback={<CoverFallback large />}
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/10"
          />
        </Link>
        <div className="relative z-10 mt-auto flex w-full max-w-3xl flex-col gap-2 p-5 sm:gap-3 sm:p-7">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="font-serif text-xl font-semibold leading-[1.15] tracking-tight text-white sm:text-2xl lg:text-3xl">
            <Link href={articleHref} className="hover:text-white/90">
              {post.title}
            </Link>
          </h2>
          {bannerLead ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-white/80 sm:text-base">{bannerLead}</p>
          ) : null}
          <BlogCardMeta post={post} dateLabel={dateLabel} isLarge onDark />
        </div>
      </article>
    );
  }

  if (isStrip) {
    return (
      <article className={`${cardShell} sm:flex-row`}>
        <Link
          href={articleHref}
          aria-label={post.title}
          className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50 sm:aspect-auto sm:w-[42%] sm:min-h-[9.5rem]"
        >
          <SafeImage
            src={post.coverImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.blogCard}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallback={<CoverFallback />}
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="font-display text-base font-extrabold leading-snug text-slate-900 group-hover:text-primary-700 sm:text-lg">
            <Link href={articleHref}>{post.title}</Link>
          </h2>
          {excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{excerpt}</p>
          ) : null}
          <div className="mt-auto pt-3">
            <BlogCardMeta post={post} dateLabel={dateLabel} isLarge={false} />
          </div>
        </div>
      </article>
    );
  }

  if (isLarge) {
    const primary = largeCopy?.primary || excerpt;
    const secondary = largeCopy?.secondary || '';
    const hasCopy = Boolean(primary || secondary);

    return (
      <article className={cardShell}>
        <Link
          href={articleHref}
          aria-label={post.title}
          className="relative block aspect-[2/1] min-h-[9.5rem] shrink-0 overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50 sm:min-h-[11rem]"
        >
          <SafeImage
            src={post.coverImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.blogFeatured}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallback={<CoverFallback large />}
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="font-serif text-2xl font-semibold leading-[1.15] tracking-tight text-graphite sm:text-3xl">
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
                  className="inline-flex max-w-full items-center truncate rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 ring-1 ring-primary-100 transition hover:bg-primary-100 hover:text-primary-900 sm:text-sm"
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
          'relative overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50',
          isSmall ? 'aspect-[16/10]' : 'aspect-[16/9]',
        ].join(' ')}
      >
        <SafeImage
          src={post.coverImageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.blogCard}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={<CoverFallback />}
        />
      </div>
      <div className={['flex flex-1 flex-col', isSmall ? 'p-4' : 'p-5'].join(' ')}>
        <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
        <h2
          className={[
            'font-display font-extrabold leading-snug text-slate-900 group-hover:text-primary-700',
            isSmall ? 'text-base sm:text-[1.1rem]' : 'text-lg sm:text-xl',
          ].join(' ')}
        >
          {post.title}
        </h2>
        {excerpt ? (
          <p
            className={[
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
