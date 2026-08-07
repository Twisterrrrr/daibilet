import { NextResponse } from 'next/server';

import {
  mergeBuyerInternalOrders,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';
import { isOpenDateValidity } from '@/lib/finance-projection';
import { buyerTicketAbsoluteUrl } from '@/lib/buyer-ticket';
import { submitAdmissionCheckout } from '@/server/finance-checkout-client';
import { sendBuyerTicketEmail, isBuyerTicketSmtpConfigured } from '@/server/buyer-ticket-mail';
import { fetchAdmissionProductBySlug } from '@/server/finance-projection-client';
import { fetchPublicApiJson } from '@/server/public-api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  admissionProductSlug?: string;
  admissionOfferId?: string;
  quantity?: number;
  buyer?: {
    email?: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
  returnUrl?: string;
  mode?: 'stub' | 'yookassa' | 'auto';
};

function composeBuyerName(buyer: Body['buyer']): string | null {
  const direct = String(buyer?.name || '').trim();
  if (direct) return direct;
  const first = String(buyer?.firstName || '').trim();
  const last = String(buyer?.lastName || '').trim();
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined || null;
}

async function enrichOrderFromCatalog(
  order: BuyerInternalOrderRecord,
  input: {
    admissionProductSlug: string;
    admissionOfferId: string;
    quantity: number;
    buyerName: string | null;
  },
): Promise<BuyerInternalOrderRecord> {
  const product = await fetchAdmissionProductBySlug(input.admissionProductSlug);
  const offer = product?.offers.find((row) => row.id === input.admissionOfferId) || null;
  const venueSlug = product?.venue?.slug || order.venueSlug || null;

  let venueAddress: string | null = order.venueAddress || null;
  let venueLatitude = order.venueLatitude ?? null;
  let venueLongitude = order.venueLongitude ?? null;
  if (venueSlug && (!venueAddress || venueLatitude == null || venueLongitude == null)) {
    try {
      const venuePayload = await fetchPublicApiJson<{
        venue?: {
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        } | null;
      } | null>(`/api/public/venues/${encodeURIComponent(venueSlug)}`, {
        timeoutMs: 2_500,
      });
      const venue = venuePayload?.venue;
      const address = String(venue?.address || '').trim();
      if (address) venueAddress = address;
      const lat = Number(venue?.latitude);
      const lng = Number(venue?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
        venueLatitude = lat;
        venueLongitude = lng;
      }
    } catch {
      // soft-fail address / coords enrichment
    }
  }

  const openDate = isOpenDateValidity(product?.validityMode) || isOpenDateValidity(order.validityMode);
  const lineItems =
    order.lineItems && order.lineItems.length
      ? order.lineItems
      : offer
        ? [{ ticketTitle: offer.title, quantity: input.quantity }]
        : [];

  const enrichment: BuyerInternalOrderRecord = {
    ...order,
    buyerName: order.buyerName || input.buyerName,
    title: order.title || product?.shortTitle || product?.title || 'Входной билет',
    venueTitle: order.venueTitle || product?.venue?.title || null,
    venueAddress,
    venueSlug,
    venueLatitude,
    venueLongitude,
    admissionProductSlug: order.admissionProductSlug || product?.slug || input.admissionProductSlug,
    validityMode: order.validityMode || product?.validityMode || null,
    validUntil: order.validUntil || product?.validTo || null,
    sessionStartsAt: openDate ? null : order.sessionStartsAt,
    lineItems,
    supplierSupportPhone: order.supplierSupportPhone || product?.supportPhone || null,
    amountRub:
      order.amountRub ??
      (offer ? Math.round(offer.priceRub * Math.max(1, input.quantity)) : null),
  };

  return mergeBuyerInternalOrders(enrichment, order);
}

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
  const buyerName = composeBuyerName(body.buyer);
  const admissionProductSlug = String(body.admissionProductSlug || '');
  const admissionOfferId = String(body.admissionOfferId || '');
  const quantity = Number(body.quantity || 1);

  const result = await submitAdmissionCheckout({
    admissionProductSlug,
    admissionOfferId,
    quantity,
    buyer: {
      email: String(body.buyer?.email || ''),
      name: buyerName,
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

  const order = await enrichOrderFromCatalog(result.order, {
    admissionProductSlug,
    admissionOfferId,
    quantity,
    buyerName,
  });

  const ticketUrl = buyerTicketAbsoluteUrl(result.publicCode, siteUrl);
  // Preferred return after pay: catalog ticket/result with publicCode (finance-owned append).
  const catalogReturnWithOrder = `${siteUrl}/checkout/result?order=${encodeURIComponent(result.publicCode)}`;

  let emailSent = false;
  let emailReason: string | null = null;

  // Notify immediately for confirmed stub / already-paid; YooKassa PENDING waits for webhook (finance)
  // but we still try a "pending ticket link" mail so buyer has the code.
  const buyerEmail = order.email || String(body.buyer?.email || '');
  if (buyerEmail.includes('@')) {
    const mail = await sendBuyerTicketEmail({
      to: buyerEmail,
      publicCode: result.publicCode,
      title: order.title,
      ticketUrl,
      amountRub: order.amountRub,
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
      order,
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
