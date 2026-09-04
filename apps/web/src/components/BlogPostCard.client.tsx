'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';

import { IMAGE_SIZES, BlogCardSafeImage, SafeImage } from '@/components/SafeImage.client';
import { BLOG_POSTS } from '@/data/blog-posts';
import type { BlogCardDto } from '@/lib/blog-utils';
import { resolveBlogCardDateLabel } from '@/lib/blog-utils';
import {
  blogCityBadgeClassName,
  blogQuoteSurfaceClassName,
  blogSurfaceMeta,
  blogTagBadgeClassName,
  glueRubNbsp,
  normalizeBlogTagLabel,
  stripColumnMetaPrefix,
} from '@/lib/blog-meta';
import { resolveBlogListingCta } from '@/lib/blog-listing-links';

export type BlogPostCardVariant =
  | 'large'
  | 'small'
  | 'default'
  | 'banner'
  | 'strip'
  | 'lead'
  | 'quote';

/** Full listing teaser — never clip / ellipsis; keep ₽ glued to the number. */
function fullListingExcerpt(excerpt: string): string {
  const plain = stripColumnMetaPrefix(excerpt)
    .replace(/[^\S\u00a0]+/g, ' ')
    .trim();
  return glueRubNbsp(plain);
}

function CoverFallback({ large = false }: { large?: boolean }) {
  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-sky-50',
        large ? 'text-slate-400' : 'text-slate-300',
      ].join(' ')}
    >
      <BookOpen className={large ? 'h-12 w-12' : 'h-8 w-8'} strokeWidth={1.25} aria-hidden />
    </div>
  );
}

function BlogCardMeta({
  post,
  dateLabel,
  onDark = false,
}: {
  post: BlogCardDto;
  dateLabel: string;
  onDark?: boolean;
}) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
        onDark ? 'text-white/65' : 'text-slate-500',
      ].join(' ')}
    >
      {dateLabel ? <time dateTime={post.publishedAt || undefined}>{dateLabel}</time> : null}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {post.readMin} мин
      </span>
    </div>
  );
}

function TagChips({
  tag,
  city,
  citySlug,
  citySlugs,
  articleType,
}: {
  tag: string;
  city?: string | null;
  citySlug?: string | null;
  citySlugs?: string[] | null;
  articleType?: string | null;
}) {
  const { typeLabel, cityLabel } = blogSurfaceMeta({ tag, articleType, city, citySlug, citySlugs });
  const showCity = Boolean(cityLabel);
  if (!typeLabel && !showCity) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {typeLabel ? (
        <span
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:text-[11px] ${blogTagBadgeClassName(typeLabel)}`}
        >
          {typeLabel}
        </span>
      ) : null}
      {showCity ? (
        <span
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:text-[11px] ${blogCityBadgeClassName(citySlug)}`}
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
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
    </span>
  );
}

const cardShell = [
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white',
  'shadow-sm transition duration-300 hover:border-slate-300 hover:shadow-md',
  'text-slate-900 visited:text-slate-900',
].join(' ');

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
  const isBanner = variant === 'banner';
  const isQuote = variant === 'quote';
  const isLead = variant === 'lead';
  const isStrip = variant === 'strip';
  const articleHref = `/blog/${post.slug}`;
  const titleText = post.title;
  const excerpt = fullListingExcerpt(String(post.excerpt || ''));
  const hasCover = Boolean(String(post.coverImageUrl || '').trim());
  const cta = isLead
    ? resolveBlogListingCta({
        slug: post.slug,
        title: post.title,
        tag,
        city: post.city,
        citySlug: post.citySlug,
      })
    : null;

  if (isQuote) {
    const displayTag = normalizeBlogTagLabel(tag, post.articleType);
    return (
      <Link
        href={articleHref}
        className={`group relative flex h-full min-h-[16.5rem] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-8 text-white shadow-sm transition duration-300 hover:shadow-md md:p-8 ${blogQuoteSurfaceClassName(displayTag || tag)}`}
      >
        <div className="flex flex-col gap-3">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} citySlugs={post.citySlugs} articleType={post.articleType} />
          <p className="break-words text-2xl font-semibold leading-snug tracking-tight md:text-[1.65rem]">
            {excerpt || titleText}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="break-words text-sm font-semibold text-white/95">{titleText}</p>
            <BlogCardMeta post={post} dateLabel={dateLabel} onDark />
          </div>
          <ReadMoreCue onDark />
        </div>
      </Link>
    );
  }

  if (isBanner || isLead) {
    return (
      <article className="group relative flex h-full min-h-[18rem] overflow-hidden rounded-2xl bg-slate-900 shadow-sm transition duration-300 hover:shadow-md md:min-h-[20rem] lg:min-h-[22rem]">
        <Link href={articleHref} aria-label={post.title} className="absolute inset-0 block">
          {hasCover ? (
            <BlogCardSafeImage
              slug={post.slug}
              coverImageUrl={post.coverImageUrl}
              alt=""
              fill
              sizes={IMAGE_SIZES.blogFeatured}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              fallback={<CoverFallback large />}
            />
          ) : (
            <CoverFallback large />
          )}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent"
          />
        </Link>
        <div className="relative z-10 mt-auto flex w-full max-w-3xl flex-col gap-3 p-6 sm:p-7 md:p-8">
          <TagChips tag={tag} city={post.city} citySlug={post.citySlug} citySlugs={post.citySlugs} articleType={post.articleType} />
          <h2 className="break-words font-serif text-2xl font-semibold leading-[1.15] tracking-tight text-white md:text-3xl">
            <Link href={articleHref} className="hover:text-white/90">
              {titleText}
            </Link>
          </h2>
          {excerpt ? (
            <p className="break-words text-sm leading-relaxed text-white/85 sm:text-base">{excerpt}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <ReadMoreCue onDark />
            <BlogCardMeta post={post} dateLabel={dateLabel} onDark />
            {cta ? (
              <Link
                href={cta.href}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/35 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  // Wide: horizontal — photo fills row height; text block stays packed (no white gaps).
  if (isStrip) {
    return (
      <article className={cardShell}>
        <div className="flex h-full min-h-[13rem] flex-col lg:flex-row">
          <Link
            href={articleHref}
            aria-label={post.title}
            className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100 lg:aspect-auto lg:h-auto lg:w-[38%] lg:min-w-[11rem] lg:max-w-[16rem] lg:self-stretch"
          >
            {hasCover ? (
              <BlogCardSafeImage
                slug={post.slug}
                coverImageUrl={post.coverImageUrl}
                alt=""
                fill
                sizes={IMAGE_SIZES.blogCard}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                fallback={<CoverFallback />}
              />
            ) : (
              <CoverFallback />
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 p-5 sm:p-6">
            <TagChips tag={tag} city={post.city} citySlug={post.citySlug} citySlugs={post.citySlugs} articleType={post.articleType} />
            <h2 className="break-words text-lg font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-primary-700 lg:text-xl">
              <Link href={articleHref}>{titleText}</Link>
            </h2>
            {excerpt ? <p className="break-words text-sm leading-relaxed text-slate-600">{excerpt}</p> : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              <ReadMoreCue />
              <BlogCardMeta post={post} dateLabel={dateLabel} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Tall column: photo grows to match the wide card; full text under it.
  return (
    <Link href={articleHref} className={cardShell}>
      <div className="relative min-h-[11rem] flex-1 overflow-hidden bg-slate-100">
        {hasCover ? (
          <SafeImage
            src={post.coverImageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES.blogCard}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            fallback={<CoverFallback />}
          />
        ) : (
          <CoverFallback />
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 p-4 sm:p-5">
        <TagChips tag={tag} city={post.city} citySlug={post.citySlug} citySlugs={post.citySlugs} articleType={post.articleType} />
        <h2 className="break-words text-base font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-primary-700 sm:text-lg">
          {titleText}
        </h2>
        {excerpt ? <p className="break-words text-sm leading-relaxed text-slate-600">{excerpt}</p> : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <ReadMoreCue />
          <BlogCardMeta post={post} dateLabel={dateLabel} />
        </div>
      </div>
    </Link>
  );
}
