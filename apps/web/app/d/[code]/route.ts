import { NextResponse } from 'next/server';

import { isValidDayRouteShareCode, resolveDayRouteShare } from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ code: string }>;
};

/**
 * Short viral share: GET `/d/{code}` → HTTP 307 `/my-day?city=&items=…`
 * Route Handler (not page redirect) so curl/messengers get a real Location header.
 */
export async function GET(request: Request, { params }: RouteParams) {
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

  return NextResponse.redirect(new URL(longPath, request.url), 307);
}
