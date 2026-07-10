import { NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicLandingPageDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const payload = await buildPublicLandingPageDto(decodeURIComponent(slug));
  if (!payload?.landing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(payload);
}
