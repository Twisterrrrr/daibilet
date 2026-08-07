import { NextResponse } from 'next/server';

import { submitAdmissionCheckout } from '@/server/finance-checkout-client';

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

  const result = await submitAdmissionCheckout({
    admissionProductSlug: String(body.admissionProductSlug || ''),
    admissionOfferId: String(body.admissionOfferId || ''),
    quantity: Number(body.quantity || 1),
    buyer: {
      email: String(body.buyer?.email || ''),
      name: body.buyer?.name ?? null,
      phone: body.buyer?.phone ?? null,
    },
    returnUrl: body.returnUrl || `${siteUrl}/checkout/result`,
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

  return NextResponse.json(
    {
      ok: true,
      mode: result.mode,
      publicCode: result.publicCode,
      status: result.status,
      confirmationUrl: result.confirmationUrl,
      order: result.order,
    },
    { status: 201 },
  );
}
