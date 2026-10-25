import { NextResponse } from 'next/server';

import {
  createDayRouteShare,
  normalizeDayRouteSharePayload,
} from '@/server/day-route-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ShareBody = {
  city?: string;
  citySlug?: string;
  items?: string;
  from?: string;
  fromName?: string;
  title?: string;
  author?: string;
  authorName?: string;
  status?: string;
};

/**
 * POST /api/day-route/share
 * Body: { city?, items, from?, title?, author? } → { ok, code, path, longPath }
 * Short links: `/d/{code}` or readable `/m/{city}-{titleSlug}-{code}`.
 */
export async function POST(request: Request) {
  let body: ShareBody = {};
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const payload = normalizeDayRouteSharePayload(body);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const created = await createDayRouteShare(payload);
    return NextResponse.json(
      {
        ok: true,
        code: created.code,
        path: created.path,
        longPath: created.longPath,
        reused: created.reused,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'create_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 },
    );
  }
}
