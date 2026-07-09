import * as React from 'react';

import { EditorsPickBadge, EventCardBadge } from '@/components/EventFavoriteButton';
import { isHitEvent, isRecommendBadgeEvent } from '@/lib/home-showcase-sections';
import { LOW_TICKETS_THRESHOLD, resolveAgeBadge } from '@/lib/event-card-meta';
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

export function EventImageBadges({
  event,
  showSoonBadge = false,
  rail = false,
  editorsPick = false,
}: EventImageBadgesProps) {
  const showLowTickets =
    typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= LOW_TICKETS_THRESHOLD;
  const recommend = editorsPick || isRecommendBadgeEvent(event);
  const recommendLabel = editorsPick ? 'Выбор редакции' : 'Рекомендуем';
  const hit = editorsPick
    ? (event.sessionCount || 0) >= 4 || event.landingSlugs.length > 0
    : isHitEvent(event);
  const ageBadge = resolveAgeBadge(event.tags, event.ageLimit);
  const maxSecondary = rail ? 2 : 4;

  const secondary: React.ReactNode[] = [];
  if (showLowTickets) {
    secondary.push(
      <EventCardBadge key="vacant" className="bg-rose-500/95 text-white">
        {formatVacantSeats(event.vacant ?? 0)}
      </EventCardBadge>,
    );
  } else if (hit) {
    secondary.push(
      <EventCardBadge key="hit" className="bg-primary-600 text-white">
        Хит
      </EventCardBadge>,
    );
  }
  if (ageBadge && secondary.length < maxSecondary) {
    secondary.push(
      <EventCardBadge key="age" className="bg-white/90 text-slate-900">
        {ageBadge}
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

  return (
    <div className={`absolute left-2 top-2 z-[2] flex max-w-[70%] flex-col items-start gap-1 ${rail ? '' : 'sm:left-3 sm:top-3'}`}>
      {recommend ? <EditorsPickBadge label={recommendLabel} /> : null}
      {secondary}
    </div>
  );
}
