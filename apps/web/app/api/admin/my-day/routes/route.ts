import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { isAuthorizedAdminBasicAuth, readAdminBasicAuthConfig } from '@/lib/admin-basic-auth';

export const dynamic = 'force-dynamic';

type StopInput = { sourceType?: unknown; sourceId?: unknown; visitMinutes?: unknown; period?: unknown; startsAt?: unknown; note?: unknown };
const allowedSources = new Set(['PLACE', 'VENUE', 'EVENT']);
const allowedPeriods = new Set(['MORNING', 'DAY', 'EVENING']);

function clean(value: unknown, max: number): string | null {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, max) : null;
}

function normalizeStops(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 35) return null;
  const stops = [];
  for (const [position, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') return null;
    const stop = raw as StopInput;
    const sourceType = clean(stop.sourceType, 12)?.toUpperCase() || '';
    const sourceId = clean(stop.sourceId, 220);
    const visitMinutes = Number(stop.visitMinutes);
    const period = clean(stop.period, 16)?.toUpperCase() || null;
    const startsAtRaw = clean(stop.startsAt, 80);
    const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
    if (!allowedSources.has(sourceType) || !sourceId) return null;
    if (stop.visitMinutes != null && (!Number.isInteger(visitMinutes) || visitMinutes < 5 || visitMinutes > 480)) return null;
    if (period && !allowedPeriods.has(period)) return null;
    if (startsAt && Number.isNaN(startsAt.getTime())) return null;
    stops.push({ position, sourceType, sourceId, visitMinutes: Number.isInteger(visitMinutes) ? visitMinutes : null, period, startsAt, note: clean(stop.note, 1000) });
  }
  return stops;
}

async function authorized(request: Request) {
  return isAuthorizedAdminBasicAuth(request.headers.get('authorization'), readAdminBasicAuthConfig(process.env));
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const routes = await prisma.myDayEditorialRoute.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    include: { stops: { orderBy: { position: 'asc' } } },
    take: 200,
  });
  return NextResponse.json({ ok: true, routes }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  const slug = clean(body.slug, 100)?.toLowerCase() || '';
  const citySlug = clean(body.citySlug, 100)?.toLowerCase() || '';
  const title = clean(body.title, 180);
  const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : body.status === 'DRAFT' ? 'DRAFT' : '';
  const stops = normalizeStops(body.stops);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !citySlug || !title || !status || !stops) {
    return NextResponse.json({ ok: false, error: 'invalid_route' }, { status: 400 });
  }
  const publishedAt = status === 'PUBLISHED' ? new Date() : null;
  try {
    const route = await prisma.$transaction(async (tx) => tx.myDayEditorialRoute.upsert({
      where: { slug },
      create: { slug, citySlug, title, description: clean(body.description, 4000), imageUrl: clean(body.imageUrl, 500), status, publishedAt, stops: { create: stops } },
      update: { citySlug, title, description: clean(body.description, 4000), imageUrl: clean(body.imageUrl, 500), status, publishedAt, stops: { deleteMany: {}, create: stops } },
      include: { stops: { orderBy: { position: 'asc' } } },
    }));
    return NextResponse.json({ ok: true, route }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 });
  }
}
