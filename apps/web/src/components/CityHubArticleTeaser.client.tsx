'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { BlogCardDto } from '@/lib/blog-utils';
import { blogListingCityBadgeLabel, blogSurfaceMeta } from '@/lib/blog-meta';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function readTimeLabel(readMin: number): string {
  const n = Math.max(1, Math.round(Number(readMin) || 1));
  return `${n} мин чтения`;
}

/** City hub blog teaser: cover, type pill, title, excerpt, reading time. */
export function CityHubArticleTeaser({
  article,
  editorial = false,
  variant = 'default',
}: {
  article: BlogCardDto;
  editorial?: boolean;
  /** Kept for callers; hub cards no longer attach commerce sessions. */
  sessions?: PublicSessionDto[];
  variant?: 'large' | 'small' | 'default';
}) {
  const articleHref = `/blog/${article.slug}`;
  const isLarge = variant === 'large';
  const isSmall = variant === 'small';
  const cityLabel = blogListingCityBadgeLabel(article.citySlug, article.city, article.citySlugs);
  const excerpt = String(article.excerpt || '').trim();
  const { typeLabel } = blogSurfaceMeta({
    tag: article.tag,
    articleType: article.articleType,
    city: article.city,
    citySlug: article.citySlug,
    citySlugs: article.citySlugs,
  });

  return (
    <article
      className={
        editorial
          ? `flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm`
          : `flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]`
      }
    >
      <Link
        href={articleHref}
        aria-label={article.title}
        className="group flex h-full flex-col"
      >
        <span
          className={`relative block aspect-[16/9] w-full shrink-0 overflow-hidden rounded-t-2xl ${
            editorial ? 'bg-zinc-100' : 'bg-slate-100'
          }`}
        >
          <SafeImage
            src={article.coverImageUrl}
            alt=""
            fill
            sizes={isLarge ? IMAGE_SIZES.blogFeatured : IMAGE_SIZES.blogCard}
            className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
            fallback={
              <div
                className={`flex h-full w-full items-center justify-center text-sm ${
                  editorial ? 'bg-zinc-200 text-zinc-500' : 'bg-slate-200 text-slate-500'
                }`}
              >
                Материал
              </div>
            }
          />
        </span>

        <span
          className={`flex min-w-0 flex-1 flex-col ${
            isLarge ? 'p-4 sm:p-5' : isSmall ? 'p-3 sm:p-3.5' : 'p-3.5 sm:p-4'
          }`}
        >
          {(typeLabel || cityLabel) ? (
            <span
              className={`mb-2 inline-flex w-fit max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                editorial ? 'bg-zinc-100 text-zinc-700' : 'bg-primary-50 text-primary-800'
              }`}
            >
              {typeLabel || cityLabel}
            </span>
          ) : null}
          <h3
            className={`line-clamp-3 break-words font-semibold leading-snug tracking-tight transition group-hover:text-primary-700 ${
              isLarge
                ? 'text-sm sm:text-[0.9375rem]'
                : isSmall
                  ? 'text-[0.8125rem] sm:text-sm'
                  : 'text-[0.8125rem] sm:text-[0.9375rem]'
            } ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}
          >
            {article.title}
          </h3>
          {excerpt ? (
            <p
              className={`mt-1.5 line-clamp-2 text-xs leading-relaxed sm:text-[0.8125rem] ${
                editorial ? 'text-zinc-600' : 'text-slate-600'
              }`}
            >
              {excerpt}
            </p>
          ) : null}
          <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-3">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                editorial ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {readTimeLabel(article.readMin)}
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}

export function CityHubArticlesGrid({
  articles,
  editorial = false,
  layout = 'grid',
}: {
  articles: BlogCardDto[];
  editorial?: boolean;
  /** Kept for callers; unused after commerce strip. */
  sessions?: PublicSessionDto[];
  /** `stack` - single column for FAQ+blog split. */
  layout?: 'grid' | 'stack';
}) {
  if (!articles.length) return null;
  const items = articles.slice(0, 3);

  return (
    <div
      className={
        layout === 'stack'
          ? 'mt-5 grid grid-cols-1 items-stretch gap-4'
          : 'mt-5 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3'
      }
    >
      {items.map((article) => (
        <CityHubArticleTeaser
          key={article.slug}
          article={article}
          editorial={editorial}
          variant={layout === 'stack' ? 'small' : items.length === 1 ? 'large' : 'default'}
        />
      ))}
    </div>
  );
}
