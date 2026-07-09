import * as React from 'react';
import { BookOpen, Clock, MapPin } from 'lucide-react';

import { PageBreadcrumbBar, type BreadcrumbItem } from '@/components/PageBreadcrumbs';

type BlogArticleHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  publishedLabel?: string;
  readMin?: number;
  city?: string | null;
  cityHref?: string | null;
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
}: BlogArticleHeroProps) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const showImage = Boolean(coverImageUrl) && !hasImageError;

  return (
    <>
      <PageBreadcrumbBar items={breadcrumbs} />
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-900 text-white">
        <div className="relative min-h-[280px] sm:min-h-[320px] lg:min-h-[380px]">
          {showImage ? (
            <img
              src={coverImageUrl || ''}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-rose-500 to-primary-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/25" />
          <div className="container-page relative flex h-full min-h-[inherit] flex-col justify-end py-10 sm:py-12 lg:py-14">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/80">
                <BookOpen className="h-4 w-4" />
                Блог Дайбилет
              </p>
              {city && cityHref ? (
                <a
                  href={cityHref}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {city}
                </a>
              ) : null}
            </div>
            <h1 className="font-display mt-2 max-w-4xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">{description}</p> : null}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/70">
              {publishedLabel ? <span>{publishedLabel}</span> : null}
              {readMin ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {readMin} мин чтения
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
