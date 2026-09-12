import { NextResponse } from 'next/server';

import { mergeBuyerInternalOrders, type BuyerInternalOrderRecord } from '@/lib/buyer-checkout';
import { lookupBuyerPurchasesSeedByPublicCode } from '@/lib/buyer-purchases-seed';
import { isOpenDateValidity } from '@/lib/finance-projection';
import { lookupCheckoutOrderByPublicCode } from '@/server/finance-checkout-client';
import { fetchAdmissionProductBySlug } from '@/server/finance-projection-client';
import { fetchPublicApiJson } from '@/server/public-api-client';
import { resolveTicketOpeningHours } from '@/lib/venue-opening-hours';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type VenuePublicBits = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  title?: string | null;
};

function parseVenueCoords(venue: VenuePublicBits | null | undefined): {
  lat: number | null;
  lng: number | null;
} {
  const lat = Number(venue?.latitude);
  const lng = Number(venue?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat: null, lng: null };
  if (lat === 0 && lng === 0) return { lat: null, lng: null };
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return { lat: null, lng: null };
  return { lat, lng };
}

async function fetchVenueBits(venueSlug: string): Promise<VenuePublicBits | null> {
  try {
    const venuePayload = await fetchPublicApiJson<{
      venue?: VenuePublicBits | null;
    } | null>(`/api/public/venues/${encodeURIComponent(venueSlug)}`, {
      timeoutMs: 2_500,
    });
    return venuePayload?.venue || null;
  } catch {
    return null;
  }
}

async function softEnrichTicketOrder(order: BuyerInternalOrderRecord): Promise<BuyerInternalOrderRecord> {
  const needsProduct = Boolean(
    order.admissionProductSlug &&
      (!order.validUntil || !order.venueTitle || !order.validityMode || !order.supplierSupportPhone),
  );
  const needsAddress = !order.venueAddress;
  const needsCoords = order.venueLatitude == null || order.venueLongitude == null;
  const needsHours = !String(order.venueOpeningHours || '').trim();

  if (!needsProduct && !needsAddress && !needsCoords && !needsHours) return order;

  const product = needsProduct && order.admissionProductSlug
    ? await fetchAdmissionProductBySlug(order.admissionProductSlug)
    : null;
  const venueSlug = order.venueSlug || product?.venue?.slug || null;

  let venueAddress = order.venueAddress || null;
  let venueLatitude = order.venueLatitude ?? null;
  let venueLongitude = order.venueLongitude ?? null;
  let venueTitle = order.venueTitle || product?.venue?.title || null;

  if (venueSlug && (needsAddress || needsCoords || !venueTitle)) {
    const venue = await fetchVenueBits(venueSlug);
    const address = String(venue?.address || '').trim();
    if (address) venueAddress = address;
    if (!venueTitle) venueTitle = String(venue?.title || '').trim() || venueTitle;
    const coords = parseVenueCoords(venue);
    if (coords.lat != null && coords.lng != null) {
      venueLatitude = coords.lat;
      venueLongitude = coords.lng;
    }
  }

  const openDate = isOpenDateValidity(product?.validityMode) || isOpenDateValidity(order.validityMode);
  const venueOpeningHours =
    String(order.venueOpeningHours || '').trim() ||
    (openDate || needsHours ? resolveTicketOpeningHours({ venueSlug }) : null);

  const enrichment: BuyerInternalOrderRecord = {
    ...order,
    venueTitle,
    venueAddress,
    venueSlug,
    venueOpeningHours,
    venueLatitude,
    venueLongitude,
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

  const financeOrder = await lookupCheckoutOrderByPublicCode(publicCode);
  const seedOrder = lookupBuyerPurchasesSeedByPublicCode(publicCode);
  const order = financeOrder || seedOrder;
  if (!order) {
    // Soft empty: UI still shows thank-you from query/local cache.
    return NextResponse.json({
      ok: true,
      found: false,
      publicCode,
      order: null,
    });
  }

  const enriched = await softEnrichTicketOrder(
    financeOrder && seedOrder ? mergeBuyerInternalOrders(financeOrder, seedOrder) : order,
  );

  return NextResponse.json({
    ok: true,
    found: true,
    publicCode: enriched.publicCode,
    order: enriched,
  });
}
