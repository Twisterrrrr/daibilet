import { isOpenDateCatalogRow } from './catalog-availability.js';

/**
 * Gate for synthetic "В виджете" / open-date widget slots on the event page.
 * Dated TicketsCloud products must NOT get a fake open-date when all fixed
 * sessions expired — that reopens the past TC eventId ("Мероприятие прошло").
 */
export function shouldSynthesizeWidgetOnlySession(input: {
  sessionsLength: number;
  kind?: string | null;
  sourceStatus?: string | null;
  purchaseReady: boolean;
}): boolean {
  if (input.sessionsLength > 0 || !input.purchaseReady) return false;
  return isOpenDateCatalogRow({ kind: input.kind, sourceStatus: input.sourceStatus });
}

export function extractTcEventIdFromPurchaseUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = String(url).match(/[?&]event=([^&]+)/i);
  const eventId = match?.[1];
  return eventId ? decodeURIComponent(eventId) : null;
}

export type WidgetFallbackSessionPurchase = {
  purchaseUrl?: string | null;
  purchaseReady?: boolean | null;
  vacant?: number | null;
  purchaseUrlSource?: string | null;
};

/**
 * Prefer the nearest saleable session (e.g. meta-sibling future slot) over the
 * requested past event's widget identity.
 */
export function pickPrimarySessionPurchase(
  sessions: WidgetFallbackSessionPurchase[],
  fallbackUrl: string | null,
  fallbackExternalId: string | null,
): {
  purchaseUrl: string | null;
  externalId: string | null;
  urlSource: string | null;
} {
  for (const session of sessions) {
    if (session.purchaseReady === false) continue;
    if (!session.purchaseUrl) continue;
    if (typeof session.vacant === 'number' && session.vacant <= 0) continue;
    const tcEventId = extractTcEventIdFromPurchaseUrl(session.purchaseUrl);
    return {
      purchaseUrl: session.purchaseUrl,
      externalId: tcEventId || fallbackExternalId,
      urlSource: session.purchaseUrlSource || null,
    };
  }
  const firstWithUrl = sessions.find((session) => session.purchaseUrl);
  if (firstWithUrl?.purchaseUrl) {
    return {
      purchaseUrl: firstWithUrl.purchaseUrl,
      externalId: extractTcEventIdFromPurchaseUrl(firstWithUrl.purchaseUrl) || fallbackExternalId,
      urlSource: firstWithUrl.purchaseUrlSource || null,
    };
  }
  return {
    purchaseUrl: fallbackUrl,
    externalId: fallbackExternalId,
    urlSource: null,
  };
}
