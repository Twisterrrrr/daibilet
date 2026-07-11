'use client';

import { Heart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { FAVORITES_CHANGED_EVENT, readFavoriteIds, toggleFavoriteId } from '@/lib/favorites';

export function useEventFavorite(eventId: string) {
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

  const toggleFavorite = useCallback(
    (clickEvent: React.MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      setFavorite(toggleFavoriteId(eventId).has(eventId));
    },
    [eventId],
  );

  return { favorite, toggleFavorite };
}

export function EventFavoriteButton({ eventId, className = '' }: { eventId: string; className?: string }) {
  const { favorite, toggleFavorite } = useEventFavorite(eventId);

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
  'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[11px]';

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
