import { NextResponse } from 'next/server';

import { isValidDayRouteShareCode, rateDayRouteShare } from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ code: string }>;
};

type RateBody = {
  rating?: number;
};

/**
 * POST /api/day-route/share/[code]/rate
 * Body: { rating: 1..5 }. No auth MVP - cookie soft-blocks repeat from same browser.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { code: raw } = await params;
  const code = String(raw || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(code)) {
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 400 });
  }

  const cookieName = `dr_rated_${code}`;
  const already = request.headers.get('cookie')?.includes(`${cookieName}=`);
  if (already) {
    return NextResponse.json({ ok: false, error: 'already_rated' }, { status: 429 });
  }

  let body: RateBody = {};
  try {
    body = (await request.json()) as RateBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const result = await rateDayRouteShare(code, Number(body.rating));
  if (!result) {
    return NextResponse.json({ ok: false, error: 'invalid_rating' }, { status: 400 });
  }

  const response = NextResponse.json(
    {
      ok: true,
      ratingSum: result.ratingSum,
      ratingCount: result.ratingCount,
      averageRating: result.averageRating,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(cookieName, '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
