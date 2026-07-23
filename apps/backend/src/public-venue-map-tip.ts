import { prisma } from '@daibilet/db';

export type VenueMapTip = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  events: number;
  href: string;
  type: string;
};

/** Lightweight tip for map marker click - no full venue page hydrate. */
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
