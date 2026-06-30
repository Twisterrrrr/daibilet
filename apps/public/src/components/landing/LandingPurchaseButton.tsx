import { TcWidgetButton, extractTcEventIdFromSession, getTcWidgetIds } from '@/components/TcWidget';
import { TeplohodWidgetButton, getTeplohodWidgetIdsFromSession } from '@/components/TeplohodWidget';
import type { PublicSession } from '@/types';

const DEFAULT_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]';

const SOLD_OUT_CLASS =
  'inline-flex cursor-not-allowed items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground';

type LandingPurchaseButtonProps = {
  session: PublicSession;
  label: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  showArrow?: boolean;
};

function resolvePurchaseUrl(session: PublicSession): string | null {
  return session.widgetUrl || session.purchaseUrl || session.deeplinkUrl || session.upcomingSlots?.[0]?.purchaseUrl || null;
}

export function LandingPurchaseButton({
  session,
  label,
  disabled = false,
  className = DEFAULT_BUTTON_CLASS,
  compact = true,
  showArrow = false,
}: LandingPurchaseButtonProps) {
  const purchaseUrl = resolvePurchaseUrl(session);
  const resolvedLabel = showArrow && typeof label === 'string' ? `${label} →` : label;

  if (disabled) {
    return (
      <button type="button" disabled className={SOLD_OUT_CLASS}>
        Распродано
      </button>
    );
  }

  const tcEventId = extractTcEventIdFromSession(session);
  const ticketscloud = getTcWidgetIds({
    externalId: tcEventId,
    widgetProvider: session.purchaseProvider || session.offerSourceCode,
  });
  const teplohod = getTeplohodWidgetIdsFromSession(session);

  if (ticketscloud?.tcEventId && tcEventId) {
    return (
      <TcWidgetButton
        tcEventId={ticketscloud.tcEventId}
        purchaseUrl={purchaseUrl}
        label={resolvedLabel}
        compact={compact}
        className={className}
      />
    );
  }

  if (teplohod?.tepEventId) {
    return (
      <TeplohodWidgetButton
        tepEventId={teplohod.tepEventId}
        tepWidgetId={teplohod.tepWidgetId}
        label={resolvedLabel}
        className={className}
      />
    );
  }

  if (purchaseUrl) {
    return (
      <a href={purchaseUrl} target="_blank" rel="noopener noreferrer" className={className}>
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
