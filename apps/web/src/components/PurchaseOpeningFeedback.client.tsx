'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

type Phase = 'idle' | 'opening' | 'failed';

type PurchaseOpeningState = {
  phase: Phase;
  message: string;
  fallbackUrl: string | null;
  onRetry: (() => void) | null;
};

const IDLE: PurchaseOpeningState = {
  phase: 'idle',
  message: '',
  fallbackUrl: null,
  onRetry: null,
};

let state: PurchaseOpeningState = IDLE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function beginPurchaseOpening(options?: {
  message?: string;
  fallbackUrl?: string | null;
  onRetry?: (() => void) | null;
}) {
  state = {
    phase: 'opening',
    message: options?.message || 'Открываем оплату…',
    fallbackUrl: options?.fallbackUrl ?? null,
    onRetry: options?.onRetry ?? null,
  };
  emit();
}

export function completePurchaseOpening() {
  state = IDLE;
  emit();
}

function isVendorCheckoutVisible() {
  if (typeof document === 'undefined') return false;
  if (document.body.classList.contains('fancyboxtkt-active')) return true;
  if (document.body.classList.contains('fancybox-active')) return true;
  return Boolean(
    document.querySelector(
      [
        '.fancyboxtkt-container',
        '.fancyboxtkt-slide',
        '.fancyboxtkt-bg',
        '.fancybox-container',
        '.fancybox-slide',
        'iframe[src*="account.teplohod.info"]',
        'iframe[src*="teplohod.info/order"]',
        '#tc-widget-overlay',
        '.tc-widget-frame_popup',
        'iframe[src*="ticketscloud"]',
      ].join(', '),
    ),
  );
}

export function failPurchaseOpening(options?: {
  message?: string;
  fallbackUrl?: string | null;
  onRetry?: (() => void) | null;
}) {
  // Race guard: vendor modal already visible → never show fail toast over it.
  if (isVendorCheckoutVisible()) {
    completePurchaseOpening();
    return;
  }
  state = {
    phase: 'failed',
    message: options?.message || 'Не удалось открыть оплату. Попробуйте ещё раз.',
    fallbackUrl: options?.fallbackUrl ?? state.fallbackUrl,
    onRetry: options?.onRetry ?? state.onRetry,
  };
  emit();
}

export function isPurchaseOpeningActive() {
  return state.phase !== 'idle';
}

/**
 * Instant buy UX shell: spinner within ~1 frame, never silent no-op.
 * Mount once in root layout.
 */
export function PurchaseOpeningHost() {
  const snap = React.useSyncExternalStore(subscribe, getSnapshot, () => IDLE);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (snap.phase === 'idle') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') completePurchaseOpening();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snap.phase]);

  if (!mounted || snap.phase === 'idle') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99990] flex items-end justify-center p-4 sm:items-center"
      role="status"
      aria-live="polite"
      aria-busy={snap.phase === 'opening'}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        aria-label="Закрыть"
        onClick={() => completePurchaseOpening()}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <button
          type="button"
          onClick={() => completePurchaseOpening()}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        {snap.phase === 'opening' ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden />
            <p className="text-sm font-semibold text-slate-900">{snap.message}</p>
            <p className="text-xs text-slate-500">Окно оплаты откроется через мгновение</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-1">
            <p className="pr-8 text-sm font-semibold text-slate-900">{snap.message}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {snap.onRetry ? (
                <button
                  type="button"
                  onClick={() => {
                    const retry = snap.onRetry;
                    beginPurchaseOpening({
                      fallbackUrl: snap.fallbackUrl,
                      onRetry: retry,
                    });
                    retry?.();
                  }}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  Повторить
                </button>
              ) : null}
              {snap.fallbackUrl ? (
                <a
                  href={snap.fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => completePurchaseOpening()}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-primary-300 hover:text-primary-700"
                >
                  Открыть оплату
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
