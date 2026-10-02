import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * Records purchase funnel events from the browser.
 *
 * Fire-and-forget by design: analytics must never block or fail a purchase, so
 * a bad payload returns 400 and a database error returns 202 with the event
 * dropped rather than surfacing an error to someone trying to buy a ticket.
 */

export const dynamic = 'force-dynamic';

const KINDS = new Set(['event_view', 'widget_open', 'widget_session', 'order_created']);
const PROVIDERS = new Set(['tc', 'tep']);

type Body = {
  kind?: unknown;
  ref?: unknown;
  provider?: unknown;
  visitorId?: unknown;
  occurredAt?: unknown;
};

function asString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, max);
  return text ? text : null;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const kind = asString(body.kind, 32);
  if (!kind || !KINDS.has(kind)) {
    return NextResponse.json({ error: 'unknown_kind' }, { status: 400 });
  }

  const provider = asString(body.provider, 8);
  if (provider && !PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'unknown_provider' }, { status: 400 });
  }

  // Trust the client clock only within a sane window: a day either way absorbs
  // device clock skew without letting anyone write events dated years away.
  let occurredAt = new Date();
  const raw = asString(body.occurredAt, 40);
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const delta = Math.abs(parsed.getTime() - Date.now());
      if (delta <= 24 * 60 * 60 * 1000) occurredAt = parsed;
    }
  }

  try {
    await prisma.funnelEvent.create({
      data: {
        kind,
        ref: asString(body.ref, 300),
        provider: provider && PROVIDERS.has(provider) ? provider : null,
        visitorId: asString(body.visitorId, 64),
        occurredAt,
      },
    });
  } catch {
    // Never surface a tracking failure to the buyer.
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}