'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import {
  clipBlogCardExcerpt,
  clipBlogCardTitle,
  expandLargeListingCopy,
  resolveBlogCardDateLabel,
} from '@/lib/blog-utils';
import {
  authorLabel,
  blogAuthorNameClassName,
  blogCityBadgeClassName,
  blogListingCityBadgeLabel,
  blogQuoteSurfaceClassName,
  blogTagBadgeClassName,
  normalizeBlogTagLabel,
} from '@/lib/blog-meta';
import {
  resolveBlogListingCta,
  resolveBlogListingQuickLinks,
} from '@/lib/blog-listing-links';

export type BlogPostCardVariant =
  | 'large'
  | 'small'
  | 'default'
  | 'banner'
  | 'strip'
  | 'lead'
  | 'quote';

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
  className = '',
}: {
  post: BlogCardDto;
  dateLabel: string;
  isLarge: boolean;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-3',
        onDark ? 'text-white/70' : 'text-slate-500',
        isLarge ? 'text-xs sm:text-sm' : 'text-[11px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
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
  const cityLabel = blogListingCityBadgeLabel(citySlug, city);
  const showCity = Boolean(cityLabel);

  if (!displayTag && !showCity) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {displayTag ? (
        <span
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 transition-colors duration-300 sm:text-[11px] ${blogTagBadgeClassName(displayTag)}`}
        >
          {displayTag}
        </span>
      ) : null}
      {showCity ? (
        <span
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 transition-colors duration-300 sm:text-[11px] ${blogCityBadgeClassName(citySlug)}`}
        >
          {cityLabel}
        </span>
      ) : null}
    </div>
  );
}

function ReadMoreCue({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-300',
        onDark
          ? 'text-white/90 group-hover:gap-2.5'
          : 'text-primary-700 group-hover:gap-2.5 group-hover:text-primary-800',
      ].join(' ')}
    >
      Читать
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
    </span>
  );
}

/** Meta → CTA: column gap ≥12px; never collapse to gap-y-2 when wrapped. */
const BLOG_META_CTA_FOOTER =
  'mt-auto flex flex-col items-start gap-3 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3';

export function BlogPostCard({
  post,
  variant = 'default',
}: {
  post: BlogCardDto;
  variant?: BlogPostCardVariant;
}) {
  if (!post?.slug || !post?.title) return null;

  const staticPost = BLOG_POSTS.find((item) => item.slug === post.slug);
  const dateLabel = resolveBlogCardDateLabel(post);
  const tag = post.tag || staticPost?.tag || 'Гид';
  const isLarge = variant === 'large';
  const isSmall = variant === 'small';
  const isBanner = variant === 'banner';
  const isStrip = variant === 'strip';
  const isLead = variant === 'lead';
  const isQuote = variant === 'quote';
  const articleHref = `/blog/${post.slug}`;
  const excerpt = String(post.excerpt || '').trim();
  const titleText = post.title;
  const hasCover = Boolean(String(post.coverImageUrl || '').trim());
  const largeCopy = isLarge || isLead ? expandLargeListingCopy(post.slug, excerpt, 900) : null;
  const quickLinks = isLarge || isLead
    ? resolveBlogListingQuickLinks({
        slug: post.slug,
        title: post.title,
        tag,
        city: post.city,
        citySlug: post.citySlug,
        limit: 4,
      })
    : [];
  const cta = isLarge || isLead
    ? resolveBlogListingCta({
        slug: post.slug,
        title: post.title,
        tag,
        city: post.city,
        citySlug: post.citySlug,
      })
    : null;

  const cardShell = [
    'group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-300',
    'hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg',
    'text-slate-900 visited:text-slate-900',
  ].join(' ');

  if (isQuote) {
    const quoteText = clipBlogCardExcerpt(excerpt || titleText, 180);
    const displayTag = normalizeBlogTagLabel(tag, post.articleType);
    return (
      <Link
        href={articleHref}
        className={`group relative flex min-h-[16.5rem] flex-col justify-between overflow-hidden rounded-card bg-gradient-to-br p-8 text-white shadow-card transition-all duration-300 hover:scale-[1.01] hover:shadow-lg md:min-h-[14rem] md:p-8 ${blogQuoteSurfaceClassName(displayTag || tag)}`}
      >
        <div>
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <p className="font-serif text-2xl font-medium leading-snug tracking-tight break-normal md:text-[1.65rem] md:leading-[1.3]">
            {quoteText}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3 md:mt-6">
          <div>
            <p className="line-clamp-2 break-normal font-serif text-sm font-semibold text-white/95">
              {clipBlogCardTitle(titleText, 72)}
            </p>
            <BlogCardMeta post={post} dateLabel={dateLabel} isLarge={false} onDark />
          </div>
          <ReadMoreCue onDark />
        </div>
      </Link>
    );
  }

  if (isLead) {
    const primary = clipBlogCardExcerpt(largeCopy?.primary || excerpt, 220);
    return (
      <article className={`${cardShell} lg:flex-row`}>
        <Link
          href={articleHref}
          aria-label={post.title}
          className="relative block aspect-[16/11] min-h-[12rem] w-full shrink-0 overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50 md:aspect-[2/1] md:min-h-0 lg:aspect-auto lg:min-h-[22rem] lg:w-[58%]"
        >
          {hasCover ? (
            <SafeImage
              src={post.coverImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.blogFeatured}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              fallback={<CoverFallback large />}
            />
          ) : (
            <CoverFallback large />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center p-7 md:p-7 lg:p-8">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="font-serif text-[1.85rem] font-semibold leading-[1.12] tracking-tight text-graphite break-normal md:text-4xl">
            <Link href={articleHref} className="transition-colors duration-300 hover:text-primary-700">
              {titleText}
            </Link>
          </h2>
          {primary ? (
            <p className="mt-3 line-clamp-4 break-normal text-base leading-relaxed text-graphite-muted sm:line-clamp-5 sm:text-lg">
              {primary}
            </p>
          ) : null}
          <div className={BLOG_META_CTA_FOOTER}>
            <BlogCardMeta post={post} dateLabel={dateLabel} isLarge />
            {cta ? (
              <Link
                href={cta.href}
                className="group/cta inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-700"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
              </Link>
            ) : (
              <Link href={articleHref} className="shrink-0">
                <ReadMoreCue />
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  }

  if (isBanner) {
    const bannerLead = clipBlogCardExcerpt(
      excerpt || expandLargeListingCopy(post.slug, excerpt, 180).primary,
      120,
    );
    return (
      <article className="group relative flex min-h-[19rem] overflow-hidden rounded-card bg-slate-900 shadow-card transition-all duration-300 hover:scale-[1.01] hover:shadow-lg md:min-h-[16rem] lg:min-h-[18rem]">
        <Link href={articleHref} aria-label={post.title} className="absolute inset-0 block">
          {hasCover ? (
            <SafeImage
              src={post.coverImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.blogFeatured}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              fallback={<CoverFallback large />}
            />
          ) : (
            <CoverFallback large />
          )}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/10"
          />
        </Link>
        <div className="relative z-10 mt-auto flex w-full max-w-3xl flex-col gap-3 p-7 md:gap-3 md:p-7">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="font-serif text-2xl font-semibold leading-[1.15] tracking-tight text-white break-normal md:text-2xl lg:text-3xl">
            <Link href={articleHref} className="hover:text-white/90">
              {clipBlogCardTitle(titleText, 96)}
            </Link>
          </h2>
          {bannerLead ? (
            <p className="line-clamp-3 break-normal text-sm leading-relaxed text-white/80 sm:line-clamp-2 sm:text-base">
              {bannerLead}
            </p>
          ) : null}
          <ReadMoreCue onDark />
          <BlogCardMeta post={post} dateLabel={dateLabel} isLarge onDark />
        </div>
      </article>
    );
  }

  if (isStrip) {
    return (
      <article className={`${cardShell} md:flex-row`}>
        <Link
          href={articleHref}
          aria-label={post.title}
          className="relative block aspect-[16/11] min-h-[11rem] w-full shrink-0 overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50 md:aspect-auto md:min-h-[9.5rem] md:w-[42%]"
        >
          {hasCover ? (
            <SafeImage
              src={post.coverImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.blogCard}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              fallback={<CoverFallback />}
            />
          ) : (
            <CoverFallback />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col p-6 md:p-5">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="line-clamp-3 break-normal font-serif text-lg font-semibold leading-snug tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-primary-700 md:text-lg">
            <Link href={articleHref}>{clipBlogCardTitle(titleText, 96)}</Link>
          </h2>
          {excerpt ? (
            <p className="mt-2 line-clamp-3 break-normal text-sm leading-relaxed text-slate-600">
              {clipBlogCardExcerpt(excerpt, 140)}
            </p>
          ) : null}
          <div className="mt-auto flex flex-col gap-3 pt-4">
            <ReadMoreCue />
            <BlogCardMeta post={post} dateLabel={dateLabel} isLarge={false} />
          </div>
        </div>
      </article>
    );
  }

  if (isLarge) {
    const primary = clipBlogCardExcerpt(largeCopy?.primary || excerpt, 280);
    const secondary = largeCopy?.secondary ? clipBlogCardExcerpt(largeCopy.secondary, 220) : '';
    const hasCopy = Boolean(primary || secondary);

    return (
      <article className={cardShell}>
        <Link
          href={articleHref}
          aria-label={post.title}
          className="relative block aspect-[2/1] min-h-[13rem] shrink-0 overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50 md:min-h-[11rem]"
        >
          {hasCover ? (
            <SafeImage
              src={post.coverImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.blogFeatured}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              fallback={<CoverFallback large />}
            />
          ) : (
            <CoverFallback large />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col p-7 md:p-6">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
          <h2 className="font-serif text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-graphite break-normal md:text-3xl">
            <Link href={articleHref} className="transition-colors duration-300 hover:text-primary-700">
              {titleText}
            </Link>
          </h2>
          {hasCopy ? (
            <p className="mt-2.5 line-clamp-5 whitespace-pre-line break-normal text-sm leading-relaxed text-graphite-muted sm:line-clamp-6 sm:text-base sm:leading-[1.55]">
              {[primary, secondary].filter(Boolean).join('\n\n')}
            </p>
          ) : null}
          {quickLinks.length ? (
            <div className="mt-3 flex flex-wrap gap-2 pt-3" aria-label="Связанные разделы">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex max-w-full items-center truncate rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 ring-1 ring-primary-100 transition-all duration-300 hover:translate-x-0.5 hover:bg-primary-100 hover:text-primary-900 sm:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
          <div className={BLOG_META_CTA_FOOTER}>
            <BlogCardMeta post={post} dateLabel={dateLabel} isLarge />
            {cta ? (
              <Link
                href={cta.href}
                className="group/cta inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-700"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
              </Link>
            ) : (
              <Link href={articleHref} className="shrink-0">
                <ReadMoreCue />
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <Link href={articleHref} className={cardShell}>
      <div
        className={[
          'relative min-h-[9rem] overflow-hidden bg-gradient-to-br from-sky-100 to-primary-50 md:min-h-0',
          isSmall ? 'aspect-[16/11] md:aspect-[16/10]' : 'aspect-[16/10] md:aspect-[16/9]',
        ].join(' ')}
      >
        {hasCover ? (
          <SafeImage
            src={post.coverImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.blogCard}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            fallback={<CoverFallback />}
          />
        ) : (
          <CoverFallback />
        )}
      </div>
      <div
        className={[
          'flex flex-1 flex-col',
          isSmall ? 'p-5 md:p-4' : 'p-7 md:p-5',
        ].join(' ')}
      >
        <TagChips tag={tag} city={post.city} citySlug={post.citySlug} articleType={post.articleType} />
        <h2
          className={[
            'line-clamp-3 break-normal font-serif font-semibold leading-snug tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-primary-700',
            isSmall ? 'text-lg md:text-[1.1rem]' : 'text-xl md:text-xl',
          ].join(' ')}
        >
          {clipBlogCardTitle(titleText, isSmall ? 72 : 88)}
        </h2>
        {excerpt ? (
          <p
            className={[
              'mt-2 line-clamp-3 break-normal leading-relaxed text-slate-600',
              isSmall ? 'text-sm md:text-sm' : 'text-base md:text-sm',
            ].join(' ')}
          >
            {clipBlogCardExcerpt(excerpt, isSmall ? 110 : 140)}
          </p>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 pt-4">
          <ReadMoreCue />
          <BlogCardMeta post={post} dateLabel={dateLabel} isLarge={false} />
        </div>
      </div>
    </Link>
  );
}
