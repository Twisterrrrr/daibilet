import { prisma } from '@daibilet/db';
import {
  loadStubCheckoutEvent,
  resolveStubCheckoutSupplier,
} from './checkout-stub.js';
import {
  readYooKassaRuntimeConfig,
  validateYooKassaCheckoutReadiness,
} from './checkout-yookassa.js';

export async function buildPublicEventCheckout(slug: string) {
  const event = await loadStubCheckoutEvent({ eventSlug: slug });
  if (!event || !['READY', 'PUBLISHED'].includes(String(event.status))) return null;
  const offers = await prisma.eventOffer.findMany({
    where: { eventId: event.id, active: true },
    select: { id: true, eventId: true, sourceCode: true, title: true, priceRub: true, active: true, capacityTotal: true },
    orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
  });
  const config = readYooKassaRuntimeConfig();
  const supplier = resolveStubCheckoutSupplier(event);
  const now = new Date();
  const publicOffers = offers.map((offer) => ({
    id: offer.id,
    title: offer.title || 'Билет',
    priceRub: offer.priceRub,
    canSell: validateYooKassaCheckoutReadiness({
      config, now, event, offer, session: null, supplier, quantity: 1,
    }).every((issue) => issue.severity !== 'high'),
  }));
  return {
    eventId: event.id,
    slug: event.slug,
    title: event.title,
    kind: event.kind,
    canSell: publicOffers.some((offer) => offer.canSell),
    offers: publicOffers,
  };
}
