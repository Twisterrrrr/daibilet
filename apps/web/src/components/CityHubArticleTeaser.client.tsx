'use client';

import Link from 'next/link';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function readTimeLabel(readMin: number): string {
  const n = Math.max(1, Math.round(Number(readMin) || 1));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} минута чтения`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} минуты чтения`;
  return `${n} минут чтения`;
}

/** City hub blog teaser: cover + title + reading time only (commerce stays inside the article). */
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
          className={`relative block shrink-0 overflow-hidden ${
            isLarge ? 'aspect-[16/10] min-h-[11rem] lg:min-h-[16rem]' : 'aspect-[16/10]'
          } ${editorial ? 'bg-zinc-100' : 'bg-slate-100'}`}
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
            className={`font-semibold leading-snug transition group-hover:text-primary-700 ${
              isLarge
                ? 'line-clamp-3 text-base sm:text-lg'
                : isSmall
                  ? 'line-clamp-2 text-sm'
                  : 'line-clamp-2 text-sm sm:text-base'
            } ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}
          >
            {article.title}
          </h3>
          <p
            className={`mt-2 text-xs font-medium ${
              editorial ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            {readTimeLabel(article.readMin)}
          </p>
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

  if (items.length === 3) {
    const [lead, sideA, sideB] = items;
    return (
      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:grid-rows-2 lg:gap-5">
        <div className="lg:col-span-2 lg:row-span-2">
          <CityHubArticleTeaser
            key={lead!.slug}
            article={lead!}
            editorial={editorial}
            variant="large"
          />
        </div>
        <CityHubArticleTeaser
          key={sideA!.slug}
          article={sideA!}
          editorial={editorial}
          variant="small"
        />
        <CityHubArticleTeaser
          key={sideB!.slug}
          article={sideB!}
          editorial={editorial}
          variant="small"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
