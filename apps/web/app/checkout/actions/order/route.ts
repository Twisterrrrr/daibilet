import { NextResponse } from 'next/server';

import { mergeBuyerInternalOrders, type BuyerInternalOrderRecord } from '@/lib/buyer-checkout';
import { isOpenDateValidity } from '@/lib/finance-projection';
import { lookupCheckoutOrderByPublicCode } from '@/server/finance-checkout-client';
import { fetchAdmissionProductBySlug } from '@/server/finance-projection-client';
import { fetchPublicApiJson } from '@/server/public-api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function softEnrichTicketOrder(order: BuyerInternalOrderRecord): Promise<BuyerInternalOrderRecord> {
  const slug = order.admissionProductSlug;
  if (!slug) return order;

  const needsProduct =
    !order.validUntil ||
    !order.venueTitle ||
    !order.validityMode ||
    !order.supplierSupportPhone;
  const needsAddress = !order.venueAddress;

  if (!needsProduct && !needsAddress) return order;

  const product = needsProduct ? await fetchAdmissionProductBySlug(slug) : null;
  const venueSlug = order.venueSlug || product?.venue?.slug || null;
  let venueAddress = order.venueAddress || null;
  if (needsAddress && venueSlug) {
    try {
      const venuePayload = await fetchPublicApiJson<{
        venue?: { address?: string | null } | null;
      } | null>(`/api/public/venues/${encodeURIComponent(venueSlug)}`, {
        timeoutMs: 2_500,
      });
      const address = String(venuePayload?.venue?.address || '').trim();
      if (address) venueAddress = address;
    } catch {
      // soft-fail
    }
  }

  const openDate = isOpenDateValidity(product?.validityMode) || isOpenDateValidity(order.validityMode);
  const enrichment: BuyerInternalOrderRecord = {
    ...order,
    venueTitle: order.venueTitle || product?.venue?.title || null,
    venueAddress,
    venueSlug,
    validityMode: order.validityMode || product?.validityMode || null,
    validUntil: order.validUntil || product?.validTo || null,
    sessionStartsAt: openDate ? null : order.sessionStartsAt,
    supplierSupportPhone: order.supplierSupportPhone || product?.supportPhone || null,
  };

  return mergeBuyerInternalOrders(enrichment, order);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicCode = (url.searchParams.get('order') || url.searchParams.get('publicCode') || '').trim();
  if (!publicCode) {
    return NextResponse.json({ error: 'publicCode_required' }, { status: 400 });
  }

  const order = await lookupCheckoutOrderByPublicCode(publicCode);
  if (!order) {
    // Soft empty: UI still shows thank-you from query/local cache.
    return NextResponse.json({
      ok: true,
      found: false,
      publicCode,
      order: null,
    });
  }

  const enriched = await softEnrichTicketOrder(order);

  return NextResponse.json({
    ok: true,
    found: true,
    publicCode: enriched.publicCode,
    order: enriched,
  });
}
