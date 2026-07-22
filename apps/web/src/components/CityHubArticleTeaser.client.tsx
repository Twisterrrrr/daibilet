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
}: {
  article: BlogCardDto;
  editorial?: boolean;
  sessions?: PublicSessionDto[];
}) {
  const excerpt = String(article.excerpt || '').trim();
  const articleHref = `/blog/${article.slug}`;
  const relatedSessions = React.useMemo(
    () => matchArticleSessions(article, sessions, 3),
    [article, sessions],
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
        className={`relative block aspect-[16/10] shrink-0 overflow-hidden ${
          editorial ? 'bg-zinc-100' : 'bg-slate-100'
        }`}
      >
        <SafeImage
          src={article.coverImageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.blogCard}
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

      <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3
            className={`line-clamp-2 text-sm font-semibold leading-snug sm:text-base ${
              editorial ? 'text-zinc-950' : 'text-slate-950'
            }`}
          >
            <Link href={articleHref} className="hover:text-primary-700">
              {article.title}
            </Link>
          </h3>

          {excerpt ? (
            <p
              className={`mt-1.5 line-clamp-3 text-xs leading-relaxed sm:text-sm ${
                editorial ? 'text-zinc-600' : 'text-slate-600'
              }`}
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
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((article) => (
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
