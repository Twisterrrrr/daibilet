'use client';

import type { ReactNode } from 'react';
import { Map as MapIcon, Minimize2, X } from 'lucide-react';

type MyDayMobileMapSheetProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  stopCount: number;
  children: ReactNode;
  /** Optional chip rail / focus card overlay inside sheet body */
  footer?: ReactNode;
  yandexUrl?: string | null;
};

/**
 * Lovable mobile pattern: FAB «Карта · N» → bottom sheet ~85vh (not fullscreen-only).
 */
export function MyDayMobileMapSheet({
  open,
  onOpen,
  onClose,
  stopCount,
  children,
  footer,
  yandexUrl,
}: MyDayMobileMapSheetProps) {
  return (
    <>
      {!open ? (
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-30 flex justify-center lg:hidden print:hidden">
        <button
          type="button"
          onClick={onOpen}
          data-my-day-map-fab
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700"
        >
          <MapIcon className="h-4 w-4" aria-hidden />
          Карта · {stopCount}
        </button>
      </div>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Маршрут на карте"
          data-my-day-map-sheet="1"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85vh] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl lg:hidden print:hidden"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Маршрут на карте</p>
            <div className="ml-auto flex items-center gap-2">
              {yandexUrl ? (
                <a
                  href={yandexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center justify-center rounded-full bg-sky-600 px-3 text-[11px] font-bold text-white hover:bg-sky-700"
                >
                  Яндекс.Карты
                </a>
              ) : null}
              <button
                type="button"
                aria-label="Закрыть карту"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 bg-slate-100">
            <div className="absolute inset-0 z-0">{children}</div>
            {footer}
          </div>
        </div>
      ) : null}
    </>
  );
}

type MyDayMapFullScreenProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MyDayMapFullScreen({ open, onClose, children }: MyDayMapFullScreenProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Карта маршрута на весь экран"
      data-my-day-map-fullscreen="1"
      className="fixed inset-0 z-[1000] hidden bg-white lg:block print:hidden"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[1001] inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50"
      >
        <Minimize2 className="h-4 w-4" aria-hidden /> Свернуть карту
      </button>
      <div className="h-full w-full">{children}</div>
    </div>
  );
}
