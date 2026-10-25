import '@/lib/env';
import { NextResponse } from 'next/server';
import {
  CHECKOUT_ORDER_ACCESS_COOKIE,
  CHECKOUT_ORDER_ACCESS_MAX_AGE_SECONDS,
  CHECKOUT_ORDER_POLL_ACCESS_COOKIE,
  extractCheckoutOrderAccessProof,
  serializeCheckoutOrderAccessProof,
  stripCheckoutOrderAccessToken,
} from '@/server/checkout-order-access';

export const dynamic = 'force-dynamic';

const DEFAULT_FINANCE_API_BASE_URL = 'https://finance-api.daibilet.ru';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: noStoreHeaders() });
  }

  const target = new URL('/api/checkout/yookassa', financeApiBaseUrl());
  const idempotencyKey = cleanHeader(request.headers.get('idempotency-key'));
  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/json',
  });
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
    const text = await upstream.text();
    let upstreamPayload: unknown;
    try { upstreamPayload = JSON.parse(text); } catch { upstreamPayload = null; }
    if (!upstreamPayload || typeof upstreamPayload !== 'object' || Array.isArray(upstreamPayload)) {
      return new NextResponse(text || '{}', {
        status: upstream.status,
        headers: {
          ...noStoreHeaders(),
          'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        },
      });
    }

    const proof = upstream.ok ? extractCheckoutOrderAccessProof(upstreamPayload) : null;
    const response = NextResponse.json(stripCheckoutOrderAccessToken(upstreamPayload), {
      status: upstream.status,
      headers: noStoreHeaders(),
    });
    if (proof) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: CHECKOUT_ORDER_ACCESS_MAX_AGE_SECONDS,
      };
      response.cookies.set(CHECKOUT_ORDER_ACCESS_COOKIE, serializeCheckoutOrderAccessProof(proof), {
        ...cookieOptions,
        path: '/checkout',
      });
      response.cookies.set(CHECKOUT_ORDER_POLL_ACCESS_COOKIE, serializeCheckoutOrderAccessProof(proof), {
        ...cookieOptions,
        path: '/api/public/checkout/orders',
      });
    }
    return response;
  } catch {
    return NextResponse.json(
      { error: 'finance_api_unavailable' },
      { status: 502, headers: noStoreHeaders() },
    );
  }
}

function financeApiBaseUrl(): string {
  return (
    process.env.FINANCE_API_BASE_URL ||
    process.env.DAIBILET_FINANCE_API_BASE_URL ||
    DEFAULT_FINANCE_API_BASE_URL
  ).replace(/\/+$/, '');
}

function cleanHeader(value: string | null): string {
  return String(value || '').trim().slice(0, 120);
}

function noStoreHeaders(): Record<string, string> {
  return {
    'cache-control': 'no-store',
  };
}
