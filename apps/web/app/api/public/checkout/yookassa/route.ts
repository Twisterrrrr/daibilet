import '@/lib/env';
import { NextResponse } from 'next/server';

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
    return new NextResponse(text || '{}', {
      status: upstream.status,
      headers: {
        ...noStoreHeaders(),
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      },
    });
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
