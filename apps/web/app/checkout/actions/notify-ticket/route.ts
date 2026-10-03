import { NextResponse } from 'next/server';

import { mapFinanceOrderStatus, type BuyerInternalOrderRecord } from '@/lib/buyer-checkout';
import { buyerTicketAbsoluteUrl } from '@/lib/buyer-ticket';
import { lookupCheckoutOrderByPublicCode } from '@/server/finance-checkout-client';
import { sendBuyerTicketEmail } from '@/server/buyer-ticket-mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  publicCode?: string;
  email?: string;
  title?: string;
  amountRub?: number | null;
  mode?: string;
  status?: string;
};

/**
 * Best-effort ticket email. Idempotent-ish: always tries once per call.
 * Without SMTP_* on web process → 200 + sent:false (buyer UX still works via save link).
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

  let order: BuyerInternalOrderRecord | null = await lookupCheckoutOrderByPublicCode(publicCode);
  const email = String(body.email || order?.email || '')
    .trim()
    .toLowerCase();
  const title = String(body.title || order?.title || 'Входной билет').trim();
  const status = String(body.status || order?.status || 'CONFIRMED').trim();
  const mapped = mapFinanceOrderStatus(status);

  if (!order) {
    order = {
      publicCode,
      status,
      displayStatus: mapped.displayStatus,
      statusTone: mapped.statusTone,
      title,
      email,
      purchasedAt: null,
      amountRub: typeof body.amountRub === 'number' ? body.amountRub : null,
      mode: String(body.mode || 'UNKNOWN'),
      source: 'internal',
    };
  }

  if (!email.includes('@')) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: 'email_missing',
      publicCode,
    });
  }

  const ticketUrl = buyerTicketAbsoluteUrl(publicCode, siteUrl);
  const mail = await sendBuyerTicketEmail({
    to: email,
    publicCode,
    title: order.title || title,
    ticketUrl,
    amountRub: order.amountRub,
    mode: order.mode,
  });

  return NextResponse.json({
    ok: true,
    sent: mail.sent,
    reason: mail.reason || null,
    publicCode,
    ticketUrl,
  });
}
