import '@/lib/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ publicCode: string }> };

const DEFAULT_FINANCE_API_BASE_URL = 'https://finance-api.daibilet.ru';

export async function GET(_request: Request, context: RouteContext) {
  const { publicCode } = await context.params;
  const code = cleanPublicCode(publicCode);
  if (!code) {
    return NextResponse.json({ error: 'invalid_order_code' }, { status: 400, headers: noStoreHeaders() });
  }

  const target = new URL(`/api/public/checkout/orders/${encodeURIComponent(code)}`, financeApiBaseUrl());
  const headers = new Headers({ accept: 'application/json' });
  const projectionToken = financeProjectionToken();
  if (projectionToken) headers.set('x-daibilet-projection-token', projectionToken);

  try {
    const upstream = await fetch(target, {
      headers,
      cache: 'no-store',
      next: { revalidate: 0 },
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

function financeProjectionToken(): string {
  return String(process.env.DAIBILET_FINANCE_PROJECTION_TOKEN || process.env.FINANCE_PROJECTION_TOKEN || '').trim();
}

function cleanPublicCode(value: string): string {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function noStoreHeaders(): Record<string, string> {
  return {
    'cache-control': 'no-store',
  };
}
