import '@/lib/env';
import { NextResponse } from 'next/server';
import {
  encodeOrderAccessProof,
  extractOrderAccessProof,
  ORDER_ACCESS_COOKIE_MAX_AGE_SECONDS,
  ORDER_ACCESS_COOKIE_NAME,
  ORDER_ACCESS_COOKIE_PATH,
} from '@/lib/order-access-cookie';

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
    const responsePayload: unknown = await upstream.json().catch(() => null);
    if (!responsePayload) {
      return NextResponse.json(
        { error: upstream.ok ? 'invalid_finance_response' : 'finance_api_error' },
        { status: upstream.ok ? 502 : upstream.status, headers: noStoreHeaders() },
      );
    }

    const { payload: safePayload, proof } = extractOrderAccessProof(responsePayload);
    if (upstream.ok && !proof) {
      return NextResponse.json(
        { error: 'finance_order_access_proof_missing' },
        { status: 502, headers: noStoreHeaders() },
      );
    }

    const response = NextResponse.json(safePayload, {
      status: upstream.status,
      headers: noStoreHeaders(),
    });
    if (upstream.ok && proof) {
      response.cookies.set(ORDER_ACCESS_COOKIE_NAME, encodeOrderAccessProof(proof), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: ORDER_ACCESS_COOKIE_PATH,
        maxAge: ORDER_ACCESS_COOKIE_MAX_AGE_SECONDS,
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
