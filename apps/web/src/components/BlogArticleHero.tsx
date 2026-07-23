'use client';

import * as React from 'react';
import { BookOpen, Clock, MapPin } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';

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
  /** Имя автора колонки (не тип «Колонка»). */
  authorName?: string | null;
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
}: BlogArticleHeroProps) {
  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        {/* Mobile strong cover; desktop taller editorial plane */}
        <div className="relative aspect-[3/4] w-full sm:aspect-[16/11] lg:aspect-auto lg:h-[min(52vw,40rem)]">
          <SafeImage
            src={coverImageUrl}
            alt=""
            fill
            priority
            sizes={IMAGE_SIZES.blogFeatured}
            className="object-cover object-center"
            fallback={<div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-rose-600 to-slate-900" />}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/95 to-transparent"
          />
          <div className="container-page relative flex h-full flex-col justify-end py-10 sm:py-12 lg:py-16">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/75 sm:text-xs">
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
                ) : null}
              </div>

              <h1 className="font-serif mt-3 max-w-4xl text-[2rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-[3.35rem]">
                {title}
              </h1>

              {description ? (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/88 sm:text-lg sm:leading-[1.55]">
                  {description}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/65 sm:text-sm">
                {authorName ? <span className="font-medium text-white/90">{authorName}</span> : null}
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
