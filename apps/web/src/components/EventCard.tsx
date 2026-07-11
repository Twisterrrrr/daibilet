'use client';

import Link from 'next/link';
import { MapPin, Star, Ticket } from 'lucide-react';
import { useState } from 'react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import type { PublicSessionDto } from '@daibilet/contracts/public';
import { formatNumber, formatPriceFrom } from '@/lib/format';
import { eventHref } from '@/lib/routes';

const MIN_DISPLAY_PRICE_RUB = 100;

function resolvePseudoRating(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const step = hash % 11;
  return 4.2 + step * 0.05;
}

export function EventCard({
  session,
  showcaseRail = false,
  editorsPickBadge = false,
}: {
  session: PublicSessionDto;
  showcaseRail?: boolean;
  editorsPickBadge?: boolean;
}) {
  const href = eventHref(session);
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(session.imageUrl && !hasImageError);
  const hasPrice =
    typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const pseudoRating = resolvePseudoRating(session.groupKey || session.id);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60 ${
        showcaseRail ? 'min-h-[340px]' : ''
      }`}
    >
      <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      <Link href={href} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          {!showImage ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-3xl">
              🎫
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.imageUrl || ''}
              alt={session.title}
              loading="lazy"
              onError={() => setHasImageError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          )}

          {editorsPickBadge ? (
            <span className="gradient-gold absolute left-2 top-2 z-[2] rounded-full px-2.5 py-1 text-[10px] font-semibold text-amber-950 shadow-sm sm:text-[11px]">
              Выбор редакции
            </span>
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          {hasPrice ? (
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
              <span className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">
                от {formatNumber(session.priceFrom!)} ₽
              </span>
            </div>
          ) : null}
        </div>

        <div className={`flex flex-1 flex-col ${showcaseRail ? 'gap-1.5 p-3' : 'p-3 sm:p-4'}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-slate-700">{pseudoRating.toFixed(1)}</span>
            </span>
            {session.category ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-600">
                {session.category}
              </span>
            ) : null}
            {session.city ? (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{session.city}</span>
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-900 transition-colors group-hover:text-primary-600 sm:text-base">
            {session.title}
          </h2>

          <p className="mt-2 text-xs text-slate-500 sm:text-sm">
            {session.dateLabel}
            {session.timeLabel ? ` · ${session.timeLabel}` : ''}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="text-sm font-semibold text-slate-900">{formatPriceFrom(session.priceFrom)}</span>
            <span className="flex items-center gap-1 text-xs font-medium text-primary-600">
              <Ticket className="h-3.5 w-3.5" />
              Подробнее
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
