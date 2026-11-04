import { NextResponse } from 'next/server';

import { PUBLIC_CACHE_CONTROL } from '@/server/cache-config';

export function publicJsonResponse(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', PUBLIC_CACHE_CONTROL);
  return NextResponse.json(data, { ...init, headers });
}
