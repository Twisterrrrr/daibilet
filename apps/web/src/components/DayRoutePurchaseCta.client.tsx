'use client';

import * as React from 'react';
import { Ticket } from 'lucide-react';

import { CheckoutModal } from '@/components/CheckoutModal.client';
import {
  normalizeTcPurchaseUrl,
  openTcWidget,
  resolveTcWidgetToken,
} from '@/components/TcWidget.client';
import { extractTcEventIdFromSession } from '@/lib/event-purchase';

function isVendorCheckoutUrl(url: string): boolean {
  return /ticketscloud|teplohod\.info/i.test(url);
}

export function isDayRouteVendorCheckoutUrl(url?: string | null): boolean {
  const href = String(url || '').trim();
  return Boolean(href && /^https?:\/\//i.test(href) && isVendorCheckoutUrl(href));
}

/**
 * Guest «Купить билет» for day-route: TicketsCloud native widget modal,
 * otherwise CheckoutModal iframe. Never full-page takeover / blind new tab
 * for vendor checkout URLs.
 */
export function DayRoutePurchaseCta({
  purchaseUrl,
  eventId,
  label = 'Купить билет',
  className,
  children,
  onOpen,
  'aria-label': ariaLabel,
  title,
  'data-day-buy-ticket': dataDayBuyTicket,
}: {
  purchaseUrl?: string | null;
  eventId?: string | null;
  label?: string;
  className?: string;
  children?: React.ReactNode;
  onOpen?: (url: string) => void;
  'aria-label'?: string;
  title?: string;
  'data-day-buy-ticket'?: string | boolean;
}) {
  const href = normalizeTcPurchaseUrl(purchaseUrl) || String(purchaseUrl || '').trim() || null;
  const tcTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [iframeOpen, setIframeOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!href || !isDayRouteVendorCheckoutUrl(href)) return null;

  const tcEventId = extractTcEventIdFromSession({ eventId, purchaseUrl: href });
  const tcToken = resolveTcWidgetToken(href);
  const useNativeTc = Boolean(/ticketscloud/i.test(href) && tcEventId && tcToken);

  const openPurchase = () => {
    onOpen?.(href);
    if (useNativeTc) {
      if (busy) return;
      setBusy(true);
      void openTcWidget({
        trigger: tcTriggerRef.current,
        purchaseUrl: href,
      }).finally(() => {
        window.setTimeout(() => setBusy(false), 400);
      });
      return;
    }
    setIframeOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={className}
        data-day-boat-buy={dataDayBuyTicket ? undefined : '1'}
        data-day-buy-ticket={dataDayBuyTicket ? '1' : undefined}
        aria-label={ariaLabel || label}
        title={title}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={openPurchase}
      >
        {children ?? (
          <>
            <Ticket className="h-3.5 w-3.5" />
            {busy ? 'Открываем…' : label}
          </>
        )}
      </button>
      {useNativeTc ? (
        <button
          ref={tcTriggerRef}
          type="button"
          data-tc-event={tcEventId || undefined}
          data-tc-token={tcToken || undefined}
          data-tc-href={href}
          className="tc-widget-trigger pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        >
          Купить
        </button>
      ) : (
        <CheckoutModal
          open={iframeOpen}
          onClose={() => setIframeOpen(false)}
          checkoutUrl={href}
          title="Покупка билета"
        />
      )}
    </>
  );
}
