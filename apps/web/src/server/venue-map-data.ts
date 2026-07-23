import { prisma } from '@daibilet/db';

import type { VenueMapMarker, VenueMapTip } from '@/lib/venue-map-types';

export type { VenueMapMarker, VenueMapTip };

/** Flat primitives for client map hydration - never pass full venue DTOs. */
export function toVenueMapMarkers(
  venues: Array<{ id?: string | null; latitude?: number | null; longitude?: number | null }>,
): VenueMapMarker[] {
  const out: VenueMapMarker[] = [];
  for (const venue of venues) {
    const id = String(venue.id || '').trim();
    const lat = Number(venue.latitude);
    const lng = Number(venue.longitude);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    out.push({ id, lat, lng });
  }
  return out;
}

export async function loadVenueMapTip(idOrSlug: string): Promise<VenueMapTip | null> {
  const key = String(idOrSlug || '').trim();
  if (!key) return null;

  const row = await prisma.venue.findFirst({
    where: {
      pageStatus: { not: 'HIDDEN' },
      OR: [{ id: key }, { slug: key }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      address: true,
      kind: true,
      city: { select: { title: true } },
      _count: {
        select: {
          events: { where: { status: { notIn: ['HIDDEN', 'DRAFT'] } } },
        },
      },
    },
  });
  if (!row) return null;

  const kind = String(row.kind || '').toUpperCase();
  const isLocation =
    kind.includes('PIER') ||
    kind.includes('OUTDOOR') ||
    kind === 'BUS' ||
    kind === 'ATTRACTION' ||
    kind === 'SPORT_ACTIVITY_SPACE';
  const base = isLocation ? '/locations' : '/venues';

  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    city: row.city?.title || 'Не указан',
    address: row.address,
    events: row._count.events,
    href: `${base}/${row.slug}`,
    type: String(row.kind || 'OTHER').toLowerCase(),
  };
}
