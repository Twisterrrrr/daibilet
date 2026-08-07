import { NextResponse } from 'next/server';

import { fetchInternalPurchasesByEmail } from '@/server/finance-checkout-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Soft fan-in of finance CheckoutOrder rows for buyer account.
 * Auth is soft: email query must match logged-in intent on client; no secrets invented.
 * Returns empty rows when finance API has no public list yet (Codex follow-up).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }

  const rows = await fetchInternalPurchasesByEmail(email);
  return NextResponse.json({
    ok: true,
    email,
    total: rows.length,
    rows,
    source: 'finance-soft',
  });
}
