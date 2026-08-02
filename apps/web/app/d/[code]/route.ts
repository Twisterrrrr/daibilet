import { NextResponse } from 'next/server';

import { isValidDayRouteShareCode, resolveDayRouteShare } from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ code: string }>;
};

/**
 * Short viral share: GET `/d/{code}` → HTTP 307 `/my-day?city=&items=…`
 * Relative Location so nginx/proxy Host quirks do not rewrite to localhost.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { code: raw } = await params;
  const code = String(raw || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(code)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const longPath = await resolveDayRouteShare(code);
  if (!longPath) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: longPath,
      'Cache-Control': 'private, no-store',
    },
  });
}
