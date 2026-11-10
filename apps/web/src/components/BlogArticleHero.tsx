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
      <section className="border-b border-slate-200 bg-slate-50 text-slate-950">
        <div className="container-page py-4 sm:py-6 lg:py-8">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:rounded-3xl">
            <div className="relative aspect-[16/9] bg-slate-100 lg:aspect-auto lg:min-h-[30rem]">
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
            <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10 xl:p-12">
              <div className="max-w-2xl motion-safe:animate-[blog-hero-rise_0.8s_ease-out_0.1s_both]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-700 sm:text-xs">
                    <BookOpen className="h-3.5 w-3.5" />
                    Блог Дайбилет
                  </p>
                  {tag ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ) : null}
                  {city && cityHref ? (
                    <a
                      href={cityHref}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {city}
                    </a>
                  ) : city ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      <MapPin className="h-3.5 w-3.5" />
                      {city}
                    </span>
                  ) : null}
                </div>

                <h1 className="font-display mt-4 max-w-4xl text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-3xl lg:text-4xl xl:text-[2.75rem]">
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
                  <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-[1.55]">
                    {description}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm">
                  {authorName ? (
                    <span className={blogAuthorNameClassName(articleType, 'light')}>{authorName}</span>
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
        </div>
      </section>
    </>
  );
}
