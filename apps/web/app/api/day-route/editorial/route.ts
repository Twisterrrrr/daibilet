import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { eventHref, venueHref } from '@/lib/routes';

export const dynamic = 'force-dynamic';

type EditorialStop = {
  name: string;
  desc?: string;
  address?: string | null;
  href?: string;
  venueSlug?: string;
  locationSlug?: string;
  dayRouteId?: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  visitMinutes?: number | string;
};

function stopLocator(stop: EditorialStop): string | null {
  const direct = String(stop.venueSlug || stop.locationSlug || stop.dayRouteId || '').trim();
  if (direct) return direct;
  const match = String(stop.href || '').match(/^\/(?:venues|locations)\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function durationMinutes(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  const raw = String(value || '').trim().toLowerCase();
  const hours = raw.match(/(\d+)\s*(?:ч|час)/);
  const minutes = raw.match(/(\d+)\s*мин/);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return total > 0 ? total : null;
}

/** Resolve an existing published city-hub preset by its stable editorial ID. */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim().toLowerCase() || '';
  if (!slug || slug.length > 100) {
    return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 400 });
  }

  const savedRoute = await prisma.myDayEditorialRoute.findFirst({
    where: { slug, status: 'PUBLISHED', publishedAt: { not: null } },
    include: { stops: { orderBy: { position: 'asc' } } },
  });
  if (savedRoute) {
    const venueIds = savedRoute.stops
      .filter((stop) => stop.sourceType === 'PLACE' || stop.sourceType === 'VENUE')
      .map((stop) => stop.sourceId);
    const eventIds = savedRoute.stops.filter((stop) => stop.sourceType === 'EVENT').map((stop) => stop.sourceId);
    const [venues, events] = await Promise.all([
      venueIds.length
        ? prisma.venue.findMany({
            where: { OR: [{ id: { in: venueIds } }, { slug: { in: venueIds } }] },
            select: { id: true, slug: true, title: true, address: true, latitude: true, longitude: true, heroImageUrl: true, kind: true },
          })
        : Promise.resolve([]),
      eventIds.length
        ? prisma.event.findMany({
            where: { OR: [{ id: { in: eventIds } }, { slug: { in: eventIds } }] },
            select: {
              id: true,
              slug: true,
              title: true,
              imageUrl: true,
              venue: { select: { id: true, slug: true, title: true, address: true, latitude: true, longitude: true, kind: true } },
            },
          })
        : Promise.resolve([]),
    ]);
    const venueByLocator = new Map(venues.flatMap((venue) => [[venue.id, venue] as const, [venue.slug, venue] as const]));
    const eventByLocator = new Map(events.flatMap((event) => [[event.id, event] as const, [event.slug, event] as const]));
    const stops = savedRoute.stops.map((stop) => {
      if (stop.sourceType === 'EVENT') {
        const event = eventByLocator.get(stop.sourceId);
        const venue = event?.venue;
        const locator = event?.slug || event?.id || stop.sourceId;
        return {
          locator,
          eventId: event?.id || stop.sourceId,
          eventSlug: event?.slug || null,
          name: event?.title || stop.sourceId,
          desc: stop.note,
          address: venue?.address || null,
          href: event ? eventHref({ id: event.id, slug: event.slug, title: event.title }) : null,
          imageUrl: event?.imageUrl || null,
          latitude: venue?.latitude ?? null,
          longitude: venue?.longitude ?? null,
          visitMinutes: stop.visitMinutes,
          startsAt: stop.startsAt?.toISOString() || null,
        };
      }
      const venue = venueByLocator.get(stop.sourceId);
      const locator = venue?.slug || venue?.id || stop.sourceId;
      return {
        locator,
        name: venue?.title || stop.sourceId,
        desc: stop.note,
        address: venue?.address || null,
        href: venue ? venueHref({ id: venue.id, slug: venue.slug, name: venue.title, type: venue.kind }) : null,
        imageUrl: venue?.heroImageUrl || null,
        latitude: venue?.latitude ?? null,
        longitude: venue?.longitude ?? null,
        visitMinutes: stop.visitMinutes,
        startsAt: stop.startsAt?.toISOString() || null,
      };
    });
    return NextResponse.json(
      { ok: true, route: { slug: savedRoute.slug, title: savedRoute.title, description: savedRoute.description, citySlug: savedRoute.citySlug, stops } },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
    );
  }

  const { CITY_INFO } = await import('@/lib/cityInfo');
  const matches: Array<{ citySlug: string; preset: NonNullable<(typeof CITY_INFO)[string]['dayRoutePresets']>[number] }> = [];
  for (const [citySlug, city] of Object.entries(CITY_INFO)) {
    for (const preset of city.dayRoutePresets || []) {
      if (String(preset.id || '').trim().toLowerCase() === slug) matches.push({ citySlug, preset });
    }
  }

  if (matches.length !== 1) {
    return NextResponse.json(
      { ok: false, error: matches.length ? 'ambiguous_route' : 'route_not_found' },
      { status: matches.length ? 409 : 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { citySlug, preset } = matches[0]!;
  const stops = (preset.stops as EditorialStop[])
    .map((stop) => {
      const locator = stopLocator(stop);
      return locator
        ? {
            locator,
            name: String(stop.name || '').trim(),
            desc: String(stop.desc || '').trim() || null,
            address: String(stop.address || '').trim() || null,
            href: String(stop.href || '').trim() || null,
            imageUrl: String(stop.imageUrl || '').trim() || null,
            latitude: stop.latitude ?? null,
            longitude: stop.longitude ?? null,
            visitMinutes: durationMinutes(stop.visitMinutes),
          }
        : null;
    })
    .filter((stop): stop is NonNullable<typeof stop> => Boolean(stop));

  if (!stops.length) {
    return NextResponse.json({ ok: false, error: 'route_has_no_resolvable_stops' }, { status: 422 });
  }

  return NextResponse.json(
    {
      ok: true,
      route: {
        slug: preset.id,
        title: preset.title,
        description: preset.description || null,
        citySlug,
        stops,
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  );
}
