export type TcPurchaseTarget = {
  tcEventId: string;
  purchaseUrl?: string | null;
};

export type PurchaseSession = {
  id?: string | null;
  eventId?: string | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  purchaseReady?: boolean;
  vacant?: number | null;
  sourceStatus?: string | null;
  eventSourceStatus?: string | null;
  purchaseProvider?: string | null;
  offerSourceCode?: string | null;
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  upcomingSlots?: Array<{
    eventId?: string | null;
    startsAt?: string | null;
    dateLabel?: string | null;
    timeLabel?: string | null;
    purchaseUrl?: string | null;
    sourceStatus?: string | null;
    purchaseReady?: boolean;
    vacant?: number | null;
  }>;
};

export function extractTcEventIdFromSession(session: {
  id?: string | null;
  eventId?: string | null;
  purchaseUrl?: string | null;
}) {
  // Prefer session/event id: meta-group siblings may inherit a sibling's offer widget URL
  // (same ?event=), which would collapse distinct slots to one TicketsCloud id.
  const raw = String(session.eventId || session.id || '').trim();
  const fromId = raw.match(/^(?:evt_|sess_)?([a-f0-9]{20,})$/i);
  if (fromId) return fromId[1];

  const purchaseUrl = String(session.purchaseUrl || '');
  const fromTcQuery = purchaseUrl.match(/[?&]event=([^&]+)/)?.[1];
  if (fromTcQuery) return decodeURIComponent(fromTcQuery);

  // Teplohod ids must not be treated as TicketsCloud event ids (breaks landings /events buy).
  if (/teplohod\.info/i.test(purchaseUrl)) return null;
  if (/^evt_tep_/i.test(raw)) return null;

  const match = raw.match(/^(?:evt_|sess_)?([a-f0-9]+)$/i);
  return match ? match[1] : raw || null;
}

function isTeplohodPurchaseSession(session: PurchaseSession): boolean {
  const purchaseUrl = String(session.purchaseUrl || session.widgetUrl || '');
  const provider = String(session.purchaseProvider || session.offerSourceCode || '').toUpperCase();
  return (
    provider.includes('TEPLOHOD') ||
    provider.includes('TEP') ||
    purchaseUrl.includes('teplohod.info') ||
    /^evt_tep_/i.test(String(session.id || session.eventId || ''))
  );
}

export function isSessionPurchaseBlocked(session: PurchaseSession): boolean {
  const statuses = [session.sourceStatus, session.eventSourceStatus].map((value) =>
    String(value || '').toLowerCase(),
  );
  if (statuses.some((status) =>
    ['paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale', 'widget_blocked'].includes(status),
  )) {
    return true;
  }
  if (session.purchaseReady === false) return true;
  if (isTeplohodPurchaseSession(session) && Boolean(session.purchaseUrl || session.widgetUrl || /^evt_tep_/i.test(String(session.id || session.eventId || '')))) {
    return false;
  }
  if (session.vacant === 0) return true;
  if (!session.purchaseUrl && session.purchaseReady !== true) return true;
  return false;
}

export function compareSessionsByStartsAt(
  a: { startsAt?: string | null },
  b: { startsAt?: string | null },
): number {
  return new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime();
}

export function expandSessionPurchaseVariants<T extends PurchaseSession>(session: T): T[] {
  const variants = new Map<string, T>();
  const remember = (candidate: T) => {
    const key = `${candidate.eventId || candidate.id || ''}|${candidate.startsAt || ''}|${candidate.purchaseUrl || ''}`;
    if (!key.replace(/\|/g, '')) return;
    if (!variants.has(key)) variants.set(key, candidate);
  };

  remember(session);
  for (const slot of session.upcomingSlots || []) {
    remember({
      ...session,
      id: slot.eventId || session.id,
      eventId: slot.eventId || session.eventId,
      startsAt: slot.startsAt || session.startsAt,
      dateLabel: slot.dateLabel || session.dateLabel,
      timeLabel: slot.timeLabel || session.timeLabel,
      purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
      sourceStatus: slot.sourceStatus ?? session.sourceStatus,
      eventSourceStatus: slot.sourceStatus ?? session.eventSourceStatus,
      purchaseReady: slot.purchaseReady ?? session.purchaseReady,
      vacant: slot.vacant ?? session.vacant,
    });
  }

  return [...variants.values()].sort(compareSessionsByStartsAt);
}

export function pickPurchasableTcSession<T extends PurchaseSession>(sessions: T[]): T | null {
  const sorted = [...sessions].sort(compareSessionsByStartsAt);
  for (const session of sorted) {
    if (isSessionPurchaseBlocked(session)) continue;
    if (!extractTcEventIdFromSession(session)) continue;
    return session;
  }
  return null;
}

export function listPurchasableSessionVariants<T extends PurchaseSession>(sessions: T[]): T[] {
  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));
  // Never fall back to STAND_BY/closed/paused slots - empty rail is better than a dead CTA.
  return expanded.filter((session) => !isSessionPurchaseBlocked(session));
}

export function buildTcPurchaseTargets(sessions: PurchaseSession[]): TcPurchaseTarget[] {
  const targets: TcPurchaseTarget[] = [];
  const seen = new Set<string>();
  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));

  for (const session of expanded.sort(compareSessionsByStartsAt)) {
    if (isSessionPurchaseBlocked(session)) continue;
    const tcEventId = extractTcEventIdFromSession(session);
    if (!tcEventId || seen.has(tcEventId)) continue;
    seen.add(tcEventId);
    targets.push({ tcEventId, purchaseUrl: session.purchaseUrl || null });
  }

  return targets;
}

export function pickRepresentativeSession<T extends PurchaseSession>(sessions: T[]): T | null {
  if (!sessions.length) return null;
  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));
  const ranked = [...expanded].sort((a, b) => {
    const aBlocked = isSessionPurchaseBlocked(a) ? 1 : 0;
    const bBlocked = isSessionPurchaseBlocked(b) ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    return compareSessionsByStartsAt(a, b);
  });
  return pickPurchasableTcSession(ranked) || ranked[0] || sessions[0];
}

/** Event-level cancel / all sessions unsaleable → do not open TC widget. */
export function isEventPurchaseBlocked(
  event: {
    sourceStatus?: string | null;
    purchaseReady?: boolean;
    purchaseUrl?: string | null;
    widgetUrl?: string | null;
  },
  sessions: PurchaseSession[],
): boolean {
  if (
    isSessionPurchaseBlocked({
      sourceStatus: event.sourceStatus,
      eventSourceStatus: event.sourceStatus,
      purchaseReady: event.purchaseReady,
      purchaseUrl: event.purchaseUrl || event.widgetUrl,
    })
  ) {
    return true;
  }

  const expanded = sessions.flatMap((session) => expandSessionPurchaseVariants(session));
  if (!expanded.length) return false;
  return !expanded.some((session) => !isSessionPurchaseBlocked(session));
}

export function resolveTcPurchaseTarget(
  event: {
    externalId?: string | number | null;
    purchaseUrl?: string | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    widgetProvider?: string | null;
    sourceStatus?: string | null;
    purchaseReady?: boolean;
    widgetPayload?: { provider?: string | null; tcEventId?: string | number | null } | null;
  },
  sessions: PurchaseSession[],
  primaryOffer?: { widgetUrl?: string | null; deeplinkUrl?: string | null } | null,
): {
  tcEventId: string | null;
  purchaseUrl: string | null;
  isTcWidget: boolean;
  purchaseTargets: TcPurchaseTarget[];
} {
  // Stale event-level widget URL must not open TC when sales are gone/cancelled.
  if (isEventPurchaseBlocked(event, sessions)) {
    return {
      tcEventId: null,
      purchaseUrl: null,
      isTcWidget: false,
      purchaseTargets: [],
    };
  }

  const purchaseTargets = buildTcPurchaseTargets(sessions);
  const primaryTarget = purchaseTargets[0] || null;
  const purchasableSession = pickPurchasableTcSession(
    sessions.flatMap((session) => expandSessionPurchaseVariants(session)),
  );
  const ticketscloud = resolveTcWidgetIds(event);
  const tcEventId =
    primaryTarget?.tcEventId ||
    (purchasableSession ? extractTcEventIdFromSession(purchasableSession) : null) ||
    (purchasableSession ? ticketscloud?.tcEventId : null) ||
    null;
  const purchaseUrl =
    primaryTarget?.purchaseUrl ||
    purchasableSession?.purchaseUrl ||
    (purchasableSession
      ? primaryOffer?.widgetUrl ||
        primaryOffer?.deeplinkUrl ||
        event.purchaseUrl ||
        event.widgetUrl ||
        event.deeplinkUrl
      : null) ||
    null;

  return {
    tcEventId,
    purchaseUrl,
    isTcWidget: Boolean(ticketscloud && tcEventId),
    purchaseTargets,
  };
}

function resolveTcWidgetIds(event: {
  externalId?: string | number | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  widgetProvider?: string | null;
  widgetPayload?: { provider?: string | null; tcEventId?: string | number | null } | null;
}) {
  const provider = String(event.widgetProvider || event.widgetPayload?.provider || '').toUpperCase();
  const purchaseUrl = String(event.purchaseUrl || event.widgetUrl || '');
  const isTc =
    provider.includes('TC') ||
    provider.includes('TICKETSCLOUD') ||
    /ticketscloud/i.test(purchaseUrl);
  if (!isTc) return null;

  const tcEventId = String(event.widgetPayload?.tcEventId ?? event.externalId ?? '').trim();
  if (!tcEventId) return null;
  return { tcEventId };
}
