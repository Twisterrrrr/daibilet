/**
 * Widget / Ticketscloud import → buyer ticket card when import has enough fields.
 * Sparse imports fall back to an email CTA (no invented QR / empty ticket).
 *
 * Numbering: external/widget keeps partner codes as-is (e.g. KXM-494695, 113184626).
 * Internal Daibilet codes are DB… + sequence (no personal-name fragments).
 */

import {
  mapFinanceOrderStatus,
  type BuyerInternalOrderRecord,
} from './buyer-checkout';

/** Minimal purchase-row shape for import ticket assessment (Daibilet / widget). */
export type BuyerOrderTicketSource = {
  number: string;
  status: string;
  displayStatus: string;
  statusTone: string;
  eventTitle?: string | null;
  purchasedAt?: string | null;
  amountRub?: number | null;
  ticketCount: number;
  buyer: {
    name?: string | null;
    email?: string | null;
  };
  tickets: Array<{
    number?: string | null;
    startsAt?: string | null;
    eventId?: string | null;
    eventUrl?: string | null;
    eventTitle?: string | null;
  }>;
};

export type ImportTicketRichness = 'rich' | 'sparse';

export type ImportTicketAssessment = {
  richness: ImportTicketRichness;
  /** Prefer ExternalTicket number (e.g. KXM-494695); else order number. */
  ticketCode: string | null;
  orderCode: string;
  eventTitle: string | null;
  startsAt: string | null;
};

function parseStartsAtMs(value: string | null | undefined): number | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function firstTicketCode(order: BuyerOrderTicketSource): string | null {
  for (const ticket of order.tickets || []) {
    const code = String(ticket.number || '').trim();
    if (code) return code;
  }
  return null;
}

function firstStartsAt(order: BuyerOrderTicketSource): string | null {
  for (const ticket of order.tickets || []) {
    const ms = parseStartsAtMs(ticket.startsAt);
    if (ms == null) continue;
    return new Date(ms).toISOString();
  }
  return null;
}

/** True when the earliest known session start is in the past (or now). */
export function orderEventHasStarted(order: BuyerOrderTicketSource, nowMs = Date.now()): boolean {
  const starts = (order.tickets || [])
    .map((ticket) => parseStartsAtMs(ticket.startsAt))
    .filter((ms): ms is number => ms != null);
  if (!starts.length) return false;
  return Math.min(...starts) <= nowMs;
}

/**
 * Rich = enough to render BuyerTicketCard (title + code).
 * Sparse = show email line instead of empty Скачать/Открыть.
 */
export function assessImportTicket(order: BuyerOrderTicketSource): ImportTicketAssessment {
  const orderCode = String(order.number || '').trim();
  const ticketCode = firstTicketCode(order);
  const eventTitle = String(order.eventTitle || '').trim() || null;
  const startsAt = firstStartsAt(order);
  const code = ticketCode || orderCode || null;

  const richness: ImportTicketRichness = code && eventTitle ? 'rich' : 'sparse';

  return {
    richness,
    ticketCode: code,
    orderCode: orderCode || code || '',
    eventTitle,
    startsAt,
  };
}

/** Map widget purchase row → ticket page record (catalog Path A card). */
export function mapBuyerOrderToImportTicketRecord(
  order: BuyerOrderTicketSource,
  email: string,
): BuyerInternalOrderRecord | null {
  const assessed = assessImportTicket(order);
  if (assessed.richness !== 'rich' || !assessed.ticketCode) return null;

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) return null;

  const status = String(order.status || 'CONFIRMED');
  const mapped = mapFinanceOrderStatus(status);
  const title = assessed.eventTitle || 'Входной билет';
  const issuedCode = assessed.ticketCode;
  const orderCode = assessed.orderCode || issuedCode;

  return {
    publicCode: orderCode,
    ticketNumber: issuedCode,
    status,
    displayStatus: order.displayStatus || mapped.displayStatus,
    statusTone: order.statusTone || mapped.statusTone,
    title,
    email: normalizedEmail,
    buyerName: order.buyer?.name || null,
    eventTitle: assessed.eventTitle,
    venueTitle: null,
    venueAddress: null,
    venueSlug: null,
    sessionStartsAt: assessed.startsAt,
    validUntil: null,
    validityMode: assessed.startsAt ? 'SESSION' : null,
    lineItems: [
      {
        ticketTitle: 'Билет',
        quantity: Math.max(1, Math.round(Number(order.ticketCount) || 1)),
      },
    ],
    amountRub: order.amountRub ?? null,
    purchasedAt: order.purchasedAt || null,
    supplierSupportPhone: null,
    mode: 'WIDGET_IMPORT',
    source: 'internal',
  };
}
