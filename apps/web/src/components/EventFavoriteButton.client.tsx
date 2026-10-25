'use client';

import { Heart } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import {
  FAVORITES_CHANGED_EVENT,
  readFavoriteIds,
  rememberFavoriteEvent,
  toggleFavoriteEvent,
  toggleFavoriteId,
  type FavoriteEventItem,
} from '@/lib/favorites';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import { eventHref } from '@/lib/routes';

export function useEventFavorite(eventId: string, event?: FavoriteEventItem) {
  const [favorite, setFavorite] = useState(() => readFavoriteIds().has(eventId));

  useEffect(() => {
    const sync = () => setFavorite(readFavoriteIds().has(eventId));
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [eventId]);

  useEffect(() => {
    if (favorite && event) rememberFavoriteEvent(event);
  }, [event, favorite]);

  const toggleFavorite = useCallback(
    (clickEvent: React.MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      const prev = favorite;
      // Optimistic UI: heart flips immediately; localStorage sync in same tick.
      setFavorite(!prev);
      try {
        const next = event ? toggleFavoriteEvent(event) : toggleFavoriteId(eventId);
        setFavorite(next.has(eventId));
      } catch {
        setFavorite(prev);
      }
    },
    [event, eventId, favorite],
  );

  return { favorite, toggleFavorite };
}

export function EventFavoriteButton({
  eventId,
  session,
  className = '',
}: {
  eventId: string;
  session?: PublicCatalogListItemDto;
  className?: string;
}) {
  const event = useMemo<FavoriteEventItem | undefined>(
    () =>
      session
        ? {
            id: session.id,
            groupKey: session.groupKey || undefined,
            title: session.title,
            city: session.city || undefined,
            imageUrl:
              resolveEventCardPrimaryImage(session) ||
              resolveEventCardFallbackImage(session) ||
              undefined,
            priceFrom: typeof session.priceFrom === 'number' ? session.priceFrom : undefined,
            href: eventHref(session),
          }
        : undefined,
    [session],
  );
  const { favorite, toggleFavorite } = useEventFavorite(eventId, event);

  return (
    <button
      type="button"
      aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      aria-pressed={favorite}
      onClick={toggleFavorite}
      className={`event-favorite-btn inline-btn absolute z-[3] box-border h-9 w-9 min-h-0 shrink-0 rounded-full bg-white/90 p-0 leading-none text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white ${className}`}
    >
      <span className="flex h-full w-full items-center justify-center">
        <Heart className={`h-4 w-4 ${favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
      </span>
    </button>
  );
}

const CARD_BADGE_CLASS =
  'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none shadow-sm backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-xs';

export function EventCardBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`${CARD_BADGE_CLASS} ${className}`}>{children}</span>;
}

export function EditorsPickBadge({
  className = '',
  label = 'Выбор редакции',
}: {
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  return (
    <EventCardBadge className={`gradient-gold text-amber-950 shadow-gold ${className}`} aria-label={label}>
      {label}
    </EventCardBadge>
  );
}
