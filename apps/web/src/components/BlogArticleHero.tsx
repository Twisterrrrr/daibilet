'use client';

import * as React from 'react';
import { BookOpen, Clock, MapPin } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { blogAuthorNameClassName } from '@/lib/blog-meta';
import { splitBlogSeriesHeroTitle } from '@/lib/blog-utils';

type BlogArticleHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  publishedLabel?: string;
  readMin?: number;
  city?: string | null;
  cityHref?: string | null;
  tag?: string | null;
  /** Имя автора колонки. */
  authorName?: string | null;
  /** articleType === 'column' → brand blue имя + бейдж «От автора». */
  articleType?: string | null;
};

export function BlogArticleHero({
  breadcrumbs,
  title,
  description,
  coverImageUrl,
  publishedLabel,
  readMin,
  city,
  cityHref,
  tag,
  authorName,
  articleType,
}: BlogArticleHeroProps) {
  const seriesTitle = splitBlogSeriesHeroTitle(title);
  const colonIndex = title.indexOf(':');
  const titleParts =
    seriesTitle ||
    (colonIndex > 0 && title.slice(colonIndex + 1).trim()
      ? { lead: title.slice(0, colonIndex + 1), rest: title.slice(colonIndex + 1).trim() }
      : null);

  const details = (overlay: boolean) => (
    <div className={overlay ? 'max-w-6xl' : 'max-w-4xl'}>
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={`inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs ${
            overlay ? 'text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.8)]' : 'text-amber-700'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Блог Дайбилет
        </p>
        {tag ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ring-1 ${
              overlay
                ? 'bg-white/20 text-white ring-white/35 backdrop-blur-md drop-shadow-[0_1px_5px_rgba(0,0,0,0.55)]'
                : 'bg-slate-100 text-slate-700 ring-slate-200'
            }`}
          >
            {tag}
          </span>
        ) : null}
        {city && cityHref ? (
          <a
            href={cityHref}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
              overlay
                ? 'bg-white/20 text-white ring-white/35 backdrop-blur-md hover:bg-white/30 drop-shadow-[0_1px_5px_rgba(0,0,0,0.55)]'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {city}
          </a>
        ) : city ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              overlay
                ? 'bg-white/20 text-white ring-white/35 backdrop-blur-md drop-shadow-[0_1px_5px_rgba(0,0,0,0.55)]'
                : 'bg-white text-slate-700 ring-slate-200'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {city}
          </span>
        ) : null}
      </div>

      <h1
        className={`font-display mt-4 max-w-6xl text-[1.75rem] font-extrabold leading-[1.1] tracking-tight sm:text-3xl lg:text-4xl xl:text-[2.75rem] ${
          overlay
            ? 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]'
            : 'text-slate-950'
        }`}
      >
        {titleParts ? (
          <>
            {titleParts.lead}
            <br />
            {titleParts.rest}
          </>
        ) : (
          title
        )}
      </h1>

      {description ? (
        <p
          className={`mt-3 max-w-5xl text-sm leading-relaxed sm:text-base sm:leading-[1.55] ${
            overlay
              ? 'text-white drop-shadow-[0_1px_7px_rgba(0,0,0,0.9)]'
              : 'text-slate-600'
          }`}
        >
          {description}
        </p>
      ) : null}

      <div
        className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm ${
          overlay
            ? 'text-white drop-shadow-[0_1px_7px_rgba(0,0,0,0.95)]'
            : 'text-slate-500'
        }`}
      >
        {authorName ? (
          <span className={blogAuthorNameClassName(articleType, overlay ? 'dark' : 'light')}>
            {authorName}
          </span>
        ) : null}
        {publishedLabel ? <span>{publishedLabel}</span> : null}
        {readMin ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {readMin} мин чтения
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} hideLastOnMobile />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="relative hidden w-full overflow-hidden bg-slate-100 lg:block lg:aspect-[4.3/1]">
          <SafeImage
            src={coverImageUrl}
            alt=""
            fill
            priority
            sizes={IMAGE_SIZES.homeHero}
            className="object-cover object-center"
            fallback={<div className="absolute inset-0 bg-slate-200" />}
          />

          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 hidden h-[48%] bg-gradient-to-t from-black/65 via-black/20 to-transparent lg:block"
          />

          <div className="container-page absolute inset-x-0 bottom-0 hidden pb-10 pt-24 lg:block xl:pb-12">
            {details(true)}
          </div>
        </div>

        <div className="container-page py-4 sm:py-6 lg:hidden">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[16/9] bg-slate-100">
              <SafeImage
                src={coverImageUrl}
                alt=""
                fill
                priority
                sizes={IMAGE_SIZES.homeHero}
                className="object-contain object-center"
                fallback={<div className="absolute inset-0 bg-slate-100" />}
              />
            </div>
            <div className="p-5 sm:p-8">{details(false)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
