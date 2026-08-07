import { NextResponse } from 'next/server';

import { buyerTicketAbsoluteUrl } from '@/lib/buyer-ticket';
import { submitAdmissionCheckout } from '@/server/finance-checkout-client';
import { sendBuyerTicketEmail, isBuyerTicketSmtpConfigured } from '@/server/buyer-ticket-mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  admissionProductSlug?: string;
  admissionOfferId?: string;
  quantity?: number;
  buyer?: {
    email?: string;
    name?: string | null;
    phone?: string | null;
  };
  returnUrl?: string;
  mode?: 'stub' | 'yookassa' | 'auto';
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const siteUrl = (
    process.env.DAIBILET_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://daibilet.ru'
  ).replace(/\/$/, '');

  // Canon return for YooKassa: finance must append ?order={publicCode} when creating payment.
  // Base without code is intentional - publicCode is assigned on finance at create time.
  const returnUrl = body.returnUrl || `${siteUrl}/checkout/result`;

  const result = await submitAdmissionCheckout({
    admissionProductSlug: String(body.admissionProductSlug || ''),
    admissionOfferId: String(body.admissionOfferId || ''),
    quantity: Number(body.quantity || 1),
    buyer: {
      email: String(body.buyer?.email || ''),
      name: body.buyer?.name ?? null,
      phone: body.buyer?.phone ?? null,
    },
    returnUrl,
    mode: body.mode,
  });

  if (!result.ok) {
    const status =
      result.status && result.status >= 400 && result.status < 600 ? result.status : 502;
    return NextResponse.json(
      {
        error: result.error,
        detail: result.detail || null,
      },
      { status: status === 400 ? 400 : status },
    );
  }

  const ticketUrl = buyerTicketAbsoluteUrl(result.publicCode, siteUrl);
  // Preferred return after pay: catalog ticket/result with publicCode (finance-owned append).
  const catalogReturnWithOrder = `${siteUrl}/checkout/result?order=${encodeURIComponent(result.publicCode)}`;

  let emailSent = false;
  let emailReason: string | null = null;

  // Notify immediately for confirmed stub / already-paid; YooKassa PENDING waits for webhook (finance)
  // but we still try a "pending ticket link" mail so buyer has the code.
  const buyerEmail = result.order.email || String(body.buyer?.email || '');
  if (buyerEmail.includes('@')) {
    const mail = await sendBuyerTicketEmail({
      to: buyerEmail,
      publicCode: result.publicCode,
      title: result.order.title,
      ticketUrl,
      amountRub: result.order.amountRub,
      mode: result.mode,
    });
    emailSent = mail.sent;
    emailReason = mail.reason || null;
  } else {
    emailReason = 'email_missing';
  }

  return NextResponse.json(
    {
      ok: true,
      mode: result.mode,
      publicCode: result.publicCode,
      status: result.status,
      confirmationUrl: result.confirmationUrl,
      order: result.order,
      ticketUrl,
      catalogReturnWithOrder,
      emailSent,
      emailReason,
      emailConfigured: isBuyerTicketSmtpConfigured(),
      // Handoff note for finance: set YooKassa return_url to catalogReturnWithOrder (not supplier SPA).
      returnUrlHint: catalogReturnWithOrder,
    },
    { status: 201 },
  );
}
