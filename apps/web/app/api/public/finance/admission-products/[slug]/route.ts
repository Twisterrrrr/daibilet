import '@/lib/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

const DEFAULT_FINANCE_API_BASE_URL = 'https://finance-api.daibilet.ru';

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const productSlug = cleanSlug(slug);
  if (!productSlug) {
    return NextResponse.json({ error: 'invalid_admission_product_slug' }, { status: 400, headers: noStoreHeaders() });
  }

  const target = new URL(`/api/public/finance/admission-products/${encodeURIComponent(productSlug)}`, financeApiBaseUrl());
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

function cleanSlug(value: string): string {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
}

function noStoreHeaders(): Record<string, string> {
  return {
    'cache-control': 'no-store',
  };
}
