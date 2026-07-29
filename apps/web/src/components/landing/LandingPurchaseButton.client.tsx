'use client';

import { CheckoutModalButton } from '@/components/CheckoutModal.client';
import { TcWidgetButton, getTcWidgetIds } from '@/components/TcWidget.client';
import {
  getTeplohodWidgetIdsFromSession,
  resolveTeplohodCheckoutUrl,
} from '@/components/TeplohodWidget.client';
import { trackSelectTickets } from '@/lib/catalog-analytics';
import { extractTcEventIdFromSession } from '@/lib/event-purchase';
import type { PublicSessionDto } from '@daibilet/contracts/public';

const DEFAULT_BUTTON_CLASS =
  'relative z-[2] inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]';

const SOLD_OUT_CLASS =
  'inline-flex cursor-not-allowed items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground';

type LandingPurchaseButtonProps = {
  session: PublicSessionDto;
  label: string;
  disabled?: boolean;
  className?: string;
  showArrow?: boolean;
};

function resolvePurchaseUrl(session: PublicSessionDto): string | null {
  return session.widgetUrl || session.purchaseUrl || session.deeplinkUrl || session.upcomingSlots?.[0]?.purchaseUrl || null;
}

export function LandingPurchaseButton({
  session,
  label,
  disabled = false,
  className = DEFAULT_BUTTON_CLASS,
  showArrow = false,
}: LandingPurchaseButtonProps) {
  const purchaseUrl = resolvePurchaseUrl(session);
  const resolvedLabel = showArrow && typeof label === 'string' ? `${label} →` : label;
  const resolvedClassName =
    className === DEFAULT_BUTTON_CLASS || /\bz-\[/.test(className)
      ? className
      : `relative z-[2] ${className}`;

  if (disabled) {
    return (
      <button type="button" disabled className={SOLD_OUT_CLASS}>
        Распродано
      </button>
    );
  }

  const teplohod = getTeplohodWidgetIdsFromSession(session);
  const teplohodCheckoutUrl =
    resolveTeplohodCheckoutUrl({
      purchaseUrl,
      tepEventId: teplohod?.tepEventId,
      tepWidgetId: teplohod?.tepWidgetId,
    }) || purchaseUrl;

  // TEP first: extractTcEventIdFromSession can return tep numeric ids, which must not
  // steal the CTA into a broken TicketsCloud path on river/landings.
  // TEP account page → CheckoutModal iframe (full page, not a nested widget chrome).
  if (teplohod?.tepEventId && teplohodCheckoutUrl) {
    return (
      <CheckoutModalButton
        checkoutUrl={teplohodCheckoutUrl}
        label={resolvedLabel}
        className={resolvedClassName}
        onOpen={() =>
          trackSelectTickets({
            eventId: String(teplohod.tepEventId),
            provider: 'teplohod',
            source: 'landing_purchase_button',
          })
        }
      />
    );
  }

  const tcEventId = extractTcEventIdFromSession(session);
  const ticketscloud = getTcWidgetIds({
    externalId: tcEventId,
    widgetProvider: session.purchaseProvider || session.offerSourceCode,
    purchaseUrl: session.purchaseUrl,
  });

  // TC: native tcwidget.js modal only - never wrap widgets/common in CheckoutModal.
  if (ticketscloud?.tcEventId && tcEventId) {
    return (
      <TcWidgetButton
        tcEventId={ticketscloud.tcEventId}
        purchaseUrl={purchaseUrl}
        label={resolvedLabel}
        className={resolvedClassName}
      />
    );
  }

  if (teplohodCheckoutUrl) {
    return (
      <CheckoutModalButton
        checkoutUrl={teplohodCheckoutUrl}
        label={resolvedLabel}
        className={resolvedClassName}
        onOpen={() =>
          trackSelectTickets({
            eventId: session.id,
            provider: 'teplohod',
            source: 'landing_purchase_button_fallback',
          })
        }
      />
    );
  }

  if (purchaseUrl) {
    return (
      <a href={purchaseUrl} target="_blank" rel="noopener noreferrer" className={resolvedClassName}>
        {resolvedLabel}
      </a>
    );
  }

  return (
    <button type="button" disabled className={SOLD_OUT_CLASS}>
      Недоступно
    </button>
  );
}
