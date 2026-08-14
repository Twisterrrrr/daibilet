'use client';

import Link from 'next/link';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { BlogCardDto } from '@/lib/blog-utils';
import { blogCityBadgeClassName, blogListingCityBadgeLabel } from '@/lib/blog-meta';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function readTimeLabel(readMin: number): string {
  const n = Math.max(1, Math.round(Number(readMin) || 1));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} минута чтения`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} минуты чтения`;
  return `${n} минут чтения`;
}

/** City hub blog teaser: 16:9 cover, title, excerpt, then city badge + reading time. */
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
  const cityLabel = blogListingCityBadgeLabel(article.citySlug, article.city);
  const excerpt = String(article.excerpt || '').trim();

  return (
    <article
      className={
        editorial
          ? `flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white`
          : `flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`
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
          <h3
            className={`break-words font-semibold leading-snug transition group-hover:text-primary-700 ${
              isLarge ? 'text-base sm:text-lg' : isSmall ? 'text-sm' : 'text-sm sm:text-base'
            } ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}
          >
            {article.title}
          </h3>
          {excerpt ? (
            <p
              className={`mt-2 text-sm leading-relaxed ${
                editorial ? 'text-zinc-600' : 'text-slate-600'
              }`}
            >
              {excerpt}
            </p>
          ) : null}
          <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-3">
            {cityLabel ? (
              <span
                className={`inline-flex w-fit max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:text-[11px] ${blogCityBadgeClassName(article.citySlug)}`}
              >
                {cityLabel}
              </span>
            ) : null}
            <span
              className={`text-xs font-medium ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}
            >
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
}: {
  articles: BlogCardDto[];
  editorial?: boolean;
  /** Kept for callers; unused after commerce strip. */
  sessions?: PublicSessionDto[];
}) {
  if (!articles.length) return null;
  const items = articles.slice(0, 3);

  return (
    <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
      {items.map((article) => (
        <CityHubArticleTeaser
          key={article.slug}
          article={article}
          editorial={editorial}
          variant={items.length === 1 ? 'large' : 'default'}
        />
      ))}
    </div>
  );
}
