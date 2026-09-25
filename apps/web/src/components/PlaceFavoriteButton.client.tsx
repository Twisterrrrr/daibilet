'use client';

import { Heart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  PLACE_FAVORITES_CHANGED_EVENT,
  isPlaceFavorite,
  togglePlaceFavorite,
  type PlaceFavoriteItem,
} from '@/lib/place-favorites';

export function PlaceFavoriteButton({
  place,
  className = '',
}: {
  place: PlaceFavoriteItem;
  className?: string;
}) {
  const [favorite, setFavorite] = useState(() => isPlaceFavorite(place.id));

  useEffect(() => {
    const sync = () => setFavorite(isPlaceFavorite(place.id));
    sync();
    window.addEventListener(PLACE_FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PLACE_FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [place.id]);

  const toggleFavorite = useCallback(
    (clickEvent: React.MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      const prev = favorite;
      setFavorite(!prev);
      try {
        const next = togglePlaceFavorite(place);
        setFavorite(next.some((item) => item.id === place.id));
      } catch {
        setFavorite(prev);
      }
    },
    [favorite, place],
  );

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
