import { NextResponse } from 'next/server';

import { incrementDayRouteShareSave, isValidDayRouteShareCode } from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ code: string }>;
};

/**
 * POST /api/day-route/share/[code]/save
 * Bumps saveCount when guest clicks «Сохранить к себе».
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { code: raw } = await params;
  const code = String(raw || '')
    .trim()
    .toLowerCase();
  if (!isValidDayRouteShareCode(code)) {
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 400 });
  }

  const saveCount = await incrementDayRouteShareSave(code);
  if (saveCount == null) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(
    { ok: true, saveCount },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
