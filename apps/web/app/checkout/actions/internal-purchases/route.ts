import { NextResponse } from 'next/server';

import { listBuyerPurchasesSeedForEmail } from '@/lib/buyer-purchases-seed';
import { fetchInternalPurchasesByEmail } from '@/server/finance-checkout-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Soft fan-in of finance CheckoutOrder rows for buyer account.
 * Auth is soft: email query must match logged-in intent on client; no secrets invented.
 * Returns empty rows when finance API has no public list yet (Codex follow-up).
 * Catalog seed (owner QA email) merges in until UX.BUY-6 m2m is live.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }

  const financeRows = await fetchInternalPurchasesByEmail(email);
  const seedRows = listBuyerPurchasesSeedForEmail(email);
  const byCode = new Map(seedRows.map((row) => [row.publicCode, row]));
  for (const row of financeRows) {
    byCode.set(row.publicCode, row);
  }
  const rows = Array.from(byCode.values()).sort((a, b) => {
    const aTime = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
    const bTime = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json({
    ok: true,
    email,
    total: rows.length,
    rows,
    source: financeRows.length ? 'finance-soft+catalog-seed' : seedRows.length ? 'catalog-seed' : 'finance-soft',
  });
}
