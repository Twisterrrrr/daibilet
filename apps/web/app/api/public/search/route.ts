import { NextResponse } from 'next/server';

import { mergeHeaderSearchItems, type HeaderSearchItem } from '@/lib/header-search-results';
import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

function asSearchItems(value: unknown): HeaderSearchItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HeaderSearchItem => Boolean(item && typeof item === 'object'));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = String(url.searchParams.get('q') || '').trim();
  const generatedAt = new Date().toISOString();

  const upstream = await proxyPublicApiRequest(request, '/api/public/search', { timeoutMs: 2_000 });
  let apiItems: HeaderSearchItem[] = [];
  if (upstream.ok) {
    try {
      const payload = (await upstream.json()) as { items?: unknown };
      apiItems = asSearchItems(payload?.items);
    } catch {
      apiItems = [];
    }
  }

  const items = mergeHeaderSearchItems(q, apiItems);
  if (!upstream.ok && items.length === 0) return upstream;

  return NextResponse.json({
    generatedAt,
    query: q.toLowerCase(),
    items,
  });
}
