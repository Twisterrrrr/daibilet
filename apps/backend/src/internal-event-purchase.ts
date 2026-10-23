export interface InternalEventPurchaseInput {
  slug: string;
  kind: string;
  status: string;
  purchaseFlow: string;
  managementMode: string;
  supplierStatus: string | null;
  legalProfileStatus: string | null;
  ticketsVacant: number | null;
  salesStartsAt: Date | null;
  salesEndsAt: Date | null;
  openDateValidFrom: Date | null;
  openDateValidTo: Date | null;
  offers: Array<{ eventId: string; sourceCode: string; active: boolean; priceRub?: number | null }>;
  eventId: string;
}

/** Public entry is deliberately narrower than checkout validation for the first open-date pilot. */
export function internalEventPurchasePath(input: InternalEventPurchaseInput, now = new Date()): string | null {
  if (input.kind !== 'OPEN_DATE' || !['READY', 'PUBLISHED'].includes(input.status)) return null;
  if (input.purchaseFlow !== 'PLATFORM') return null;
  if (!['DAIBILET_MANAGED', 'SUPPLIER_DRAFTS'].includes(input.managementMode)) return null;
  if (input.supplierStatus !== 'ACTIVE' || input.legalProfileStatus !== 'VERIFIED') return null;
  if (input.ticketsVacant !== null && input.ticketsVacant <= 0) return null;
  if (input.salesStartsAt && input.salesStartsAt > now) return null;
  if (input.salesEndsAt && input.salesEndsAt < now) return null;
  if (input.openDateValidFrom && input.openDateValidFrom > now) return null;
  if (input.openDateValidTo && input.openDateValidTo < now) return null;
  if (!input.offers.some((offer) => offer.eventId === input.eventId && offer.active && offer.sourceCode === 'MANUAL' && Number(offer.priceRub) >= 100)) return null;
  return `/checkout/events/${encodeURIComponent(input.slug)}`;
}
