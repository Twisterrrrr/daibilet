'use client';

import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { PublicSessionDto } from '@daibilet/contracts/public';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import {
  FAVORITES_CHANGED_EVENT,
  readFavoriteIds,
  resolveFavoriteSessions,
  toggleFavoriteId,
} from '@/lib/favorites';
import { formatPriceFrom } from '@/lib/format';
import { eventHref } from '@/lib/routes';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';

export function FavoritesPanel({ onClose }: { onClose: () => void }) {
  const selectedCity = useSelectedCityOptional();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => readFavoriteIds());
  const [catalogSessions, setCatalogSessions] = useState<PublicSessionDto[]>([]);
  const sessions = resolveFavoriteSessions(favoriteIds, catalogSessions);
  const eventsHref = catalogHrefWithSelectedCity(selectedCity?.cityValue);

  useEffect(() => {
    const sync = () => setFavoriteIds(readFavoriteIds());
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!favoriteIds.size) {
      setCatalogSessions([]);
      return;
    }

    const ids = [...favoriteIds].slice(0, 50);
    const controller = new AbortController();
    const params = new URLSearchParams({
      ids: ids.join(','),
      limit: String(Math.min(Math.max(ids.length, 1), 50)),
    });

    fetch(`/api/public/events?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as { items?: PublicSessionDto[] }) : null))
      .then((payload) => {
        if (payload?.items) setCatalogSessions(payload.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [favoriteIds]);

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label="Закрыть избранное" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute right-0 flex h-full w-80 max-w-[90vw] flex-col bg-white p-6 shadow-xl sm:w-96">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-slate-900">
            <Heart className="h-4 w-4 text-rose-500" />
            Избранное
            {favoriteIds.size ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">{favoriteIds.size}</span>
            ) : null}
          </h2>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sessions.length ? (
          <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <li key={session.groupKey || session.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <Link href={eventHref(session)} onClick={onClose} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {session.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-lg">🎫</div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={eventHref(session)} onClick={onClose} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-primary-700">
                    {session.title}
                  </Link>
                  <p className="mt-1 truncate text-xs text-slate-500">{session.city || 'Город не указан'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    {session.priceFrom ? formatPriceFrom(session.priceFrom) : 'Цена уточняется'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Убрать из избранного"
                  onClick={() => toggleFavoriteId(session.id)}
                  className="shrink-0 self-start rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            <Heart className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="font-medium text-slate-700">Пока пусто</p>
            <p className="mt-1">Отмечайте события сердечком на карточках — они появятся здесь. Список хранится в браузере на этом устройстве.</p>
            <Link
              href={eventsHref}
              onClick={onClose}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
            >
              Перейти к событиям
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
