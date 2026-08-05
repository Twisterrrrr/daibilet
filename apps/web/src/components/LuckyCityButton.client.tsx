'use client';

import Link from 'next/link';
import { Dices, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { pluralEvents } from '@/lib/format';
import { cityEventsHref, cityHref } from '@/lib/routes';

type LuckyCityButtonProps = {
  cities: PublicDestinationDto[];
  className?: string;
  /** Compact chip style for hero quick-links row. */
  variant?: 'hero' | 'toolbar';
};

const ROULETTE_MS = 1100;
const ROULETTE_TICK_MS = 70;

export function LuckyCityButton({ cities, className = '', variant = 'hero' }: LuckyCityButtonProps) {
  const pool = useMemo(
    () =>
      cities
        .filter((item) => item.type === 'city' && item.events > 0)
        .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')),
    [cities],
  );

  const [spinning, setSpinning] = useState(false);
  const [rouletteName, setRouletteName] = useState<string | null>(null);
  const [picked, setPicked] = useState<PublicDestinationDto | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    if (spinning) return;
    setPicked(null);
    setRouletteName(null);
  }, [spinning]);

  useEffect(() => {
    if (!picked && !spinning) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [picked, spinning, close]);

  const spin = () => {
    if (spinning || pool.length === 0) return;
    setPicked(null);
    setSpinning(true);

    const winner = pool[Math.floor(Math.random() * pool.length)]!;
    const started = performance.now();
    let tickTimer = 0;

    const tick = () => {
      const elapsed = performance.now() - started;
      const name = pool[Math.floor(Math.random() * pool.length)]!.name;
      setRouletteName(name);
      if (elapsed >= ROULETTE_MS) {
        window.clearInterval(tickTimer);
        setRouletteName(winner.name);
        setSpinning(false);
        setPicked(winner);
        return;
      }
    };

    tick();
    tickTimer = window.setInterval(tick, ROULETTE_TICK_MS);
  };

  if (pool.length === 0) return null;

  const buttonClass =
    variant === 'toolbar'
      ? 'inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:opacity-60'
      : 'inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:opacity-60';

  const modal =
    mounted && (spinning || picked)
      ? createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lucky-city-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-sky-500" />
              <button
                type="button"
                onClick={close}
                disabled={spinning}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-6 pb-6 pt-8 text-center">
                {spinning ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Подбираем город</p>
                    <p
                      id="lucky-city-title"
                      className="mt-3 font-display text-2xl font-bold text-slate-900 transition-opacity sm:text-3xl"
                      key={rouletteName}
                    >
                      {rouletteName}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Ещё мгновение…</p>
                  </>
                ) : picked ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Как насчет</p>
                    <h2 id="lucky-city-title" className="mt-2 font-display text-3xl font-bold text-slate-900">
                      {picked.name}?
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                      Там сейчас{' '}
                      <span className="font-semibold text-primary-700">{pluralEvents(picked.events)}</span>
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                      <Link
                        href={cityHref(picked)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700"
                      >
                        Открыть хаб города
                      </Link>
                      <Link
                        href={cityEventsHref(picked)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
                      >
                        Смотреть афишу
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={spin}
                      className="mt-4 text-sm font-medium text-slate-500 underline-offset-2 hover:text-primary-700 hover:underline"
                    >
                      Выбрать другой
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" onClick={spin} disabled={spinning} className={`${buttonClass} ${className}`.trim()}>
        <Dices className="h-3.5 w-3.5" aria-hidden />
        Куда поехать? Выбрать случайно
      </button>
      {modal}
    </>
  );
}
