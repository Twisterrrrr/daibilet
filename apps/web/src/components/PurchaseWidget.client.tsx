'use client';

import type { PublicEventDto } from '@daibilet/contracts/public';

import { getTcWidgetIds, TcWidgetButton } from '@/components/TcWidget.client';
import { getTeplohodWidgetIds, TeplohodWidgetButton } from '@/components/TeplohodWidget.client';

type PurchaseSession = {
  id?: string;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  purchaseProvider?: string | null;
  offerSourceCode?: string | null;
};

export function PurchaseWidget({
  event,
  sessions = [],
}: {
  event: PublicEventDto;
  sessions?: PurchaseSession[];
}) {
  const primarySession = sessions[0];
  const purchaseUrl =
    event.purchaseUrl ||
    primarySession?.widgetUrl ||
    primarySession?.purchaseUrl ||
    null;

  const teplohod = getTeplohodWidgetIds({
    externalId: event.externalId,
    widgetProvider: event.widgetProvider,
    purchaseUrl,
    widgetPayload: event.widgetPayload as {
      provider?: string | null;
      tepEventId?: string | number | null;
      tepWidgetId?: string | number | null;
    } | null,
  });

  if (teplohod) {
    return (
      <TeplohodWidgetButton
        tepEventId={teplohod.tepEventId}
        tepWidgetId={teplohod.tepWidgetId}
        label="Купить билет"
      />
    );
  }

  const ticketscloud = getTcWidgetIds({
    externalId: event.externalId,
    widgetProvider: event.widgetProvider,
    widgetPayload: event.widgetPayload as { provider?: string | null; tcEventId?: string | number | null } | null,
    purchaseUrl,
  });

  if (ticketscloud) {
    return <TcWidgetButton tcEventId={ticketscloud.tcEventId} purchaseUrl={purchaseUrl} label="Купить билет" />;
  }

  if (purchaseUrl) {
    return (
      <a
        href={purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary/90"
      >
        Купить билет
      </a>
    );
  }

  return (
    <p className="text-sm text-slate-500">Билеты скоро появятся в продаже.</p>
  );
}
