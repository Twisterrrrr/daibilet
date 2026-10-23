import { NextResponse } from 'next/server';

import { enqueueBuyerTicketEmail } from '@/server/buyer-ticket-delivery';
import { submitEventCheckout } from '@/server/finance-checkout-client';
import { fetchFinanceEventCheckout } from '@/server/finance-event-checkout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const slug = typeof body.eventSlug === 'string' ? body.eventSlug.trim() : '';
  const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : '';
  const quantity = Number(body.quantity);
  const buyer = body.buyer && typeof body.buyer === 'object'
    ? body.buyer as Record<string, unknown> : {};
  const email = typeof buyer.email === 'string' ? buyer.email.trim().toLowerCase() : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!slug || !offerId || !email.includes('@') || !Number.isInteger(quantity)
    || quantity < 1 || quantity > 10 || !idempotencyKey) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  const projection = await fetchFinanceEventCheckout(slug);
  if (!projection?.canSell || projection.kind !== 'OPEN_DATE'
    || !projection.offers.some((offer) => offer.id === offerId && offer.canSell)) {
    return NextResponse.json({ error: 'event_checkout_unavailable' }, { status: 422 });
  }
  const siteUrl = (process.env.DAIBILET_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru').replace(/\/$/, '');
  const result = await submitEventCheckout({
    eventId: projection.eventId, offerId, quantity, idempotencyKey,
    buyer: { email, name: typeof buyer.name === 'string' ? buyer.name.trim() : null },
    returnUrl: `${siteUrl}/checkout/result`,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail || null },
      { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 });
  }
  try { await enqueueBuyerTicketEmail(result.publicCode, email); }
  catch { console.error(`[buyer-ticket-delivery] enqueue failed for order ${result.publicCode}`); }
  return NextResponse.json({
    ok: true, publicCode: result.publicCode, status: result.status,
    confirmationUrl: result.confirmationUrl,
  });
}
