'use client';

import { useEffect, useState } from 'react';

import {
  isChunkLoadFailure,
  reloadOnceForChunkFailure,
} from '@/lib/chunk-load-recovery';

type PublicErrorScreenProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function errorText(error: Error & { digest?: string }): string {
  return [error.name, error.message, error.digest].filter(Boolean).join(' ');
}

/**
 * Replaces Next.js production English fallback:
 * "Application error: a client-side exception has occurred while loading daibilet.ru"
 *
 * Keep this tree tiny: no SiteLayout / city provider (those may be what crashed).
 * Recovery links are plain <a> so they work when the App Router chunk is gone.
 */
export function PublicErrorScreen({ error, reset }: PublicErrorScreenProps) {
  const [reloading, setReloading] = useState(() => isChunkLoadFailure(errorText(error)));

  useEffect(() => {
    const chunk = isChunkLoadFailure(errorText(error));
    if (chunk && reloadOnceForChunkFailure()) {
      setReloading(true);
      return;
    }
    if (chunk) setReloading(false);
    console.error('[daibilet] client error', error);
  }, [error]);

  if (reloading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <p className="text-sm text-slate-500">Обновляем страницу…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xl font-semibold tracking-tight text-slate-900">Дайбилет</p>
      <h1 className="mt-6 text-2xl font-semibold text-slate-900 sm:text-3xl">Не удалось открыть страницу</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
        Что-то пошло не так при загрузке. Обновите страницу или перейдите на главную - афиша и билеты на месте.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            try {
              reset();
            } catch {
              window.location.reload();
            }
          }}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Обновить
        </button>
        <a
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-slate-300"
        >
          На главную
        </a>
        <a
          href="/events"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-slate-300"
        >
          Афиша
        </a>
      </div>
    </div>
  );
}
