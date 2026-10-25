import { NextResponse } from 'next/server';

import { buyerTicketAbsoluteUrl } from '@/lib/buyer-ticket';
import { CHECKOUT_ORDER_ACCESS_COOKIE, readCheckoutOrderAccessProof } from '@/server/checkout-order-access';
import { lookupCheckoutOrderByPublicCode } from '@/server/finance-checkout-client';
import { enqueueBuyerTicketEmail } from '@/server/buyer-ticket-delivery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = { publicCode?: string };

/**
 * Enqueue a delivery request for a finance order; the worker owns SMTP retries.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const publicCode = String(body.publicCode || '').trim();
  if (!publicCode) {
    return NextResponse.json({ error: 'publicCode_required' }, { status: 400 });
  }

  const siteUrl = (
    process.env.DAIBILET_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://daibilet.ru'
  ).replace(/\/$/, '');

  const proof = readCheckoutOrderAccessProof(
    request.headers.get('cookie'),
    publicCode,
    CHECKOUT_ORDER_ACCESS_COOKIE,
  );
  const order = proof
    ? await lookupCheckoutOrderByPublicCode(publicCode, process.env, proof.token)
    : null;
  const email = String(order?.email || '')
    .trim()
    .toLowerCase();

  if (!order) return NextResponse.json({ ok: false, reason: 'order_unavailable' }, { status: 503 });

  if (!email.includes('@')) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: 'email_missing',
      publicCode,
    });
  }

  const ticketUrl = buyerTicketAbsoluteUrl(publicCode, siteUrl);
  try {
    await enqueueBuyerTicketEmail(publicCode, email);
  } catch {
    console.error(`[buyer-ticket-delivery] enqueue failed for order ${publicCode}`);
    return NextResponse.json({ ok: false, reason: 'queue_unavailable', publicCode }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    sent: false,
    reason: 'queued',
    publicCode,
    ticketUrl,
  });
}
