import * as React from 'react';

import { EditorsPickBadge, EventCardBadge } from '@/components/EventFavoriteButton';
import { isHitEvent, isRecommendBadgeEvent } from '@/lib/home-showcase-sections';
import { formatCoverDateBadge, LOW_TICKETS_THRESHOLD } from '@/lib/event-card-meta';
import { formatVacantSeats } from '@/lib/pluralize';
import type { PublicSession } from '@/types';

type EventImageBadgesProps = {
  event: PublicSession;
  showSoonBadge?: boolean;
  rail?: boolean;
  recommendVariant?: 'text' | 'compact';
  /** Секция «Выбор редакции» на главной — бейдж на каждой карточке. */
  editorsPick?: boolean;
};

const DATE_BADGE_CLASS = 'bg-slate-950/80 text-white shadow-sm ring-1 ring-white/20';

export function EventImageBadges({
  event,
  showSoonBadge = false,
  rail = false,
  editorsPick = false,
}: EventImageBadgesProps) {
  const dateBadge = formatCoverDateBadge(event);

  // Rails: clean cover - date in top-left only (no Hit/FOMO/age).
  if (rail) {
    if (!dateBadge) return null;
    return (
      <div className="absolute left-2 top-2 z-[2] flex max-w-[70%] flex-col items-start gap-1">
        <EventCardBadge key="date" className={DATE_BADGE_CLASS}>
          {dateBadge}
        </EventCardBadge>
      </div>
    );
  }

  const showLowTickets =
    typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= LOW_TICKETS_THRESHOLD;
  const recommend = editorsPick || isRecommendBadgeEvent(event);
  const recommendLabel = editorsPick ? 'Выбор редакции' : 'Рекомендуем';
  const hit = editorsPick
    ? (event.sessionCount || 0) >= 4 || event.landingSlugs.length > 0
    : isHitEvent(event);
  const maxSecondary = 4;

  const secondary: React.ReactNode[] = [];
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
      <EventCardBadge key="vacant" className="bg-rose-500/95 text-white">
        {formatVacantSeats(event.vacant ?? 0)}
      </EventCardBadge>,
    );
  } else if (hit && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="hit" className="bg-primary-600 text-white">
        Хит
      </EventCardBadge>,
    );
  }
  if (showSoonBadge && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="soon" className="bg-slate-900/85 text-white">
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
