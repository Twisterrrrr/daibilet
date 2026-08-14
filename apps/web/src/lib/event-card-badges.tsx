'use client';

import type { ReactNode } from 'react';

import { EditorsPickBadge, EventCardBadge } from '@/components/EventFavoriteButton.client';
import type { PublicSessionDto } from '@daibilet/contracts/public';
import { isHitEvent, isRecommendBadgeEvent } from '@/lib/home-showcase-sections';
import {
  formatCoverDateBadge,
  getDepartingSoonMinutes,
  isOpenDate,
  LOW_TICKETS_THRESHOLD,
} from '@/lib/event-card-meta';
import { formatVacantSeats } from '@/lib/event-page-utils';

type EventImageBadgesProps = {
  event: PublicSessionDto;
  showSoonBadge?: boolean;
  rail?: boolean;
  recommendVariant?: 'text' | 'compact';
  editorsPick?: boolean;
  /** Cover: only compact date (city hub / cleaned rails). */
  dateOnly?: boolean;
};

const DATE_BADGE_CLASS =
  'bg-slate-950/80 text-white shadow-md ring-1 ring-white/20 backdrop-blur-sm';

export function EventImageBadges({
  event,
  showSoonBadge = false,
  rail = false,
  editorsPick = false,
  dateOnly = false,
}: EventImageBadgesProps) {
  const dateBadge = formatCoverDateBadge(event);

  // Rails / date-only: clean cover - date in top-left, no Hit/FOMO/age pile.
  if (rail || dateOnly) {
    if (!dateBadge) return null;
    return (
      <div className="absolute left-2 top-2 z-[2] flex max-w-[70%] flex-col items-start gap-1 sm:left-3 sm:top-3">
        <EventCardBadge key="date" className={DATE_BADGE_CLASS}>
          {dateBadge}
        </EventCardBadge>
      </div>
    );
  }

  const showLowTickets =
    typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= LOW_TICKETS_THRESHOLD;
  const departingSoonMinutes =
    !isOpenDate(event) && event.startsAt ? getDepartingSoonMinutes(event.startsAt) : null;
  const recommend = editorsPick || isRecommendBadgeEvent(event);
  const recommendLabel = editorsPick ? 'Выбор редакции' : 'Рекомендуем';
  const hit = editorsPick
    ? (event.sessionCount || 0) >= 4 || (event.landingSlugs?.length || 0) > 0
    : isHitEvent(event);
  const maxSecondary = 4;
  const todayOnCover = dateBadge === 'Сегодня';

  const secondary: ReactNode[] = [];
  // Age stays in text meta only - date takes the former age slot on cover.
  if (dateBadge) {
    secondary.push(
      <EventCardBadge key="date" className={DATE_BADGE_CLASS}>
        {dateBadge}
      </EventCardBadge>,
    );
  }
  if (showLowTickets && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="vacant" className="bg-rose-600 text-white shadow-md ring-1 ring-white/30">
        {formatVacantSeats(event.vacant ?? 0)}
      </EventCardBadge>,
    );
  } else if (hit && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="hit" className="bg-primary-600 text-white shadow-md ring-1 ring-white/25">
        Хит
      </EventCardBadge>,
    );
  }
  // Cover «Сегодня» is enough - do not stack «Скоро начало» on the photo (it stays in the body).
  if (departingSoonMinutes && !todayOnCover && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="departing" className="bg-amber-500 text-white shadow-md ring-1 ring-white/30">
        Скоро начало · {departingSoonMinutes} мин
      </EventCardBadge>,
    );
  } else if (showSoonBadge && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="soon" className="bg-slate-900/90 text-white">
        Скоро в продаже
      </EventCardBadge>,
    );
  }

  if (!recommend && secondary.length === 0) return null;

  return (
    <div className="absolute left-2 top-2 z-[2] flex max-w-[70%] flex-col items-start gap-1 sm:left-3 sm:top-3">
      {recommend ? <EditorsPickBadge label={recommendLabel} /> : null}
      {secondary}
    </div>
  );
}

/** True when card has a real social/urgency signal (no invented counts). */
export function catalogItemHasLiveSignal(event: PublicSessionDto): boolean {
  const lowTickets =
    typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= LOW_TICKETS_THRESHOLD;
  const departingSoon = Boolean(event.startsAt && getDepartingSoonMinutes(event.startsAt));
  return lowTickets || departingSoon || isRecommendBadgeEvent(event) || isHitEvent(event);
}
