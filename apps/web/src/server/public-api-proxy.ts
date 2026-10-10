import { NextResponse } from 'next/server';

import { buildPublicApiUrl } from '@/server/public-api-client';

const DEFAULT_PROXY_TIMEOUT_MS = Number(process.env.DAIBILET_PUBLIC_API_PROXY_TIMEOUT_MS || 5_000);

export async function proxyPublicApiRequest(
  request: Request,
  apiPath: string,
  options: { timeoutMs?: number; searchParams?: URLSearchParams } = {},
) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = buildPublicApiUrl(apiPath, options.searchParams ?? requestUrl.searchParams);
  const timeoutMs = Math.max(250, options.timeoutMs ?? DEFAULT_PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: request.headers.get('accept') || 'application/json',
        'User-Agent': 'daibilet-web-public-api-proxy',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await upstream.text();
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) headers.set('Cache-Control', cacheControl);
    return new NextResponse(body, { status: upstream.status, headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'public_api_unavailable',
        message: error instanceof Error ? error.message : 'Public API request failed',
      },
      { status: 504 },
    );
  }
}
