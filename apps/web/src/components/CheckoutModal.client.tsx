'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  checkoutUrl: string;
  title?: string;
};

export function CheckoutModal({ open, onClose, checkoutUrl, title = 'Покупка билета' }: CheckoutModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open || !checkoutUrl) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-slate-950/60" aria-label="Закрыть" onClick={onClose} />
      <div className="relative flex h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe title={title} src={checkoutUrl} className="h-full w-full flex-1 bg-white" allow="payment *" />
        <div className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500">
          Не открывается окно?{' '}
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:underline">
            Открыть на сайте билетной системы
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
};

export function CheckoutModalButton({
  checkoutUrl,
  label,
  children,
  className,
  title = 'Покупка билета',
}: CheckoutModalButtonProps) {
  const [open, setOpen] = React.useState(false);
  const href = String(checkoutUrl || '').trim();

  if (!href) return null;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? label}
      </button>
      <CheckoutModal open={open} onClose={() => setOpen(false)} checkoutUrl={href} title={title} />
    </>
  );
}
