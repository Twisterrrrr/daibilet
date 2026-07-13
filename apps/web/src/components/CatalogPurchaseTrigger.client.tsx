'use client';

import * as React from 'react';

import { CheckoutModal } from '@/components/CheckoutModal.client';
import { buildTcCheckoutUrl, getTcWidgetIds } from '@/components/TcWidget.client';
import { getTeplohodWidgetIds, resolveTeplohodCheckoutUrl } from '@/components/TeplohodWidget.client';
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

function resolveCheckoutUrl(session: PublicSessionDto): string | null {
  const teplohod = getTeplohodWidgetIds(session);
  if (teplohod?.tepEventId) {
    return resolveTeplohodCheckoutUrl({
      purchaseUrl: session.purchaseUrl || session.widgetUrl,
      tepEventId: teplohod.tepEventId,
      tepWidgetId: teplohod.tepWidgetId,
    });
  }

  const tcEventId = extractTcEventIdFromSession(session) || getTcWidgetIds(session)?.tcEventId || '';
  return buildTcCheckoutUrl({
    tcEventId,
    purchaseUrl: session.purchaseUrl || session.widgetUrl || session.deeplinkUrl,
  });
}

export function useCatalogPurchase(session: PublicSessionDto) {
  const purchaseEnabled = canOpenCatalogPurchase(session);
  const [modalUrl, setModalUrl] = React.useState<string | null>(null);
  const tcTriggerRef = React.useRef<HTMLButtonElement>(null);

  const openPurchase = React.useCallback(
    (slotLabel?: string) => {
      const target = slotLabel ? resolvePurchaseSessionForSlot(session, slotLabel) : session;
      const url = resolveCheckoutUrl(target) || resolveCheckoutUrl(session);
      if (url) setModalUrl(url);
    },
    [session],
  );

  return {
    purchaseEnabled,
    openPurchase,
    modalUrl,
    closeModal: () => setModalUrl(null),
    teplohod: purchaseEnabled ? getTeplohodWidgetIds(session) : null,
    tcEventId: extractTcEventIdFromSession(session) || '',
    tcToken: '',
    tcTriggerRef,
    teplohodWrapperId: '',
  };
}

export function CatalogPurchaseAnchors({
  modalUrl,
  onClose,
}: {
  modalUrl?: string | null;
  onClose?: () => void;
  // legacy unused props accepted for soft upgrade
  session?: PublicSessionDto;
  teplohod?: unknown;
  teplohodWrapperId?: string;
  tcEventId?: string;
  tcToken?: string;
  tcTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  if (!modalUrl || !onClose) return null;
  return <CheckoutModal open={Boolean(modalUrl)} checkoutUrl={modalUrl} onClose={onClose} title="Покупка билета" />;
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
