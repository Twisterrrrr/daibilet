import { NextResponse } from 'next/server';

import { lookupCheckoutOrderByPublicCode } from '@/server/finance-checkout-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  return NextResponse.json({
    ok: true,
    found: true,
    publicCode: order.publicCode,
    order,
  });
}
