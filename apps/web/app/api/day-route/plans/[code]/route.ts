import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { resolveDayRouteSiteUserId } from '@/server/day-route-user-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: Request, context: RouteContext) {
  const siteUserId = await resolveDayRouteSiteUserId(request);
  if (!siteUserId) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { code } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(code)) {
    return NextResponse.json({ ok: false, error: 'plan_not_found' }, { status: 404 });
  }

  const plan = await prisma.myDayPlan.findFirst({
    where: { publicCode: code, siteUserId },
    include: { stops: { orderBy: { position: 'asc' } } },
  });
  if (!plan) return NextResponse.json({ ok: false, error: 'plan_not_found' }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      plan: {
        code: plan.publicCode,
        title: plan.title,
        citySlug: plan.citySlug,
        sourceRouteSlug: plan.sourceRouteSlug,
        travelMode: plan.travelMode,
        hourStart: plan.hourStart,
        hourEnd: plan.hourEnd,
        hourPlanOn: plan.hourPlanOn,
        stops: plan.stops.map((stop) => ({
          sourceType: stop.sourceType,
          sourceId: stop.sourceId,
          title: stop.title,
          latitude: stop.latitude,
          longitude: stop.longitude,
          address: stop.address,
          note: stop.note,
          dwellMinutes: stop.visitMinutes,
          startsAt: stop.startsAt?.toISOString() || null,
          sessionLabel: stop.sessionLabel,
          ticketBought: stop.ticketBought,
          isSuburb: stop.isSuburb,
        })),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
