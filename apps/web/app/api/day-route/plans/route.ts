import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { resolveDayRouteSiteUserId } from '@/server/day-route-user-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PlanStopInput = {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  eventId?: unknown;
  eventSlug?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  address?: unknown;
  note?: unknown;
  dwellMinutes?: unknown;
  startsAt?: unknown;
  sessionLabel?: unknown;
  ticketBought?: unknown;
  isSuburb?: unknown;
};

function text(value: unknown, max: number): string | null {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, max) : null;
}

function numberOrNull(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function normalizeStops(raw: unknown) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 35) return null;
  const out = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') return null;
    const stop = value as PlanStopInput;
    const id = text(stop.id, 220);
    const title = text(stop.title, 180);
    if (!id || !title) return null;
    const eventId = text(stop.eventId, 220);
    const eventSlug = text(stop.eventSlug, 180);
    const isNote = id.startsWith('note_');
    const isCustom = id.startsWith('text_') || (!eventId && !eventSlug && !text(stop.slug, 180));
    const sourceType = isNote ? 'NOTE' : isCustom ? 'CUSTOM' : eventId || eventSlug ? 'EVENT' : 'PLACE';
    const sourceId = sourceType === 'CUSTOM' || sourceType === 'NOTE'
      ? null
      : eventId || eventSlug || text(stop.slug, 180) || id;
    const startsAtRaw = text(stop.startsAt, 80);
    const startsAt = startsAtRaw && !Number.isNaN(new Date(startsAtRaw).getTime()) ? new Date(startsAtRaw) : null;
    out.push({
      position: out.length,
      sourceType,
      sourceId,
      title: sourceType === 'CUSTOM' || sourceType === 'NOTE' ? title : null,
      latitude: numberOrNull(stop.latitude, -90, 90),
      longitude: numberOrNull(stop.longitude, -180, 180),
      address: text(stop.address, 240),
      note: text(stop.note, 1000),
      visitMinutes: numberOrNull(stop.dwellMinutes, 5, 480),
      startsAt,
      sessionLabel: text(stop.sessionLabel, 100),
      ticketBought: stop.ticketBought === true,
      isSuburb: stop.isSuburb === true,
    });
  }
  return out;
}

export async function POST(request: Request) {
  const siteUserId = await resolveDayRouteSiteUserId(request);
  if (!siteUserId) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const stops = normalizeStops(body.stops);
  if (!stops) return NextResponse.json({ ok: false, error: 'invalid_stops' }, { status: 400 });

  const travelMode = body.travelMode === 'auto' ? 'auto' : 'walk';
  const hourStart = text(body.hourStart, 5) || '10:00';
  const hourEnd = text(body.hourEnd, 5) || '22:00';
  const sourceRouteSlug = text(body.sourceRouteSlug, 100);
  const sourceRoute = sourceRouteSlug
    ? await prisma.myDayEditorialRoute.findUnique({ where: { slug: sourceRouteSlug }, select: { id: true } })
    : null;
  const existingCode = text(body.code, 40);

  try {
    const planData = {
      sourceRouteId: sourceRoute?.id || null,
      sourceRouteSlug,
      citySlug: text(body.citySlug, 100),
      title: text(body.title, 100),
      travelMode,
      hourStart: /^\d{2}:\d{2}$/.test(hourStart) ? hourStart : '10:00',
      hourEnd: /^\d{2}:\d{2}$/.test(hourEnd) ? hourEnd : '22:00',
      hourPlanOn: body.hourPlanOn === true,
    };
    const plan = existingCode && /^[A-Za-z0-9_-]{20,40}$/.test(existingCode)
      ? await prisma.$transaction(async (tx) => {
          const owned = await tx.myDayPlan.findFirst({ where: { publicCode: existingCode, siteUserId }, select: { id: true } });
          if (!owned) throw new Error('plan_not_found');
          return tx.myDayPlan.update({
            where: { id: owned.id },
            data: { ...planData, stops: { deleteMany: {}, create: stops } },
            select: { publicCode: true, title: true, updatedAt: true },
          });
        })
      : await prisma.myDayPlan.create({
          data: {
            publicCode: randomBytes(18).toString('base64url'),
            siteUserId,
            ...planData,
            stops: { create: stops },
          },
          select: { publicCode: true, title: true, updatedAt: true },
        });
    return NextResponse.json(
      { ok: true, plan: { code: plan.publicCode, title: plan.title, updatedAt: plan.updatedAt.toISOString() } },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: existingCode ? 'plan_not_found' : 'save_failed' }, { status: existingCode ? 404 : 500 });
  }
}
