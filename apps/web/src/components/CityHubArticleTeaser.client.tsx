'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { matchArticleSessions } from '@/lib/city-hub-articles';
import type { BlogCardDto } from '@/lib/blog-utils';
import { formatPriceFrom } from '@/lib/format';
import { eventHref } from '@/lib/routes';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export function CityHubArticleTeaser({
  article,
  editorial = false,
  sessions = [],
  variant = 'default',
}: {
  article: BlogCardDto;
  editorial?: boolean;
  sessions?: PublicSessionDto[];
  variant?: 'large' | 'small' | 'default';
}) {
  const excerpt = String(article.excerpt || '').trim();
  const articleHref = `/blog/${article.slug}`;
  const isLarge = variant === 'large';
  const isSmall = variant === 'small';
  const relatedSessions = React.useMemo(
    () => matchArticleSessions(article, sessions, isSmall ? 2 : 3),
    [article, sessions, isSmall],
  );

  return (
    <article
      className={
        editorial
          ? 'flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white'
          : 'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'
      }
    >
      <Link
        href={articleHref}
        aria-label={article.title}
        className={`relative block shrink-0 overflow-hidden ${
          isLarge
            ? 'aspect-[16/10] min-h-[11rem] lg:aspect-auto lg:min-h-[16rem] lg:flex-1'
            : 'aspect-[16/10]'
        } ${editorial ? 'bg-zinc-100' : 'bg-slate-100'}`}
      >
        <SafeImage
          src={article.coverImageUrl}
          alt=""
          fill
          sizes={isLarge ? IMAGE_SIZES.blogFeatured : IMAGE_SIZES.blogCard}
          className="object-cover object-center transition duration-300 hover:scale-[1.02]"
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
      </Link>

      <div
        className={`flex min-w-0 flex-1 flex-col justify-between ${
          isLarge ? 'p-4 sm:p-5' : isSmall ? 'p-3 sm:p-3.5' : 'p-3.5 sm:p-4'
        }`}
      >
        <div className="min-w-0">
          <h3
            className={`font-semibold leading-snug ${
              isLarge
                ? 'line-clamp-3 text-base sm:text-lg'
                : isSmall
                  ? 'line-clamp-2 text-sm'
                  : 'line-clamp-2 text-sm sm:text-base'
            } ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}
          >
            <Link href={articleHref} className="hover:text-primary-700">
              {article.title}
            </Link>
          </h3>

          {excerpt ? (
            <p
              className={`mt-1.5 leading-relaxed ${
                isLarge
                  ? 'line-clamp-3 text-sm'
                  : isSmall
                    ? 'line-clamp-2 text-xs'
                    : 'line-clamp-3 text-xs sm:text-sm'
              } ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}
            >
              {excerpt}
            </p>
          ) : null}

          {relatedSessions.length ? (
            <div
              className={`mt-3 grid gap-1.5 border-t pt-3 ${
                editorial ? 'border-zinc-100' : 'border-slate-100'
              }`}
            >
              {relatedSessions.map((session) => (
                <Link
                  key={session.id}
                  href={eventHref(session)}
                  className={`grid grid-cols-[1fr_auto] gap-2 rounded-md px-2.5 py-1.5 text-xs sm:text-sm ${
                    editorial
                      ? 'bg-zinc-50 hover:bg-zinc-100'
                      : 'bg-slate-50 hover:bg-primary-50/70'
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-semibold ${
                        editorial ? 'text-zinc-900' : 'text-slate-900'
                      }`}
                    >
                      {session.title}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-[11px] ${
                        editorial ? 'text-zinc-500' : 'text-slate-500'
                      }`}
                    >
                      {[session.dateLabel, session.venue].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span
                    className={`self-center whitespace-nowrap text-[11px] font-semibold sm:text-xs ${
                      editorial ? 'text-zinc-700' : 'text-primary-700'
                    }`}
                  >
                    {formatPriceFrom(session.priceFrom)}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <Link
            href={articleHref}
            className={
              editorial
                ? 'inline-flex min-h-9 items-center gap-1 rounded-full border border-zinc-300 px-3.5 text-sm font-medium text-zinc-800 hover:border-zinc-400'
                : 'inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700'
            }
          >
            Открыть материал
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CityHubArticlesGrid({
  articles,
  editorial = false,
  sessions = [],
}: {
  articles: BlogCardDto[];
  editorial?: boolean;
  sessions?: PublicSessionDto[];
}) {
  if (!articles.length) return null;
  const items = articles.slice(0, 3);

  if (items.length === 3) {
    const [lead, sideA, sideB] = items;
    return (
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2 lg:gap-5">
        <div className="lg:col-span-2 lg:row-span-2">
          <CityHubArticleTeaser
            key={lead!.slug}
            article={lead!}
            editorial={editorial}
            sessions={sessions}
            variant="large"
          />
        </div>
        <CityHubArticleTeaser
          key={sideA!.slug}
          article={sideA!}
          editorial={editorial}
          sessions={sessions}
          variant="small"
        />
        <CityHubArticleTeaser
          key={sideB!.slug}
          article={sideB!}
          editorial={editorial}
          sessions={sessions}
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
          sessions={sessions}
          variant={items.length === 1 ? 'large' : 'default'}
        />
      ))}
    </div>
  );
}
