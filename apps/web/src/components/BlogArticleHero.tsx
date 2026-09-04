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

  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} hideLastOnMobile />
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        {/* Align with venue/city heroes: ~28rem desktop, not magazine 42rem. */}
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] md:aspect-auto md:min-h-80 lg:min-h-[28rem]">
          <SafeImage
            src={coverImageUrl}
            alt=""
            fill
            priority
            sizes={IMAGE_SIZES.homeHero}
            className="object-cover object-center motion-safe:animate-[blog-hero-ken_1.15s_ease-out_both]"
            fallback={<div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-amber-900/50 to-slate-950" />}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/15"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent"
          />
          <div className="container-page relative flex h-full flex-col justify-end py-8 sm:py-10 lg:py-12">
            <div className="max-w-4xl motion-safe:animate-[blog-hero-rise_0.8s_ease-out_0.1s_both]">
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-200/85 sm:text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  Блог Дайбилет
                </p>
                {tag ? (
                  <span className="rounded-full bg-white/12 px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/20">
                    {tag}
                  </span>
                ) : null}
                {city && cityHref ? (
                  <a
                    href={cityHref}
                    className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/22"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {city}
                  </a>
                ) : city ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur">
                    <MapPin className="h-3.5 w-3.5" />
                    {city}
                  </span>
                ) : null}
              </div>

              <h1 className="font-display mt-3 max-w-4xl text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-3xl lg:text-4xl xl:text-[2.75rem]">
                {seriesTitle ? (
                  <>
                    {seriesTitle.lead}
                    <br />
                    {seriesTitle.rest}
                  </>
                ) : (
                  title
                )}
              </h1>

              {description ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/88 sm:text-base sm:leading-[1.55] line-clamp-3">
                  {description}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/65 sm:text-sm">
                {authorName ? (
                  <span className={blogAuthorNameClassName(articleType, 'dark')}>{authorName}</span>
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
          </div>
        </div>
      </section>
    </>
  );
}
