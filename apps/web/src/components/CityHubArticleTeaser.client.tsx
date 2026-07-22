'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { cityHubArticleBadges, matchArticleSessions } from '@/lib/city-hub-articles';
import type { BlogCardDto } from '@/lib/blog-utils';
import { formatPriceFrom } from '@/lib/format';
import { eventHref } from '@/lib/routes';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export function CityHubArticleTeaser({
  article,
  editorial = false,
  sessions = [],
}: {
  article: BlogCardDto;
  editorial?: boolean;
  sessions?: PublicSessionDto[];
}) {
  const badges = cityHubArticleBadges(article);
  const excerpt = String(article.excerpt || '').trim();
  const relatedSessions = React.useMemo(
    () => matchArticleSessions(article, sessions, 3),
    [article, sessions],
  );

  return (
    <article
      className={
        editorial
          ? 'overflow-hidden rounded-2xl border border-zinc-200 bg-white md:grid md:grid-cols-[minmax(14rem,40%)_minmax(0,1fr)] md:items-start'
          : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid md:grid-cols-[minmax(14rem,40%)_minmax(0,1fr)] md:items-start'
      }
    >
      <div
        className={`relative aspect-[16/10] overflow-hidden ${
          editorial ? 'bg-zinc-100' : 'bg-slate-100'
        }`}
      >
        <SafeImage
          src={article.coverImageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.blogCard}
          className="object-cover object-center"
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
      </div>

      <div className="flex min-w-0 flex-col p-3.5 sm:p-4">
        {badges.length ? (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className={
                  editorial
                    ? 'rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600'
                    : 'rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600'
                }
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        <h3
          className={`line-clamp-2 text-sm font-semibold leading-snug sm:text-[0.95rem] ${
            editorial ? 'text-zinc-950' : 'text-slate-950'
          }`}
        >
          {article.title}
        </h3>

        {excerpt ? (
          <p
            className={`mt-1.5 line-clamp-2 text-xs leading-relaxed sm:text-sm ${
              editorial ? 'text-zinc-600' : 'text-slate-600'
            }`}
          >
            {excerpt}
          </p>
        ) : null}

        {relatedSessions.length ? (
          <div
            className={`mt-2.5 grid gap-1.5 border-t pt-2.5 ${
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

        <div className="mt-3">
          <Link
            href={`/blog/${article.slug}`}
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
  return (
    <div className="mt-4 grid max-w-4xl gap-3">
      {articles.map((article) => (
        <CityHubArticleTeaser
          key={article.slug}
          article={article}
          editorial={editorial}
          sessions={sessions}
        />
      ))}
    </div>
  );
}
