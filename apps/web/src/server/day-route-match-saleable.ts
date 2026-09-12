/**
 * Saleable gate for «Мой день» matches - align with public event page
 * (`isSaleableEventForPublic`: upcoming/open schedule + purchaseReady).
 * Unsaleable TC thin rows resolve to soft-404 on `/events/{slug}` - never surface as buy CTA.
 */

export const DAY_ROUTE_MATCH_START_GRACE_MS = 15 * 60 * 1000;
export const DAY_ROUTE_MATCH_RUNNING_MAX_MS = 36 * 60 * 60 * 1000;

export type DayRouteMatchSaleableSession = {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  sourceStatus?: string | null;
};

export type DayRouteMatchSaleableOffer = {
  active?: boolean | null;
  widgetUrl?: string | null;
  deeplinkUrl?: string | null;
  sourceCode?: string | null;
};

export type DayRouteMatchSaleableSourceLink = {
  externalId?: string | null;
  source?: { code?: string | null } | null;
};

export type DayRouteMatchSaleableEvent = {
  kind?: string | null;
  sourceStatus?: string | null;
  status?: string | null;
  sessions?: DayRouteMatchSaleableSession[] | null;
  offers?: DayRouteMatchSaleableOffer[] | null;
  sourceLinks?: DayRouteMatchSaleableSourceLink[] | null;
};

function parseMs(value: Date | string | null | undefined): number {
  if (value == null) return NaN;
  if (value instanceof Date) return value.getTime();
  return Date.parse(String(value));
}

export function dayRouteMatchHasUpcomingOrOpenSchedule(
  event: Pick<DayRouteMatchSaleableEvent, 'kind' | 'sourceStatus' | 'sessions'>,
  nowMs = Date.now(),
): boolean {
  const kind = String(event.kind || '').toUpperCase();
  const eventSource = String(event.sourceStatus || '').toLowerCase();
  if (kind === 'OPEN_DATE' || eventSource === 'open_date') return true;

  for (const session of event.sessions || []) {
    const sourceStatus = String(session.sourceStatus || '').toLowerCase();
    if (sourceStatus === 'widget' || sourceStatus === 'open_date') return true;

    const startsAtMs = parseMs(session.startsAt);
    const endsAtMs = parseMs(session.endsAt);

    if (Number.isFinite(startsAtMs) && startsAtMs >= nowMs - DAY_ROUTE_MATCH_START_GRACE_MS) {
      return true;
    }

    if (
      Number.isFinite(startsAtMs) &&
      Number.isFinite(endsAtMs) &&
      startsAtMs < nowMs &&
      endsAtMs >= nowMs
    ) {
      const duration = endsAtMs - startsAtMs;
      if (duration <= DAY_ROUTE_MATCH_RUNNING_MAX_MS) return true;
      if (kind === 'RECURRING' || kind === 'SERIES') return true;
    }
  }

  return false;
}

export function dayRouteMatchPurchaseReady(
  event: Pick<DayRouteMatchSaleableEvent, 'offers' | 'sourceLinks'>,
): boolean {
  for (const offer of event.offers || []) {
    if (offer.active === false) continue;
    if (String(offer.widgetUrl || '').trim() || String(offer.deeplinkUrl || '').trim()) {
      return true;
    }
    const code = String(offer.sourceCode || '').toUpperCase();
    if (code.includes('TICKETSCLOUD') || code.includes('TEPLOHOD') || code.includes('TEP')) {
      // Offer alone without URL is not enough - need source link externalId below.
    }
  }

  for (const link of event.sourceLinks || []) {
    const externalId = String(link.externalId || '').trim();
    if (!externalId) continue;
    const code = String(link.source?.code || '').toUpperCase();
    if (code.includes('TICKETSCLOUD') || code.includes('TEPLOHOD') || code.includes('TEP') || code.includes('TC')) {
      return true;
    }
  }

  return false;
}

/** True when event would get a working public `/events/{slug}` page (not soft-404). */
export function isDayRouteMatchSaleable(
  event: DayRouteMatchSaleableEvent,
  nowMs = Date.now(),
): boolean {
  const status = String(event.status || '').toUpperCase();
  if (status === 'HIDDEN' || status === 'DRAFT') return false;
  return dayRouteMatchHasUpcomingOrOpenSchedule(event, nowMs) && dayRouteMatchPurchaseReady(event);
}

/** Prisma `where` fragment: cheap prefilter before JS saleable gate. */
export function dayRouteMatchSaleableWhere(now = new Date()) {
  const graceStart = new Date(now.getTime() - DAY_ROUTE_MATCH_START_GRACE_MS);
  return {
    status: { notIn: ['HIDDEN', 'DRAFT'] as const },
    AND: [
      {
        OR: [
          { kind: 'OPEN_DATE' as const },
          { sourceStatus: 'open_date' },
          {
            sessions: {
              some: {
                OR: [
                  { startsAt: { gte: graceStart } },
                  {
                    AND: [{ startsAt: { lt: now } }, { endsAt: { gte: now } }],
                  },
                  { sourceStatus: { in: ['widget', 'open_date'] } },
                ],
              },
            },
          },
        ],
      },
      {
        OR: [
          {
            offers: {
              some: {
                active: true,
                OR: [{ widgetUrl: { not: null } }, { deeplinkUrl: { not: null } }],
              },
            },
          },
          {
            sourceLinks: {
              some: {
                externalId: { not: '' },
                source: { code: { in: ['TICKETSCLOUD', 'TEPLOHOD'] as const } },
              },
            },
          },
        ],
      },
    ],
  };
}

/** Select fields needed for JS saleable confirmation (fresh dates each call). */
export function dayRouteMatchSaleableSelect(now = new Date()) {
  const graceStart = new Date(now.getTime() - DAY_ROUTE_MATCH_START_GRACE_MS);
  return {
    kind: true,
    sourceStatus: true,
    status: true,
    sessions: {
      where: {
        OR: [
          { startsAt: { gte: graceStart } },
          {
            AND: [{ startsAt: { lt: now } }, { endsAt: { gte: now } }],
          },
          { sourceStatus: { in: ['widget', 'open_date'] } },
        ],
      },
      select: { startsAt: true, endsAt: true, sourceStatus: true },
      orderBy: { startsAt: 'asc' as const },
      take: 3,
    },
    offers: {
      where: { active: true },
      select: { widgetUrl: true, deeplinkUrl: true, sourceCode: true, active: true },
      take: 4,
    },
    sourceLinks: {
      select: {
        externalId: true,
        source: { select: { code: true } },
      },
      take: 4,
    },
  } as const;
}
