import { NextResponse } from 'next/server';

import {
  parseDayRouteReadableSlug,
  resolveDayRouteShare,
} from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * Readable short share: GET `/m/{city}-{code}` (or bare code) → 307 `/my-day?…`
 * Same payload as `/d/{code}`; city prefix is cosmetic for messengers.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: raw } = await params;
  const parsed = parseDayRouteReadableSlug(raw);
  if (!parsed) {
    return new NextResponse('Not found', { status: 404 });
  }

  const longPath = await resolveDayRouteShare(parsed.code);
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
