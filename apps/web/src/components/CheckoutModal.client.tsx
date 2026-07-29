'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Loader2, X } from 'lucide-react';

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  checkoutUrl: string;
  title?: string;
};

/**
 * Instant checkout shell: modal paints on click, iframe loads vendor URL.
 * Footer deep-link stays as fallback when X-Frame-Options / CSP blocks embed.
 */
export function CheckoutModal({ open, onClose, checkoutUrl, title = 'Покупка билета' }: CheckoutModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [iframePhase, setIframePhase] = React.useState<'loading' | 'ready' | 'slow'>('loading');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setIframePhase('loading');
      return;
    }
    setIframePhase('loading');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const slowTimer = window.setTimeout(() => {
      setIframePhase((phase) => (phase === 'loading' ? 'slow' : phase));
    }, 4500);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(slowTimer);
    };
  }, [open, onClose, checkoutUrl]);

  if (!mounted || !open || !checkoutUrl) return null;

  const openExternal = () => {
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" className="absolute inset-0 bg-slate-950/60" aria-label="Закрыть" onClick={onClose} />
      <div className="relative flex h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openExternal}
              className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              В новой вкладке
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-white">
          {iframePhase === 'loading' ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden />
              <p className="text-sm font-semibold text-slate-900">Открываем оплату…</p>
              <p className="text-xs text-slate-500">Окно оплаты загружается</p>
            </div>
          ) : null}

          {iframePhase === 'slow' ? (
            <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-center">
              <p className="text-xs text-slate-700">
                Если оплата не появилась, откройте её в новой вкладке - часть билетных систем блокирует встраивание.
              </p>
              <button
                type="button"
                onClick={openExternal}
                className="inline-flex min-h-9 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Открыть оплату
              </button>
            </div>
          ) : null}

          <iframe
            key={checkoutUrl}
            title={title}
            src={checkoutUrl}
            className="h-full w-full bg-white"
            allow="payment *"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setIframePhase('ready')}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500">
          <span>Не открывается?</span>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 hover:underline"
          >
            Открыть в новой вкладке
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type CheckoutModalButtonProps = {
  checkoutUrl?: string | null;
  label?: string;
  children?: React.ReactNode;
  className?: string;
  title?: string;
  onOpen?: () => void;
};

export function CheckoutModalButton({
  checkoutUrl,
  label,
  children,
  className,
  title = 'Покупка билета',
  onOpen,
}: CheckoutModalButtonProps) {
  const [open, setOpen] = React.useState(false);
  const href = String(checkoutUrl || '').trim();

  if (!href) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        {children ?? label}
      </button>
      <CheckoutModal open={open} onClose={() => setOpen(false)} checkoutUrl={href} title={title} />
    </>
  );
}
