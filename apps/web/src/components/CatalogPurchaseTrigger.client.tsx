'use client';

import * as React from 'react';

import {
  getTcWidgetIds,
  openTcWidget,
  resolveTcWidgetToken,
} from '@/components/TcWidget.client';
import { getTeplohodWidgetIds, openTeplohodPurchase, TeplohodWidgetEmbed } from '@/components/TeplohodWidget.client';
import { extractTcEventIdFromSession } from '@/lib/event-purchase';
import {
  canOpenCatalogPurchase,
  resolvePurchaseSessionForSlot,
} from '@/lib/event-card-meta';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function stopCardNavigation(event: React.MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function useCatalogPurchase(session: PublicSessionDto) {
  const tcTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const teplohodWrapperId = React.useId().replace(/:/g, '');
  const purchaseEnabled = canOpenCatalogPurchase(session);
  const teplohod = purchaseEnabled ? getTeplohodWidgetIds(session) : null;
  const tcWidget = purchaseEnabled ? getTcWidgetIds(session) : null;
  const tcEventId = extractTcEventIdFromSession(session) || tcWidget?.tcEventId || '';
  const tcToken = resolveTcWidgetToken(session.purchaseUrl);

  const openPurchase = React.useCallback(
    (slotLabel?: string) => {
      const target = slotLabel ? resolvePurchaseSessionForSlot(session, slotLabel) : session;
      const targetTeplohod = getTeplohodWidgetIds(target);
      const targetTcEventId = extractTcEventIdFromSession(target) || tcEventId;
      const targetToken = resolveTcWidgetToken(target.purchaseUrl || session.purchaseUrl);

      if (targetTeplohod?.tepEventId) {
        openTeplohodPurchase({
          wrapperId: teplohodWrapperId,
          purchaseUrl: target.purchaseUrl || session.purchaseUrl || session.widgetUrl,
        });
        return;
      }

      if (targetTcEventId && targetToken) {
        void openTcWidget({ trigger: tcTriggerRef.current, purchaseUrl: target.purchaseUrl || session.purchaseUrl });
        return;
      }

      const fallbackUrl = target.purchaseUrl || session.purchaseUrl || session.widgetUrl || session.deeplinkUrl;
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [session, tcEventId, teplohodWrapperId],
  );

  return {
    purchaseEnabled,
    teplohod,
    tcEventId,
    tcToken,
    tcTriggerRef,
    teplohodWrapperId,
    openPurchase,
  };
}

export function CatalogPurchaseAnchors({
  session,
  teplohod,
  teplohodWrapperId,
  tcEventId,
  tcToken,
  tcTriggerRef,
}: {
  session: PublicSessionDto;
  teplohod: ReturnType<typeof getTeplohodWidgetIds>;
  teplohodWrapperId: string;
  tcEventId: string;
  tcToken: string;
  tcTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  if (!teplohod && !(tcEventId && tcToken)) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[-1] h-20 w-72 overflow-hidden opacity-0"
      aria-hidden="true"
    >
      {teplohod ? (
        <TeplohodWidgetEmbed
          tepEventId={teplohod.tepEventId}
          tepWidgetId={teplohod.tepWidgetId}
          wrapperId={teplohodWrapperId}
        />
      ) : null}
      {tcEventId && tcToken ? (
        <button
          ref={tcTriggerRef}
          type="button"
          data-tc-event={tcEventId}
          data-tc-token={tcToken}
          className="tc-widget-trigger"
          tabIndex={-1}
        >
          {session.title}
        </button>
      ) : null}
    </div>
  );
}

export function CatalogPurchaseChip({
  session,
  label,
  className,
  onOpen,
  children,
}: {
  session: PublicSessionDto;
  label: string;
  className?: string;
  onOpen: (slotLabel: string) => void;
  children: React.ReactNode;
}) {
  if (!canOpenCatalogPurchase(session)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      title="Купить билет на это время"
      aria-label={`Купить билет: ${label}`}
      className={`inline-btn relative z-[2] ${className || ''}`}
      onClick={(event) => {
        stopCardNavigation(event);
        onOpen(label);
      }}
    >
      {children}
    </button>
  );
}
