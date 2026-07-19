import { prisma } from '@daibilet/db';

/** Statuses that count as a completed purchase (TC + internal). */
const CONFIRMED_ORDER_STATUS_TOKENS = [
  'done',
  'paid',
  'confirmed',
  'completed',
  'success',
  'executed',
  'sold',
  'fulfilled',
];

export function isConfirmedOrderStatus(status: string | null | undefined): boolean {
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (!value) return false;
  if (['cancel', 'cancelled', 'canceled', 'refund', 'failed', 'expired', 'void'].some((t) => value.includes(t))) {
    return false;
  }
  return CONFIRMED_ORDER_STATUS_TOKENS.some((token) => value.includes(token));
}

export function normalizeEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export type PurchaseVerificationInput = {
  eventId: string;
  email?: string | null;
  orderOrTicketRef?: string | null;
  reviewRequestToken?: string | null;
  siteUserId?: string | null;
};

export type PurchaseVerificationResult = {
  verified: boolean;
  externalOrderId?: string | null;
  checkoutOrderId?: string | null;
  purchaseRef?: string | null;
  buyerName?: string | null;
  purchaseDate?: Date | null;
  reason?: string;
};

/**
 * Resolve sibling event IDs via TicketsCloud metaExternalId + admin mergeGroupKey.
 */
export async function loadEventMatchIds(eventId: string): Promise<string[]> {
  const ids = new Set<string>([eventId]);

  const links = await prisma.eventSourceLink.findMany({
    where: { eventId },
    select: { metaExternalId: true },
  });
  const metaIds = [...new Set(links.map((l) => l.metaExternalId).filter(Boolean))] as string[];
  if (metaIds.length > 0) {
    const siblings = await prisma.eventSourceLink.findMany({
      where: { metaExternalId: { in: metaIds } },
      select: { eventId: true },
    });
    for (const row of siblings) ids.add(row.eventId);
  }

  const override = await prisma.eventOverride.findUnique({
    where: { eventId },
    select: { mergeGroupKey: true },
  });
  if (override?.mergeGroupKey) {
    const peers = await prisma.eventOverride.findMany({
      where: { mergeGroupKey: override.mergeGroupKey },
      select: { eventId: true },
    });
    for (const row of peers) ids.add(row.eventId);
  }

  return [...ids];
}

function extractBuyerName(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const root = snapshot as Record<string, unknown>;
  const buyer = (root.buyer && typeof root.buyer === 'object' ? root.buyer : root) as Record<string, unknown>;
  const customer = (root.customer && typeof root.customer === 'object' ? root.customer : {}) as Record<
    string,
    unknown
  >;
  for (const candidate of [
    buyer.name,
    buyer.fullName,
    buyer.customerName,
    customer.name,
    root.name,
    root.fullName,
    root.customerName,
  ]) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return null;
}

/**
 * Verify review author against ExternalOrder / ReviewRequest / CheckoutOrder.
 * Primary path for aggregator: email and/or order/ticket number ↔ ExternalOrder.
 */
export async function verifyPurchaseForReview(
  input: PurchaseVerificationInput,
): Promise<PurchaseVerificationResult> {
  const eventIds = await loadEventMatchIds(input.eventId);
  const email = normalizeEmail(input.email);
  const ref = String(input.orderOrTicketRef || '')
    .trim()
    .replace(/^№\s*/i, '');

  if (input.reviewRequestToken) {
    const request = await prisma.reviewRequest.findUnique({
      where: { token: input.reviewRequestToken },
    });
    if (request && eventIds.includes(request.eventId)) {
      if (email && normalizeEmail(request.email) !== email) {
        return { verified: false, reason: 'review_request_email_mismatch' };
      }
      return {
        verified: true,
        externalOrderId: request.externalOrderId,
        checkoutOrderId: request.checkoutOrderId,
        purchaseRef: request.purchaseRef,
        buyerName: request.buyerName,
        purchaseDate: request.purchaseDate,
        reason: 'review_request_token',
      };
    }
  }

  if (!email && !ref) {
    return { verified: false, reason: 'no_credentials' };
  }

  // Match ExternalTicket by ticket id / public order code / external order id
  if (ref) {
    const ticket = await prisma.externalTicket.findFirst({
      where: {
        OR: [
          { externalTicketId: ref },
          { order: { externalOrderId: ref } },
          { order: { publicCode: ref } },
          { order: { id: ref } },
        ],
        eventId: { in: eventIds },
      },
      include: {
        order: true,
      },
      orderBy: { order: { purchasedAt: 'desc' } },
    });

    if (ticket?.order && isConfirmedOrderStatus(ticket.order.status)) {
      const orderEmail = normalizeEmail(ticket.order.buyerEmailNormalized);
      if (email && orderEmail && email !== orderEmail) {
        return { verified: false, reason: 'email_order_mismatch' };
      }
      return {
        verified: true,
        externalOrderId: ticket.order.id,
        purchaseRef: ticket.externalTicketId || ticket.order.publicCode || ticket.order.externalOrderId,
        buyerName: extractBuyerName(ticket.order.buyerSnapshot),
        purchaseDate: ticket.order.purchasedAt,
        reason: 'external_ticket',
      };
    }

    const order = await prisma.externalOrder.findFirst({
      where: {
        OR: [{ id: ref }, { externalOrderId: ref }, { publicCode: ref }],
        tickets: { some: { eventId: { in: eventIds } } },
      },
      include: {
        tickets: { where: { eventId: { in: eventIds } }, take: 1 },
      },
    });
    if (order && isConfirmedOrderStatus(order.status)) {
      const orderEmail = normalizeEmail(order.buyerEmailNormalized);
      if (email && orderEmail && email !== orderEmail) {
        return { verified: false, reason: 'email_order_mismatch' };
      }
      return {
        verified: true,
        externalOrderId: order.id,
        purchaseRef: order.publicCode || order.externalOrderId,
        buyerName: extractBuyerName(order.buyerSnapshot),
        purchaseDate: order.purchasedAt,
        reason: 'external_order',
      };
    }
  }

  // Email-only: any confirmed ExternalOrder with ticket for this event (or siblings)
  if (email) {
    const order = await prisma.externalOrder.findFirst({
      where: {
        buyerEmailNormalized: email,
        tickets: { some: { eventId: { in: eventIds } } },
      },
      include: {
        tickets: { where: { eventId: { in: eventIds } }, take: 1, orderBy: { id: 'asc' } },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    if (order && isConfirmedOrderStatus(order.status)) {
      return {
        verified: true,
        externalOrderId: order.id,
        purchaseRef:
          order.tickets[0]?.externalTicketId || order.publicCode || order.externalOrderId,
        buyerName: extractBuyerName(order.buyerSnapshot),
        purchaseDate: order.purchasedAt,
        reason: 'external_order_email',
      };
    }

    // Own/manual checkout (if present)
    const checkout = await prisma.checkoutOrder.findFirst({
      where: {
        buyerEmail: email,
        status: { in: ['PAID', 'CONFIRMED', 'FULFILLED'] },
        items: { some: { eventId: { in: eventIds } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (checkout) {
      return {
        verified: true,
        checkoutOrderId: checkout.id,
        purchaseRef: checkout.publicCode || checkout.id,
        buyerName: checkout.buyerName,
        purchaseDate: checkout.paidAt || checkout.createdAt,
        reason: 'checkout_order',
      };
    }

    if (input.siteUserId) {
      const linked = await prisma.externalOrder.findFirst({
        where: {
          siteUserId: input.siteUserId,
          tickets: { some: { eventId: { in: eventIds } } },
        },
        include: {
          tickets: { where: { eventId: { in: eventIds } }, take: 1 },
        },
        orderBy: { purchasedAt: 'desc' },
      });
      if (linked && isConfirmedOrderStatus(linked.status)) {
        return {
          verified: true,
          externalOrderId: linked.id,
          purchaseRef:
            linked.tickets[0]?.externalTicketId || linked.publicCode || linked.externalOrderId,
          buyerName: extractBuyerName(linked.buyerSnapshot),
          purchaseDate: linked.purchasedAt,
          reason: 'site_user_order',
        };
      }
    }
  }

  return { verified: false, reason: 'not_found' };
}
