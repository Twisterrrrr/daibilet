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
  onSeeAffiche,
}: {
  article: BlogCardDto;
  editorial?: boolean;
  sessions?: PublicSessionDto[];
  onSeeAffiche?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
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
          ? 'overflow-hidden rounded-2xl border border-zinc-200 bg-white'
          : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'
      }
    >
      <div className={`relative aspect-[16/9] overflow-hidden ${editorial ? 'bg-zinc-100' : 'bg-slate-100'}`}>
        <SafeImage
          src={article.coverImageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.blogCard}
          className="object-cover"
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

      <div className="p-4 sm:p-5">
        {badges.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
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
          className={`line-clamp-2 text-base font-semibold leading-snug ${
            editorial ? 'text-zinc-950' : 'text-slate-950'
          }`}
        >
          {article.title}
        </h3>

        {excerpt ? (
          <>
            <p
              className={`mt-2 text-sm leading-relaxed ${editorial ? 'text-zinc-600' : 'text-slate-600'} ${
                open ? '' : 'line-clamp-3'
              }`}
            >
              {excerpt}
            </p>
            {excerpt.length > 140 ? (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className={`mt-2 text-left text-xs font-semibold ${
                  editorial ? 'text-zinc-700 hover:underline' : 'text-primary-700 hover:text-primary-800'
                }`}
              >
                {open ? 'Свернуть' : 'Коротко о чём'} {open ? '▴' : '▾'}
              </button>
            ) : null}
          </>
        ) : null}

        {relatedSessions.length ? (
          <div
            className={`mt-3 grid gap-2 border-t pt-3 ${
              editorial ? 'border-zinc-100' : 'border-slate-100'
            }`}
          >
            {relatedSessions.map((session) => (
              <Link
                key={session.id}
                href={eventHref(session)}
                className={`grid grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-sm ${
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
                    className={`mt-0.5 block truncate text-xs ${
                      editorial ? 'text-zinc-500' : 'text-slate-500'
                    }`}
                  >
                    {[session.dateLabel, session.venue].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span
                  className={`self-center whitespace-nowrap text-xs font-semibold ${
                    editorial ? 'text-zinc-700' : 'text-primary-700'
                  }`}
                >
                  {formatPriceFrom(session.priceFrom)}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSeeAffiche?.()}
            className={
              editorial
                ? 'inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800'
                : 'inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700'
            }
          >
            Смотреть в афише
          </button>
          <Link
            href={`/blog/${article.slug}`}
            className={
              editorial
                ? 'inline-flex min-h-10 items-center gap-1 rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:border-zinc-400'
                : 'inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700'
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
  onSeeAffiche,
}: {
  articles: BlogCardDto[];
  editorial?: boolean;
  sessions?: PublicSessionDto[];
  onSeeAffiche?: () => void;
}) {
  if (!articles.length) return null;
  return (
    <div className={`mt-5 grid gap-4 ${articles.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl'}`}>
      {articles.map((article) => (
        <CityHubArticleTeaser
          key={article.slug}
          article={article}
          editorial={editorial}
          sessions={sessions}
          onSeeAffiche={onSeeAffiche}
        />
      ))}
    </div>
  );
}
