'use client';

import * as React from 'react';

import {
  getTcWidgetIds,
  normalizeTcPurchaseUrl,
  openTcWidget,
  resolveTcWidgetToken,
} from '@/components/TcWidget.client';
import {
  getTeplohodWidgetIdsFromSession,
  openTeplohodWidget,
  TeplohodWidgetEmbed,
} from '@/components/TeplohodWidget.client';
import { extractTcEventIdFromSession } from '@/lib/event-purchase';
import {
  canOpenCatalogPurchase,
  resolvePurchaseSessionForSlot,
} from '@/lib/event-card-meta';
import { trackSelectTickets } from '@/lib/catalog-analytics';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function stopCardNavigation(event: React.MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function useCatalogPurchase(session: PublicSessionDto) {
  const purchaseEnabled = canOpenCatalogPurchase(session);
  const tcTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const teplohodWrapperId = React.useId().replace(/:/g, '');
  const teplohod = React.useMemo(
    () => (purchaseEnabled ? getTeplohodWidgetIdsFromSession(session) : null),
    [purchaseEnabled, session],
  );
  const [teplohodEventId, setTeplohodEventId] = React.useState<string>(
    () => String(teplohod?.tepEventId || ''),
  );
  const [tcPayload, setTcPayload] = React.useState<{
    eventId: string;
    token: string;
    purchaseUrl: string | null;
  }>(() => {
    const purchaseUrl = session.widgetUrl || session.purchaseUrl || session.deeplinkUrl || null;
    const eventId = extractTcEventIdFromSession(session) || getTcWidgetIds(session)?.tcEventId || '';
    return {
      eventId: String(eventId || ''),
      token: resolveTcWidgetToken(purchaseUrl),
      purchaseUrl,
    };
  });

  const openPurchase = React.useCallback(
    (slotLabel?: string) => {
      const target = slotLabel ? resolvePurchaseSessionForSlot(session, slotLabel) : session;
      const targetPurchaseUrl = target.widgetUrl || target.purchaseUrl || target.deeplinkUrl || null;
      const targetTeplohod = getTeplohodWidgetIdsFromSession(target) || teplohod;

      trackSelectTickets({
        eventId: target.id || session.id,
        slug: target.slug || session.slug,
        provider: targetTeplohod?.tepEventId
          ? 'teplohod'
          : extractTcEventIdFromSession(target) || getTcWidgetIds(target)?.tcEventId
            ? 'ticketscloud'
            : 'external',
        source: 'catalog_purchase',
      });

      if (targetTeplohod?.tepEventId) {
        setTeplohodEventId(String(targetTeplohod.tepEventId));
        window.setTimeout(() => openTeplohodWidget(teplohodWrapperId), 120);
        return;
      }

      const eventId = extractTcEventIdFromSession(target) || getTcWidgetIds(target)?.tcEventId || '';
      const purchaseUrlRaw =
        targetPurchaseUrl || session.widgetUrl || session.purchaseUrl || session.deeplinkUrl || null;
      const purchaseUrl = normalizeTcPurchaseUrl(purchaseUrlRaw) || purchaseUrlRaw;
      const token = resolveTcWidgetToken(purchaseUrl);

      if (!eventId || !token) {
        if (purchaseUrl) window.open(purchaseUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      setTcPayload({ eventId: String(eventId), token, purchaseUrl });
      window.setTimeout(() => {
        void openTcWidget({
          trigger: tcTriggerRef.current,
          purchaseUrl,
        });
      }, 0);
    },
    [session, teplohod, teplohodWrapperId],
  );

  return {
    purchaseEnabled,
    openPurchase,
    teplohod,
    teplohodEventId,
    teplohodWrapperId,
    tcEventId: tcPayload.eventId,
    tcToken: tcPayload.token,
    tcPurchaseUrl: tcPayload.purchaseUrl,
    tcTriggerRef,
  };
}

export function CatalogPurchaseAnchors({
  teplohod,
  teplohodEventId,
  teplohodWrapperId,
  tcEventId,
  tcToken,
  tcPurchaseUrl,
  tcTriggerRef,
}: {
  session?: PublicSessionDto;
  teplohod?: { tepEventId?: string | number | null; tepWidgetId?: string | number | null } | null;
  teplohodEventId?: string | null;
  teplohodWrapperId?: string;
  tcEventId?: string;
  tcToken?: string;
  tcPurchaseUrl?: string | null;
  tcTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const tepEventId = String(teplohodEventId || teplohod?.tepEventId || '').trim();
  const tepWidgetId = teplohod?.tepWidgetId;
  const wrapperId = String(teplohodWrapperId || '').trim();
  const eventId = String(tcEventId || '').trim();
  const token = String(tcToken || '').trim();

  if (!tepEventId && (!eventId || !token)) return null;

  return (
    <>
      {tepEventId && wrapperId ? (
        <div
          id={wrapperId}
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <TeplohodWidgetEmbed tepEventId={tepEventId} tepWidgetId={tepWidgetId} wrapperId={`${wrapperId}__embed`} />
        </div>
      ) : null}
      {eventId && token ? (
        <button
          ref={tcTriggerRef}
          type="button"
          data-tc-event={eventId}
          data-tc-token={token}
          data-tc-href={tcPurchaseUrl || undefined}
          className="tc-widget-trigger pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        >
          Купить
        </button>
      ) : null}
    </>
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
